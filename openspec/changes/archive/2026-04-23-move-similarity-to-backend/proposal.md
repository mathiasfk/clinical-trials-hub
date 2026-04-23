## Why

The study-similarity heuristic that powers the assistant's `Suggest criteria based on similar studies` flow currently runs entirely in the frontend (`frontend/src/assistant/similarity.ts`). To compute suggestions, the browser must first download the full catalog of studies via `GET /api/studies` and then re-rank them locally on every activation. This was acceptable for the initial POC but no longer matches the rest of the platform: ranking is a server-side concern, shipping the whole corpus to every client will not scale, and the current placement blocks swapping the heuristic for a richer implementation (ML models, vector search) without changing the client.

Moving the heuristic to the backend keeps the UX identical today while giving us a stable API surface (`GET /api/studies/{id}/similar-suggestions`) behind which the scoring implementation can evolve independently of the React app.

## What Changes

- Add a new backend capability that computes ranked similar studies and concrete criterion suggestions for a given study, using the exact same deterministic scoring currently implemented in the frontend.
- Expose a new HTTP endpoint `GET /api/studies/{id}/similar-suggestions` that returns a bounded list of suggested criteria (up to `limit`, default 3) drawn from the most similar studies, already filtered against the target study's current draft.
- **BREAKING (internal contract)**: the assistant's suggestion flow SHALL stop computing similarity in the browser. `frontend/src/assistant/similarity.ts` (score, rank, collectSuggestions) is removed from the assistant code path; only the `isSameCriterion` / `filterCopyableCriteria` helpers used by the copy-from-study flow remain local.
- The `Suggest criteria based on similar studies` flow in the chat drawer becomes API-driven: it calls the new endpoint, shows a loading turn, renders up to three suggestions returned by the server, and handles API errors with a retry option. `Suggest three more` issues a follow-up call that excludes criteria already in the draft.
- The frontend no longer needs to pre-load every registered study just to surface suggestions. The existing workspace `otherStudies` list continues to power the `Copy criteria from another study` flow and the reference-id fallback, which stay unchanged.

## Capabilities

### New Capabilities
- `study-similarity`: Backend capability that ranks registered studies by deterministic similarity against a target study and derives bounded criterion suggestions; exposed via a read-only API consumed by the assistant.

### Modified Capabilities
- `study-assistant`: The `Suggest criteria based on similar studies` requirement changes from a locally-computed deterministic heuristic to a call against the new `study-similarity` endpoint. The description, ordering guarantees, and empty/duplicate behaviour stay observable, but the computation moves to the server. The requirement that the assistant only issues read-only HTTP is updated to include the new endpoint.

## Impact

- Backend (.NET 10 API):
  - New domain/application module for similarity (pure scoring function, suggestion collector) under `ClinicalTrialsHub.Application`.
  - New minimal API endpoint under `backend/src/ClinicalTrialsHub.Api/Endpoints/StudiesEndpoints.cs` (or a dedicated `SimilarityEndpoints.cs`).
  - New DTOs in `ClinicalTrialsHub.Application/Dtos/ApiDtos.cs` for the suggestion payload.
  - New unit tests in `ClinicalTrialsHub.Tests` mirroring the scenarios currently covered by `frontend/src/assistant/similarity.test.ts` plus HTTP-level integration tests.
- Frontend (React + Vite):
  - New API client method (e.g. `getSimilarSuggestions(studyId, draft)` in `frontend/src/api.ts`).
  - `frontend/src/assistant/similarity.ts`: remove `similarityScore`, `rankStudies`, `collectSuggestions`; keep `isSameCriterion` and `filterCopyableCriteria` for the copy-from-study flow. Corresponding tests updated/removed.
  - `frontend/src/assistant/state.ts` / `AssistantChatDock.tsx`: the suggest-relevant reducer path becomes async and delegates to the new API client; add loading/error bot turns.
  - `frontend/src/assistant/useOtherStudies.ts`: no longer required by the suggestion flow; kept only for copy-from-study pre-population, so its role is documented as "nice-to-have prefetch" rather than "required for suggestions".
- OpenAPI: the auto-generated schema gains the new endpoint and response types.
- No database or storage migration is required; the heuristic reads the same aggregates already exposed by `IStudyRepository`.
