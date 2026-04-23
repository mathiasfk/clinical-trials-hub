## MODIFIED Requirements

### Requirement: Assistant can suggest criteria from similar studies using a deterministic heuristic

The system SHALL provide a `Suggest criteria based on similar studies` skill on the `Eligibility criteria` screen. When selected, the bot SHALL request up to three concrete criterion suggestions from the backend similarity endpoint (`GET /api/studies/{id}/similar-suggestions?limit=3`) against the current study's persisted id, and SHALL render the returned suggestions as menu options labeled with each criterion's description and its source study identifier. Activating a suggestion SHALL append that criterion to the matching group of the current study's draft and SHALL post a bot confirmation turn followed by a menu offering `Suggest three more` and `Back to main menu`.

While the backend request is in flight the system SHALL render a bot loading turn and SHALL keep the previously-active menu disabled so the user cannot issue a second request in parallel. On network or server error the system SHALL post a bot error turn and offer `Retry` and `Back to main menu` options.

The deterministic similarity heuristic itself (scoring rules, descending-score ordering with tie-break by ascending lexicographic `studyId`, walk order within a study, duplicate filtering against criteria already on the target study) SHALL be defined and enforced by the `study-similarity` capability. The assistant SHALL NOT compute similarity in the browser. The assistant SHALL apply an additional client-side structural-equality filter on the response to skip any suggestion that matches a criterion the user has already accepted into the local draft but that is not yet persisted on the backend.

#### Scenario: Assistant returns up to three unique suggestions
- **WHEN** the user activates `Suggest criteria based on similar studies` on a study whose backend similarity endpoint returns at least one suggestion not already in the current draft
- **THEN** the system SHALL render a menu containing up to three criterion options, each labeled with its description and source study id, and each representing a criterion not already present in the current study's draft

#### Scenario: Similarity ordering is deterministic
- **WHEN** the suggestion flow is activated twice in succession against the same current study and the same backend state
- **THEN** the system SHALL render the same ordered list of suggested criteria in both runs, because the backend endpoint is deterministic

#### Scenario: Assistant handles an empty draft without failing
- **WHEN** the user activates the suggestion flow with a draft whose `therapeuticArea`, `phase`, `studyType`, and criteria are all empty and the current study's id exists on the backend
- **THEN** the system SHALL call the similarity endpoint and SHALL render up to three suggestions from the deterministic backend ordering (tie-broken by study id)

#### Scenario: Assistant explains when no suggestions are available
- **WHEN** the user activates the suggestion flow and the backend endpoint returns an empty `data` array
- **THEN** the system SHALL post a bot turn explaining that no suggestions are available and SHALL offer the `Back to main menu` option

#### Scenario: User requests an additional batch of suggestions
- **WHEN** the user accepts one suggestion and activates `Suggest three more`
- **THEN** the system SHALL re-issue the similarity request and SHALL render up to three new suggestions, skipping any criterion already present in the current draft (including local accepts not yet persisted), until no further unique suggestions remain

#### Scenario: Assistant surfaces backend errors without crashing
- **WHEN** the suggestion call fails with a network error or a non-2xx response
- **THEN** the system SHALL post a bot error turn, SHALL NOT append any suggestion menu, and SHALL offer `Retry` and `Back to main menu` options

### Requirement: Assistant mutates only the local eligibility draft, not the backend

The system SHALL append criteria chosen through the assistant to the local form state of the `Eligibility criteria` screen and SHALL NOT call the study eligibility update endpoint, the full-study update endpoint, or the create-study endpoint on behalf of the user. The assistant MAY issue read-only requests such as `GET /api/studies` (workspace list), `GET /api/studies/:id` (resolve a reference study by id for copy-from-study), and `GET /api/studies/:id/similar-suggestions` (retrieve ranked criterion suggestions for the suggest-relevant skill). Persistence SHALL remain gated by the existing `Save` action in edit mode and the existing `Next` and wizard `Publish` actions in new-study mode.

#### Scenario: Accepted criterion is visible in the editor but not persisted
- **WHEN** the user accepts a criterion through the assistant on an existing study's `Eligibility criteria` screen
- **THEN** the system SHALL show the newly appended criterion in the on-screen editor and SHALL NOT issue any backend write request until the user activates `Save`

#### Scenario: Accepted criterion participates in validation
- **WHEN** the user activates `Save` after accepting assistant-supplied criteria
- **THEN** the system SHALL validate the full draft (including the assistant-supplied criteria) against the same minimum-validity contract the manual editor uses before calling the backend

#### Scenario: Accepted criterion is retained in a new-study draft
- **WHEN** the user accepts a criterion through the assistant within the new-study wizard
- **THEN** the system SHALL append it to the in-progress new-study draft and SHALL NOT call the create-study endpoint until the user activates `Publish` on the final `Summary`

#### Scenario: Suggestion call is a read-only request
- **WHEN** the assistant invokes the similarity endpoint to populate the suggest-relevant menu
- **THEN** the system SHALL issue exactly one `GET` request and SHALL NOT issue any write request as part of populating or refreshing the suggestions
