## 1. Backend scoring primitives (domain layer)

- [x] 1.1 Add a `StudySimilarityScorer` class in `backend/src/ClinicalTrialsHub.Domain/` that computes the similarity score between two `Study` aggregates using the four deterministic rules (`+3` therapeuticArea case-insensitive, `+2` phase, `+1` studyType, `+1` per shared `dimensionId`).
- [x] 1.2 Add a helper (e.g. `CriterionEquality`) that implements structural equality for `EligibilityCriterion` (trim + lower-case description AND matching `dimensionId`, `operator`, `value`, `unit`). Mirror the frontend's `isSameCriterion` semantics.
- [x] 1.3 Add xUnit/NUnit tests in `backend/tests/ClinicalTrialsHub.Tests/` covering: therapeutic area match only, multi-field match, dimension overlap counting once per dimension per study, empty fields treated as non-matching, and structural equality of criteria.

## 2. Backend suggestion service (application layer)

- [x] 2.1 Create `SimilaritySuggestionService` in `backend/src/ClinicalTrialsHub.Application/Services/` that resolves the target study via `IStudyRepository`, ranks the remaining studies by score (descending) with tie-break by ascending `studyId`, and collects up to `limit` suggestions by walking each candidate's inclusion then exclusion list at index `i = 0, 1, 2, …`.
- [x] 2.2 Skip candidate criteria that are structurally equal to any criterion already on the target study or to any suggestion already collected in the current response.
- [x] 2.3 Return results as a read-only list of a new `SuggestedCriterionDto` record (`SourceStudyId`, `Group`, `CriterionIndex`, `Criterion`). Add `SuggestedCriterionDto` and `SimilarSuggestionsResponseDto` to `backend/src/ClinicalTrialsHub.Application/Dtos/ApiDtos.cs`.
- [x] 2.4 Register the service in `backend/src/ClinicalTrialsHub.Application/DependencyInjection.cs` with scoped lifetime.
- [x] 2.5 Throw `NotFoundException("study")` when the target study does not exist so the existing exception-handling middleware returns 404 with the standard error shape.
- [x] 2.6 Add unit tests for the service using in-memory repository fixtures that reproduce every scenario from the `study-similarity` spec (deterministic ordering, tie-break by id, inclusion-before-exclusion walk, duplicate skipping, empty-corpus returns empty list, unknown id throws).

## 3. Backend HTTP endpoint (API layer)

- [x] 3.1 Add `GET /api/studies/{id}/similar-suggestions` to `backend/src/ClinicalTrialsHub.Api/Endpoints/StudiesEndpoints.cs` (or create a dedicated `SimilarityEndpoints.cs`) with the existing `WithName` / `WithSummary` / `WithOpenApi` metadata conventions.
- [x] 3.2 Validate the `id` path parameter with the existing `IsNullOrWhiteSpace` guard (400 with `ErrorResponseDto`) and validate `limit` (default 3, min 1, max 10) at the endpoint boundary (400 with `ErrorResponseDto` on out-of-range).
- [x] 3.3 Return `StatusCodes.Status200OK` with `SimilarSuggestionsResponseDto` on success and declare `ProducesProblem` for 400 and 404.
- [x] 3.4 Add API-level integration tests in `backend/tests/ClinicalTrialsHub.Tests/` covering: happy path returns up to `limit` items in the expected deterministic order, unknown id returns 404, invalid `limit` returns 400, empty corpus returns `{"data": []}`.
- [x] 3.5 Verify the generated OpenAPI document now includes the new endpoint and response schemas.

## 4. Frontend API client

- [x] 4.1 Add a `SuggestedCriterion` TypeScript type to `frontend/src/types.ts` (or a dedicated module) mirroring the backend response shape.
- [x] 4.2 Add `getSimilarSuggestions(studyId: string, options?: { limit?: number }): Promise<SuggestedCriterion[]>` to `frontend/src/api.ts`, reusing the existing fetch helpers and error-to-`ApiErrorResponse` conventions.
- [x] 4.3 Add unit tests (vitest) for the API client covering success parsing, 404 surfacing, and non-2xx surfacing.

## 5. Frontend assistant refactor

- [x] 5.1 Remove `similarityScore`, `rankStudies`, `collectSuggestions`, and the `SuggestedCriterion` re-export from `frontend/src/assistant/similarity.ts`. Keep `isSameCriterion` and `filterCopyableCriteria` (still used by the copy-from-study flow).
- [x] 5.2 Update `frontend/src/assistant/similarity.test.ts` to drop the tests for the removed helpers and keep coverage for the helpers that remain.
- [x] 5.3 Introduce reducer actions `SUGGEST_RELEVANT_STARTED`, `SUGGEST_RELEVANT_RESOLVED` (carries the server-returned suggestions), and `SUGGEST_RELEVANT_FAILED` (carries an error message) in `frontend/src/assistant/state.ts`.
- [x] 5.4 Rework `startSuggestRelevant` / `acknowledgeSuggestion` so the bot turn for `Suggest criteria based on similar studies` and `Suggest three more` renders a loading turn synchronously, and the async fetch is orchestrated by `AssistantChatDock.tsx` (same pattern as `submitReferenceStudyId`).
- [x] 5.5 Keep a client-side structural-equality filter on the server response so suggestions that match criteria the user already accepted into the local draft (but not yet saved) are dropped before rendering the menu.
- [x] 5.6 On suggestion fetch errors, render a bot error turn with `Retry` and `Back to main menu` options; `Retry` re-invokes the same request.
- [x] 5.7 Update `useOtherStudies` documentation to reflect that it is no longer required for the suggest-relevant flow; it continues to pre-fetch for copy-from-study.
- [x] 5.8 Update or remove assistant state tests in `frontend/src/assistant/state.test.ts` so the suggest-relevant flow is asserted against the mocked API client instead of the removed local helpers.

## 6. Frontend integration tests

- [x] 6.1 Update `frontend/src/assistant/AssistantChatDock.test.tsx` to mock `getSimilarSuggestions` and verify: loading turn appears, server response renders the expected menu, error response renders the error turn with retry, and `Suggest three more` re-issues the request.
- [x] 6.2 Ensure the existing copy-from-study scenarios still pass unchanged.

## 7. Documentation and spec housekeeping

- [x] 7.1 Update `docs/backend-architecture.md` (and any relevant README) with a short note about the new similarity endpoint and where the heuristic lives.
- [x] 7.2 Run `openspec validate move-similarity-to-backend --strict` and fix any reported issues.
- [x] 7.3 Run `backend/` test suite, `frontend/` test suite, and a manual smoke test of the assistant's suggest-relevant flow end to end.
- [x] 7.4 Archive this change via the `openspec-archive-change` skill after all scenarios pass and the implementation lands on `main`.
