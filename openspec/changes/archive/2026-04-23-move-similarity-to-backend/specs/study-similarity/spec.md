## ADDED Requirements

### Requirement: Backend exposes a study similarity suggestions endpoint

The system SHALL expose a read-only HTTP endpoint `GET /api/studies/{id}/similar-suggestions` that returns up to `limit` concrete eligibility criterion suggestions drawn from other registered studies, ranked by the deterministic similarity heuristic defined below. The endpoint SHALL accept:

- Path parameter `id`: the target study's identifier (required, non-blank). Unknown ids SHALL return `404 Not Found` using the platform's standard error response shape.
- Query parameter `limit`: integer, default `3`, minimum `1`, maximum `10`. Out-of-range values SHALL return `400 Bad Request`.

The response body SHALL be a JSON object of the form `{ "data": [ SuggestedCriterion, ... ] }`, where each `SuggestedCriterion` contains `sourceStudyId` (string), `group` (`"inclusion"` | `"exclusion"`), `criterionIndex` (integer, zero-based position in the source study's group list), and `criterion` (the same `EligibilityCriterion` shape returned by `GET /api/studies/{id}`). The response SHALL be deterministic for the same target study and corpus.

#### Scenario: Endpoint returns up to the requested number of suggestions
- **WHEN** a client issues `GET /api/studies/study-0001/similar-suggestions?limit=3` against a corpus containing at least one other study with at least one criterion not already present on `study-0001`
- **THEN** the endpoint SHALL respond `200 OK` with a `data` array of at most three items, each carrying a `sourceStudyId` other than `study-0001` and a `criterion` that is not structurally equal to any criterion already on `study-0001`

#### Scenario: Endpoint returns 404 for an unknown target study
- **WHEN** a client issues `GET /api/studies/study-9999/similar-suggestions` and no study with that id exists
- **THEN** the endpoint SHALL respond `404 Not Found` with the platform's standard error response body

#### Scenario: Endpoint rejects invalid limit values
- **WHEN** a client issues `GET /api/studies/study-0001/similar-suggestions?limit=0` or `limit=11`
- **THEN** the endpoint SHALL respond `400 Bad Request` with a validation error describing the `limit` field

#### Scenario: Endpoint returns an empty list when no candidates remain
- **WHEN** a client issues the suggestions request for a target study whose corpus has no other studies, or whose candidate criteria are all structurally equal to criteria already on the target study
- **THEN** the endpoint SHALL respond `200 OK` with `{"data": []}`

### Requirement: Similarity score follows the deterministic heuristic

The system SHALL compute the similarity score between a target study and each candidate study as the sum of:

- `3` when `therapeuticArea` is equal (case-insensitive, with empty strings treated as non-matching), `0` otherwise.
- `2` when `phase` is equal (non-empty exact match), `0` otherwise.
- `1` when `studyType` is equal (non-empty exact match), `0` otherwise.
- `1` for each eligibility `dimensionId` that appears in both studies' criteria (inclusion or exclusion), counted once per dimension per study.

Candidate studies SHALL be ordered by descending score, with ties broken by ascending lexicographic `studyId`. The heuristic SHALL be pure and deterministic: the same inputs MUST always produce the same ordering and the same selected suggestions.

#### Scenario: Therapeutic area match contributes three points
- **WHEN** the score is computed between a target study and a candidate sharing the same `therapeuticArea` (case-insensitive) and no other matching fields or dimensions
- **THEN** the similarity score SHALL be `3`

#### Scenario: Ordering is deterministic across repeated calls
- **WHEN** the suggestions endpoint is invoked twice in succession with the same `id`, the same `limit`, and the same underlying corpus
- **THEN** both responses SHALL contain the same ordered list of suggested criteria

#### Scenario: Ties are broken by ascending study id
- **WHEN** two candidate studies produce the same similarity score against the target study
- **THEN** the candidate whose `studyId` sorts earlier lexicographically SHALL be considered first when collecting suggestions

### Requirement: Suggestion collection walks studies and criteria in a fixed order

The system SHALL build the suggestion list by iterating candidate studies in ranked order, and within each study iterating criterion indices `i = 0, 1, 2, …` up to the longer of the inclusion and exclusion lists. For each index `i` the inclusion criterion at position `i` SHALL be considered before the exclusion criterion at position `i`. A candidate criterion SHALL be skipped when any of the following holds:

- The criterion is structurally equal (same trimmed, case-insensitive description AND same `dimensionId`, `operator`, `value`, `unit`) to a criterion already present on the target study's inclusion or exclusion list.
- The criterion is structurally equal to a suggestion already collected earlier in the same response.

Iteration SHALL stop as soon as `limit` suggestions have been collected.

#### Scenario: Inclusion before exclusion within the same source study
- **WHEN** a top-ranked candidate study has both an inclusion and an exclusion criterion at index `0`, neither already on the target study, and `limit` is `2`
- **THEN** the response SHALL contain, in order, the inclusion criterion from the candidate followed by the exclusion criterion from the same candidate

#### Scenario: Duplicates of existing criteria are skipped
- **WHEN** the top-ranked candidate study's first criterion is structurally equal to a criterion already on the target study
- **THEN** that criterion SHALL NOT appear in the response, and the next distinct criterion in the walk SHALL be considered instead

#### Scenario: Duplicates within the same response are skipped
- **WHEN** two different candidate studies expose the same structural criterion and that criterion is otherwise eligible
- **THEN** the response SHALL include only one occurrence of that criterion, attributed to the first candidate encountered

### Requirement: Similarity computation is read-only and stateless

The system SHALL compute suggestions on demand from the current contents of the study repository and SHALL NOT persist ranking results, cache scores across requests, or mutate any aggregate while serving a similarity request.

#### Scenario: No state is written while serving a request
- **WHEN** a client issues the suggestions request
- **THEN** the system SHALL NOT execute any write operation against the study repository as part of handling that request

#### Scenario: New studies are immediately eligible as candidates
- **WHEN** a new study is created and a subsequent suggestions request is issued for an existing target study
- **THEN** the newly created study SHALL be considered as a candidate in the ranking without requiring any rebuild or cache invalidation step
