# study-assistant Specification

## Purpose
TBD - created by archiving change add-eligibility-assistant-chat. Update Purpose after archive.
## Requirements
### Requirement: Assistant exposes a floating action button on the Eligibility criteria screen
The system SHALL render a floating action button (FAB) on the `Eligibility criteria` screen in both edit mode and new-study mode. Activating the FAB SHALL open a right-side chat drawer. Deactivating the FAB or activating the drawer's close control SHALL hide the drawer without discarding the current conversation.

#### Scenario: User opens the assistant from the Eligibility criteria screen
- **WHEN** the user is on the `Eligibility criteria` screen and activates the floating action button
- **THEN** the system SHALL open the assistant chat drawer on the right side of the viewport

#### Scenario: FAB is available in new-study mode
- **WHEN** the user is on the `Eligibility criteria` section within the new-study wizard
- **THEN** the floating action button SHALL be rendered and activating it SHALL open the chat drawer

#### Scenario: User closes the drawer without clearing it
- **WHEN** the user activates the drawer's close control after exchanging at least one menu turn
- **THEN** the system SHALL hide the drawer and SHALL preserve the current conversation thread for the next time the drawer is opened on the same screen mount

### Requirement: Assistant posts an introductory message and a root menu on open
The system SHALL render an introductory bot greeting and a root menu as the first bot turn each time a conversation is started. The greeting SHALL explain the assistant's capabilities for the current screen. The root menu SHALL expose exactly two options on the `Eligibility criteria` screen: `Copy criteria from another study` and `Suggest criteria based on similar studies`. The intro SHALL also state that chosen criteria are added to the current draft and still require `Save` or `Next` to persist.

#### Scenario: User opens the drawer for the first time
- **WHEN** the user opens the chat drawer on the `Eligibility criteria` screen with no prior conversation
- **THEN** the system SHALL render the introductory bot message followed by the root menu containing exactly the two eligibility skill options

#### Scenario: User resets the conversation
- **WHEN** the user activates the `Clear chat` control while a conversation is in progress
- **THEN** the system SHALL clear the conversation thread and SHALL render the introductory bot message followed by the root menu again

### Requirement: Assistant interaction is menu-driven with a narrow text exception
The system SHALL progress every conversation turn through interactive menu options rendered inside the latest bot turn, except in the `Copy criteria from another study` reference-id step. In that step, the user SHALL enter a reference study id in the drawer footer field and confirm with Enter; all other flows SHALL remain menu-only. Every conversation state SHALL expose a menu that lets the user proceed (or retry), and the root menu SHALL be reachable from any non-root state via a `Back to main menu` option.

#### Scenario: User progresses the conversation with a menu choice
- **WHEN** the user activates a menu option rendered by the current bot turn
- **THEN** the system SHALL append a user turn displaying the selected option's label, SHALL compute the next bot turn deterministically, and SHALL render the next menu in that turn

#### Scenario: Footer text is disabled except for reference study id entry
- **WHEN** the assistant is not awaiting a reference study id for copy-from-study
- **THEN** the drawer's text input SHALL be disabled and SHALL NOT append conversation turns

#### Scenario: User submits a reference study id for copy-from-study
- **WHEN** the assistant is awaiting a reference study id and the user types in the footer field and presses Enter
- **THEN** the system SHALL normalize the input (trim whitespace, strip common punctuation, extract a `study-` + numeric id), resolve the study from the loaded workspace list or via `GET /api/v1/studies/:id`, and SHALL proceed to the criterion menu or SHALL post an error bot turn that keeps reference-id entry available

#### Scenario: User returns to the root from a nested menu
- **WHEN** the user is inside any nested skill flow and activates the `Back to main menu` option
- **THEN** the system SHALL render the root menu as the next bot turn without discarding the previous conversation history

### Requirement: Chat drawer follows standard chat layout conventions
The system SHALL render bot turns aligned to the left side of the drawer thread and user turns aligned to the right side of the drawer thread. The thread SHALL grow from top to bottom as turns are appended, with the latest turn visible and scrolled into view. Menu options SHALL be rendered as interactive buttons inside the bot turn that produced them.

#### Scenario: Bot and user turns are aligned to opposite sides
- **WHEN** the system renders a conversation thread containing at least one bot turn and one user turn
- **THEN** bot turns SHALL be left-aligned in the thread and user turns SHALL be right-aligned in the thread

#### Scenario: Latest turn is brought into view
- **WHEN** the system appends a new turn that extends beyond the drawer viewport
- **THEN** the drawer SHALL scroll so that the newly appended turn is visible

### Requirement: Assistant can copy eligibility criteria from a study identified by id
The system SHALL provide a `Copy criteria from another study` skill on the `Eligibility criteria` screen. When selected, the bot SHALL prompt the user for the reference study's id and SHALL enable the drawer footer field for that purpose. The user SHALL NOT be required to pick from a scrolling list of all other studies. After a study is resolved (from the already-loaded workspace list or via `GET /api/v1/studies/:id`), the bot SHALL render that study's inclusion and exclusion criteria as menu options showing each criterion's description. Activating a criterion option SHALL append that criterion to the matching group (inclusion stays inclusion, exclusion stays exclusion) of the current study's draft and SHALL post a bot confirmation turn. The menu SHALL remain available so the user can add additional criteria from the same source study, and SHALL offer `Pick another study` and `Back to main menu` controls.

#### Scenario: User copies one inclusion criterion from another study
- **WHEN** the user selects `Copy criteria from another study`, enters a valid reference study id that resolves to another study, and activates one of that study's inclusion criteria options
- **THEN** the system SHALL append that criterion to the current study's inclusion criteria draft and SHALL post a bot confirmation turn identifying the added criterion

#### Scenario: Inclusion and exclusion groups are preserved when copying
- **WHEN** the user activates an exclusion criterion option from another study
- **THEN** the system SHALL append the criterion to the current study's exclusion criteria draft and SHALL NOT add it to the inclusion criteria draft

#### Scenario: Copy-from-study still works when the workspace list is empty or failed to load
- **WHEN** the user selects `Copy criteria from another study` and the other-studies list is empty or could not be loaded, but another study still exists on the server
- **THEN** the system SHALL still allow entering a reference study id (and loading that study by id when needed) or SHALL offer `Retry` / `Back to main menu` when the list failed to load

### Requirement: Assistant can suggest criteria from similar studies using a deterministic heuristic

The system SHALL provide a `Suggest criteria based on similar studies` skill on the `Eligibility criteria` screen. When selected, the bot SHALL request up to three concrete criterion suggestions from the backend similarity endpoint (`GET /api/v1/studies/{id}/similar-suggestions?limit=3`) against the current study's persisted id, and SHALL render the returned suggestions as menu options labeled with each criterion's description and its source study identifier. Activating a suggestion SHALL append that criterion to the matching group of the current study's draft and SHALL post a bot confirmation turn followed by a menu offering `Suggest three more` and `Back to main menu`.

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

The system SHALL append criteria chosen through the assistant to the local form state of the `Eligibility criteria` screen and SHALL NOT call the study eligibility update endpoint, the full-study update endpoint, or the create-study endpoint on behalf of the user. The assistant MAY issue read-only requests such as `GET /api/v1/studies` (workspace list), `GET /api/v1/studies/:id` (resolve a reference study by id for copy-from-study), and `GET /api/v1/studies/:id/similar-suggestions` (retrieve ranked criterion suggestions for the suggest-relevant skill). Persistence SHALL remain gated by the existing `Save` action in edit mode and the existing `Next` and wizard `Publish` actions in new-study mode.

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

### Requirement: Assistant filters out criteria that already exist in the current draft
The system SHALL exclude from every assistant menu any criterion whose description (trimmed, case-insensitive) AND deterministic rule (matching `dimensionId`, `operator`, `value`, and `unit`) already exist in the current study's inclusion or exclusion drafts.

#### Scenario: Duplicate criteria do not appear in the copy-from-study menu
- **WHEN** the user opens another study's criteria through the `Copy criteria from another study` skill and that study contains a criterion identical to one already in the current draft
- **THEN** the system SHALL NOT render that criterion as a menu option

#### Scenario: Duplicate criteria do not appear in suggestions
- **WHEN** the suggestion flow evaluates candidate criteria and one of them is identical to a criterion already in the current draft
- **THEN** the system SHALL skip it and SHALL draw the next distinct candidate instead

### Requirement: Assistant thread lifetime is scoped to the current screen mount
The system SHALL keep the assistant's conversation thread in memory only while the hosting section screen is mounted. Navigating away from the `Eligibility criteria` screen SHALL discard the thread so that returning to the screen starts a fresh conversation with the introductory bot turn. The `Clear chat` action SHALL also reset the thread to its initial introductory state.

#### Scenario: Navigating away resets the conversation
- **WHEN** the user exchanges at least one menu turn, navigates to another screen, and returns to the `Eligibility criteria` screen
- **THEN** opening the assistant drawer SHALL render the introductory bot turn and root menu as if no prior conversation had occurred

#### Scenario: Clear chat replays the intro
- **WHEN** the user activates `Clear chat` at any point in a conversation
- **THEN** the system SHALL remove all previous bot and user turns and SHALL render the introductory bot turn followed by the root menu
