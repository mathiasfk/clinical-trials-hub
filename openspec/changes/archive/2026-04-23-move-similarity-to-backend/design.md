## Context

The `Suggest criteria based on similar studies` skill of the assistant currently runs the ranking logic in the browser. `frontend/src/assistant/similarity.ts` exports `similarityScore`, `rankStudies`, `collectSuggestions`, and the reducer in `frontend/src/assistant/state.ts` calls `rankStudies(context.currentStudy, context.otherStudies)` followed by `collectSuggestions(...)`. To make this possible the chat dock (via `useOtherStudies`) lazily fetches the entire `/api/studies` list when the drawer opens.

The rest of the platform already follows a clean hexagonal split (`ClinicalTrialsHub.Api` → `.Application` → `.Domain` / `.Infrastructure`, with FluentValidation and a repository abstraction). All other business logic — study creation, eligibility update, dimension registry — lives behind application services that the minimal API group wires up. Keeping a scoring rule that depends on the full corpus of studies in the client is the only remaining inversion.

We want to keep the MVP heuristic intact (it is the single source of truth described in `openspec/specs/study-assistant/spec.md`) while relocating it. This is a precondition for later swapping the heuristic for a more capable model (embeddings, vector DB, LLM re-ranker) without touching the frontend again.

## Goals / Non-Goals

**Goals:**
- Move the exact deterministic scoring rules (`+3` therapeuticArea, `+2` phase, `+1` studyType, `+1` per shared `dimensionId`, tie-break by ascending `studyId`) to the backend.
- Expose one read-only HTTP endpoint that returns up to `N` concrete criterion suggestions for a given study, already filtered against the draft the client holds.
- Preserve every user-visible behaviour and every scenario of the `Suggest criteria based on similar studies` requirement after the migration.
- Make the backend contract stable enough that a future ML / vector-DB implementation can replace the current scorer without changing the endpoint shape.
- Keep the assistant's copy-from-study flow untouched; only the suggestion flow migrates.

**Non-Goals:**
- Introduce new scoring signals, learned ranking, or persistence for similarity scores.
- Cache or precompute rankings (the corpus is small; on-demand compute is fine).
- Touch the workspace `GET /api/studies` endpoint or the `Copy criteria from another study` flow.
- Add authentication / authorization changes; the endpoint inherits whatever the rest of the API uses.
- Ship a vector DB, embeddings pipeline, or ML runtime — those are unlocked by this change but out of scope.

## Decisions

### 1. Endpoint shape: `GET /api/studies/{id}/similar-suggestions`

Chosen over:
- `POST /api/similarity/suggestions` with a client-supplied draft body — rejected because it would leak the client-side duplicate-filtering concern into the public contract and make future ML swaps harder (a server that wants to pre-compute embeddings needs to key by study id, not by an anonymous draft).
- `GET /api/studies/{id}/similar` that only returns ranked studies — rejected because the chat drawer ultimately needs criterion-level suggestions; returning studies only would push the collection logic back into the client.

Selected shape:

```
GET /api/studies/{id}/similar-suggestions?limit=3&excludeInDraft=true
```

Query parameters:
- `limit` (int, default 3, max 10): maximum number of suggestion items in the response.
- `excludeInDraft` (bool, default true): reserved for future use; the current implementation always excludes criteria structurally equal to those already on the target study.

Response body:

```json
{
  "data": [
    {
      "sourceStudyId": "study-0007",
      "group": "inclusion",
      "criterionIndex": 2,
      "criterion": {
        "description": "…",
        "deterministicRule": { "dimensionId": "age-years", "operator": ">=", "value": 18, "unit": "years" }
      }
    }
  ]
}
```

Notes on the response:
- Fields mirror the frontend's `SuggestedCriterion` type, so the client can consume the payload verbatim.
- The server uses the **persisted** target study as the draft baseline for duplicate filtering. The assistant already augments the local context after each accept, and the endpoint is re-called for `Suggest three more`, so the next call will see the most recent persisted state. Unsaved local edits will still be filtered on the client against the latest fetched list — see Risk below.
- Response is deterministic for the same target study and corpus (required by the existing spec scenario "Similarity ordering is deterministic").

### 2. Duplicate filtering strategy

Chosen: **filter on the server against the target study's persisted criteria**, and let the client keep its own structural-equality guard for criteria the user just accepted but has not yet saved.

Alternatives considered:
- POST with the full in-memory draft — simpler filtering but broken caching semantics and larger payloads; also inconsistent with the rest of the read-only API surface.
- Server-only filtering without a client-side guard — would resurface a duplicate suggestion after accepting it but before saving.

The client's existing `isSameCriterion` / `hasCriterionInDraft` helpers stay in `frontend/src/assistant/similarity.ts` (renamed to something like `draftDuplicates.ts`) and continue to be applied to the API response before rendering the menu.

### 3. Backend placement (hexagonal layers)

- `ClinicalTrialsHub.Domain`: add a pure `StudySimilarity` static class (or similar) that implements `Score(Study current, Study other)` and exposes the deterministic scoring rules. Depends only on existing domain types.
- `ClinicalTrialsHub.Application/Services/SimilaritySuggestionService.cs`: new application service that takes an `IStudyRepository`, resolves the target study, ranks the remaining studies, and collects up to `limit` criteria following the same walk order as the current frontend (`inclusion[i]` then `exclusion[i]`, advancing `i`).
- `ClinicalTrialsHub.Application/Dtos/ApiDtos.cs`: add `SuggestedCriterionDto`, `SimilarSuggestionsResponseDto`.
- `ClinicalTrialsHub.Api/Endpoints/StudiesEndpoints.cs`: add the `GET /{id}/similar-suggestions` mapping. Use the existing `NotFoundException` → 404 pipeline for unknown ids and rely on the global `ExceptionHandling` middleware for error shaping.
- `ClinicalTrialsHub.Application/DependencyInjection.cs`: register the new service as scoped.

Chosen over adding an `ISimilarityScorer` abstraction up-front: we deliberately keep one concrete implementation and introduce the interface only when a second implementation actually lands. The service constructor will depend on a concrete `StudySimilarityScorer` (internal to `Application`), which keeps dependencies minimal while still allowing us to extract an interface later without a public-contract change.

### 4. Frontend refactor

- Remove `rankStudies`, `similarityScore`, `collectSuggestions` from `frontend/src/assistant/similarity.ts`. Keep `isSameCriterion` and `filterCopyableCriteria` (still used by copy-from-study).
- Add `getSimilarSuggestions(studyId: string, opts?: { limit?: number }): Promise<SuggestedCriterion[]>` to `frontend/src/api.ts`.
- `state.ts` reducer:
  - `START_SUGGEST_RELEVANT` becomes a two-step flow: dispatch a "loading" turn synchronously, kick off the API call, and on settle dispatch either `SUGGEST_RELEVANT_RESOLVED` (with the server list) or `SUGGEST_RELEVANT_FAILED` (with the error message).
  - Because the reducer stays pure, the async call is driven from `AssistantChatDock.tsx` (same pattern already used for `submitReferenceStudyId`).
  - `SUGGEST_THREE_MORE` re-issues the same API call; the server will see the updated persisted draft after any accepted suggestion that the host already persisted, and the client still applies `hasCriterionInDraft` as a second pass against unsaved accepts.
- `useOtherStudies` is no longer required to drive the suggest flow. It stays as a pre-fetch for copy-from-study, and the error toast that used to block "Suggest criteria based on similar studies" now reads from the suggestion call directly.
- New failure scenarios exposed in the chat drawer: network error, 404 (target study gone), 5xx. All become a bot text turn with `Retry` + `Back to main menu` options, matching the existing load-error pattern.

### 5. Validation and edge cases

- `id` path parameter: reuse the same `string.IsNullOrWhiteSpace` guard used by `GET /api/studies/{id}` and return 400 with `ErrorResponseDto`.
- `limit`: validated at the endpoint (1 ≤ `limit` ≤ 10). Out-of-range returns 400 via `ErrorResponseDto`.
- If the target study has no other studies in the corpus, return `{"data": []}` (200). The client already has a "No suggestions" bot turn for this outcome.
- If every candidate criterion is structurally equal to one already on the target study, return `{"data": []}` as well.

## Risks / Trade-offs

- **Risk**: Unsaved local accepts may cause the server to suggest a criterion the user already added in the draft. → **Mitigation**: keep the client-side `isSameCriterion` filter as a second pass on the response; this matches today's behaviour where the accept augments the in-memory context before the next suggestion round.
- **Risk**: The new endpoint adds a network hop to a flow that was previously synchronous, which could make the UI feel slower. → **Mitigation**: show a dedicated "loading" bot turn and disable the active menu while the call is in flight; the corpus is small enough that latency is dominated by round-trip, not compute.
- **Risk**: Deterministic ordering must remain identical to satisfy `Similarity ordering is deterministic`. → **Mitigation**: port the exact scoring formula and tie-break with unit tests reusing the same fixtures as `frontend/src/assistant/similarity.test.ts`.
- **Trade-off**: We intentionally do not introduce an `ISimilarityScorer` abstraction yet. Future ML/vector implementations will add that seam, at the cost of one refactor when the second implementation lands. This keeps the current PR focused and avoids speculative abstractions.
- **Trade-off**: Suggestions use the persisted target study as the draft baseline. This is a deliberate simplification; the alternative (passing the full draft in a `POST`) would complicate caching and future ranking implementations.

## Migration Plan

1. Land the backend endpoint and tests first, behind the existing spec scenarios (no client change).
2. Update the frontend to call the new endpoint; delete the now-unused similarity functions in the same PR to avoid drift.
3. Archive the change once the assistant's "Suggest criteria based on similar studies" scenarios pass against the backend heuristic.
4. No feature flag is needed: the change is a pure implementation relocation behind an equivalent observable behaviour.

Rollback: revert the frontend commit (restores local similarity). The backend endpoint is additive and can remain deployed without effect.

## Open Questions

- Do we want to expose a separate `GET /api/studies/{id}/similar` (study-level ranking) in this change for reuse, or defer it until an actual consumer appears? **Current answer:** defer — the chat drawer only needs criterion-level suggestions.
- Should the endpoint accept an explicit `draft` payload for the new-study wizard (where the target study has no persisted id)? **Current answer:** out of scope — the wizard does not invoke the suggestion flow with an unsaved study; it only runs after an id exists.
