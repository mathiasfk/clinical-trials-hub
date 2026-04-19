# study-registration Specification

## Purpose
TBD - created by archiving change init-mvp-react-go-inmemory. Update Purpose after archive.
## Requirements
### Requirement: Users can register clinical studies with required MVP fields
The system SHALL allow users to create a clinical study registration record containing objectives, endpoints, inclusion and exclusion criteria, number of participants, study type, number of arms, phase, therapeutic area, patient population, and the optional schedule-of-activities milestone dates `firstPatientFirstVisit`, `lastPatientFirstVisit`, and `protocolApprovalDate`.

#### Scenario: User creates a study with complete registration data
- **WHEN** the user submits a study registration payload with all required MVP fields and any subset (including all or none) of the optional SOA milestone dates
- **THEN** the system SHALL persist the study record and return the created study representation

#### Scenario: User submits incomplete study registration data
- **WHEN** the user submits a study registration payload missing one or more required MVP fields
- **THEN** the system SHALL reject the request with validation errors describing missing or invalid fields

### Requirement: Study registration supports structured criteria and endpoint lists
The system MUST support multiple objectives, endpoints, inclusion criteria, and exclusion criteria per study, and eligibility criteria MUST be stored as ordered structured collections rather than free-form strings.

#### Scenario: User submits multiple objectives and endpoints
- **WHEN** the user includes multiple objective and endpoint entries in the registration payload
- **THEN** the system SHALL store and return them as ordered collections associated with the study

#### Scenario: User submits multiple inclusion and exclusion criteria
- **WHEN** the user includes multiple inclusion and exclusion criteria in the registration payload
- **THEN** the system SHALL store and return them as separate ordered structured collections associated with the study

### Requirement: Users can retrieve registered studies
The system SHALL provide read access for registered studies for MVP verification and usage, including the structured eligibility criteria and the metadata needed to navigate study workspaces.

#### Scenario: User lists studies
- **WHEN** the user requests the study list endpoint
- **THEN** the system SHALL return all registered studies available in the current runtime

#### Scenario: User retrieves a single study by identifier
- **WHEN** the user requests a specific study by ID
- **THEN** the system SHALL return the matching study with its structured eligibility criteria if it exists, or a not-found response otherwise

### Requirement: Users can navigate studies from an All studies home
The system SHALL present `All studies` as the default landing view for the application, list all registered studies with basic summary information needed for selection, and provide an explicit action to start registering a new study.

#### Scenario: User opens the application
- **WHEN** the user opens the application at the root path
- **THEN** the system SHALL render the `All studies` view as the default landing view with the persistent app shell visible

#### Scenario: User reviews study summary information in the list
- **WHEN** the system renders the `All studies` view
- **THEN** each study entry SHALL show enough basic information to help the user choose a study to inspect

#### Scenario: User starts registering a new study from the list
- **WHEN** the user activates the new-study action on `All studies`
- **THEN** the system SHALL enter the new-study registration flow with the persistent app shell visible and the first section editor shown

### Requirement: Users can navigate a study through a sidebar workspace
The system SHALL provide a persistent sidebar in the application shell that is visible on every screen and is organized into two sections: `All studies` and `Study outline`. The `Study outline` section SHALL be shown only when a study or a new-study draft is the active context, and SHALL expose five subsections: `Summary`, `Study information`, `Objectives`, `Endpoints`, `Eligibility criteria`.

#### Scenario: User sees the persistent sidebar on All studies
- **WHEN** the user is on the `All studies` view without any active study
- **THEN** the sidebar SHALL render the `All studies` section and SHALL NOT render the `Study outline` section

#### Scenario: User opens an existing study from All studies
- **WHEN** the user selects a study from the `All studies` view
- **THEN** the system SHALL open that study in its workspace, make that study the active context, render the `Study outline` section in the sidebar with the five subsections, and show `Summary` as the initial section

#### Scenario: User changes study sections from the sidebar
- **WHEN** the user selects any of `Summary`, `Study information`, `Objectives`, `Endpoints`, or `Eligibility criteria` from the sidebar `Study outline`
- **THEN** the system SHALL navigate to the requested subsection for the currently active study or new-study draft

#### Scenario: Header reflects active study and subsection
- **WHEN** any screen tied to the active study or new-study draft is rendered
- **THEN** the app shell header SHALL display a single combined title composed as `<studyId> > <section>` for an existing study or `New study > <section>` for an unpublished draft, and SHALL NOT render the identifier and section name as separate stacked headings

### Requirement: Users can edit eligibility criteria from summary
The system SHALL render `Summary` as a read-only view for existing studies that shows compact cards for `Study information`, `Objectives`, `Endpoints`, and `Eligibility criteria`, where each card exposes a pencil edit icon that navigates to the corresponding dedicated section screen. The `Eligibility criteria` card SHALL show a summary list of the inclusion and exclusion descriptions only, with the full editable view living on the `Eligibility criteria` screen.

#### Scenario: User reviews an existing study summary
- **WHEN** the user opens `Summary` for an existing study
- **THEN** the system SHALL render each section card in read-only mode with a pencil icon in its header

#### Scenario: User edits a section from summary
- **WHEN** the user activates the pencil icon on any section card in `Summary` for an existing study
- **THEN** the system SHALL navigate to the dedicated screen for that section for that study

#### Scenario: User sees eligibility criteria as a summary list on summary
- **WHEN** the user views the `Eligibility criteria` card on `Summary`
- **THEN** the card SHALL show inclusion and exclusion criteria as a list of readable descriptions only and SHALL expose a pencil icon that navigates to the full `Eligibility criteria` screen

### Requirement: Eligibility criteria use deterministic structured rules
The system SHALL store inclusion and exclusion criteria as ordered structured collections where each criterion contains a readable description and a deterministic rule with `dimensionId`, `operator`, `value`, and optional `unit`.

#### Scenario: User saves inclusion and exclusion criteria
- **WHEN** the user submits structured inclusion and exclusion criteria for a study
- **THEN** the system SHALL persist and return them as ordered collections of structured criteria associated with that study

#### Scenario: User submits a criterion with all rule parts
- **WHEN** the user submits a criterion with a valid description, dimension identifier, operator, value, and optional unit
- **THEN** the system SHALL accept the criterion and store it in the study eligibility data

### Requirement: Eligibility dimensions come from a declarative registry
The system MUST provide supported eligibility dimensions from a declarative registry that includes an identifier, display name, and full description for hover or tooltip content.

#### Scenario: User opens the eligibility criteria editor
- **WHEN** the user loads the eligibility criteria section
- **THEN** the system SHALL provide the supported dimensions and their metadata for selection and display

#### Scenario: Team adds a new supported dimension
- **WHEN** a developer adds a new dimension entry to the registry
- **THEN** the system SHALL make that dimension available to validation and UI rendering without requiring rule-specific code changes

### Requirement: Application starts with mock study data
The system MUST seed deterministic mock study data at application startup to support demos and local testing.

#### Scenario: Backend starts with seeded records
- **WHEN** the backend service starts
- **THEN** at least one mock clinical study SHALL be available through the read endpoints without requiring prior manual creation

### Requirement: Dedicated section screens own editing with mode-specific footer action
The system SHALL provide a dedicated screen for each of `Study information`, `Objectives`, `Endpoints`, and `Eligibility criteria`, each allowing edits and ending with a single primary footer action. The label and behavior of that action SHALL depend on the mode: in edit mode it SHALL be labeled `Save` and persist the changes for the active study; in new-study mode it SHALL be labeled `Next` and advance the wizard without persisting to the backend. The `Save` label SHALL NOT appear in new-study mode, and the `Next` label SHALL NOT appear in edit mode.

#### Scenario: User saves a section in edit mode
- **WHEN** the user edits fields on any section screen of an existing study and activates the `Save` button
- **THEN** the system SHALL persist the updated section data for that study and remain on that section screen with a success indication

#### Scenario: Edit-mode section screens show Save and not Next
- **WHEN** the user opens any section screen for an existing study
- **THEN** the screen footer SHALL render a `Save` button and SHALL NOT render a `Next` button

#### Scenario: User advances a section in new-study mode
- **WHEN** the user fills fields on any section screen within the new-study flow and activates the `Next` button
- **THEN** the system SHALL store the data in the in-progress new-study draft, SHALL NOT send the data to the backend, and SHALL navigate to the next section in the wizard order

#### Scenario: New-study section screens show Next and not Save
- **WHEN** the user opens any section screen within the new-study flow
- **THEN** the screen footer SHALL render a `Next` button and SHALL NOT render a `Save` button

#### Scenario: Eligibility criteria screen is the sole editor for eligibility rules
- **WHEN** the user wants to add, remove, or modify inclusion or exclusion criteria
- **THEN** the system SHALL require those edits to happen on the `Eligibility criteria` screen and SHALL NOT allow inline editing of rule details from `Summary`

### Requirement: New-study registration flow is a guided wizard ending at Summary
The system SHALL provide a new-study registration flow where the sidebar is visible, the same section screens used for editing are reused, the subsection order is `Study information`, `Objectives`, `Endpoints`, `Eligibility criteria`, `Summary`, and `Summary` appears as the final step with `Publish` and `Discard` actions instead of being read-only.

#### Scenario: User advances through the wizard
- **WHEN** the user activates `Next` on a new-study section other than `Summary`
- **THEN** the system SHALL advance to the next section in the wizard order and preserve previously entered draft data

#### Scenario: User publishes a new study
- **WHEN** the user activates `Publish` on the new-study `Summary`
- **THEN** the system SHALL create the study from the draft, clear the draft, and navigate to the newly created study's `Summary` in edit mode

#### Scenario: User discards a new study after confirming
- **WHEN** the user activates `Discard` on the new-study `Summary` and confirms the confirmation modal
- **THEN** the system SHALL clear the draft and navigate back to `All studies`

#### Scenario: User cancels a discard
- **WHEN** the user activates `Discard` on the new-study `Summary` and cancels the confirmation modal
- **THEN** the system SHALL keep the draft intact and remain on the new-study `Summary`

#### Scenario: User navigates the wizard via the sidebar
- **WHEN** the user selects a `Study outline` subsection from the sidebar while a new-study draft is active
- **THEN** the system SHALL navigate to that subsection within the new-study flow while keeping the current draft data intact

### Requirement: Summary behavior differs between new-study and edit modes
The system SHALL render two distinct variants of `Summary`: a read-only variant for existing studies with pencil icons on each section card, and an action-oriented variant for new-study drafts that exposes `Publish` and `Discard` buttons. The new-study `Summary` variant SHALL NOT render the pencil icons and SHALL NOT offer inline editing; users who need to change draft data SHALL use the sidebar or the wizard navigation to return to the relevant section screen.

#### Scenario: User opens summary for an existing study
- **WHEN** the user opens `Summary` for a persisted study
- **THEN** the system SHALL render the read-only variant with per-section pencil icons and SHALL NOT render `Publish` or `Discard` buttons

#### Scenario: User opens summary for a new-study draft
- **WHEN** the user opens `Summary` within the new-study flow
- **THEN** the system SHALL render the action-oriented variant with `Publish` and `Discard` buttons and SHALL NOT render per-section pencil icons

### Requirement: Backend supports full-study updates for per-section editing
The system SHALL expose a backend endpoint that replaces the persisted record of an existing study so that the `Study information`, `Objectives`, and `Endpoints` section editors can save their changes using the same payload shape as study creation. Eligibility criteria updates SHALL continue to use the existing dedicated eligibility update endpoint.

#### Scenario: User saves a non-eligibility section for an existing study
- **WHEN** the user activates `Save` on `Study information`, `Objectives`, or `Endpoints` for an existing study
- **THEN** the system SHALL send the full study payload (with the section edits merged over the current persisted values) to the full-study update endpoint and SHALL return the updated study representation

#### Scenario: Full-study update is rejected when data is invalid
- **WHEN** the full-study update endpoint receives a payload missing one or more required fields
- **THEN** the system SHALL reject the request with validation errors describing the missing or invalid fields and SHALL NOT mutate the persisted study

### Requirement: Discard in the new-study flow requires explicit confirmation
The system SHALL require a confirmation modal before discarding an in-progress new-study draft. Activating `Discard` SHALL open a modal that warns the draft will be permanently lost and offers two actions: a confirm action that clears the draft and navigates to `All studies`, and a cancel action that dismisses the modal with the draft intact. The draft SHALL NOT be cleared until the user confirms.

#### Scenario: Discard opens a confirmation modal
- **WHEN** the user activates `Discard` on the new-study `Summary`
- **THEN** the system SHALL open a confirmation modal warning that the draft will be lost and SHALL NOT modify the draft until a modal action is taken

#### Scenario: User confirms the discard
- **WHEN** the user activates the confirm action inside the discard confirmation modal
- **THEN** the system SHALL clear the draft, close the modal, and navigate to `All studies`

#### Scenario: User cancels the discard
- **WHEN** the user activates the cancel action inside the discard confirmation modal or dismisses the modal
- **THEN** the system SHALL close the modal, keep the draft intact, and leave the user on the new-study `Summary`

### Requirement: Section screens enforce a minimum-validity contract before advancing or saving
The system SHALL define a minimum-validity contract per section and SHALL enforce it before any forward action that commits or advances the section data. In new-study mode, the `Next` button SHALL block advancement when the current section is invalid; in edit mode, the `Save` button SHALL block the backend call when the current section is invalid. Invalid submissions SHALL render inline validation messages next to the offending fields without clearing entered data.

The minimum-validity contract per section:
- `Study information`: `phase` MUST be one of the supported phase values (`Phase 1`, `Phase 2`, `Phase 3`, `Phase 4`); `therapeuticArea` MUST be one of the supported therapeutic-area values (`Cardiovascular`, `Diabetes`, `Hematology`, `Sickle Cell Disease`, `Obesity`, `Rare Diseases`); `patientPopulation` MUST be non-empty after trimming; `studyType` MUST be one of the supported values; `participants` MUST be an integer greater than or equal to 1; `numberOfArms` MUST be an integer greater than or equal to 1. The SOA milestone fields `firstPatientFirstVisit`, `lastPatientFirstVisit`, and `protocolApprovalDate` MAY each be left empty; when provided, each MUST be a valid ISO-8601 calendar date.
- `Objectives`: MUST contain at least one objective, and every objective MUST have a trimmed length greater than 10 characters.
- `Endpoints`: MUST contain at least one endpoint, and every endpoint MUST have a trimmed length greater than 10 characters.
- `Eligibility criteria`: MUST contain at least one criterion in total, counting inclusion and exclusion criteria together; there is no requirement to have at least one of each side. Every criterion MUST have a non-empty description and a complete deterministic rule (dimension, operator, value, and unit when required by the dimension).

#### Scenario: Next is blocked when a new-study section is invalid
- **WHEN** the user activates `Next` on a new-study section whose data violates the section's minimum-validity contract
- **THEN** the system SHALL NOT advance to the next section, SHALL surface inline validation errors describing each violation, and SHALL preserve the user's entered data

#### Scenario: Save is blocked when an edit-mode section is invalid
- **WHEN** the user activates `Save` on an edit-mode section whose data violates the section's minimum-validity contract
- **THEN** the system SHALL NOT call the backend, SHALL surface inline validation errors describing each violation, and SHALL preserve the user's entered data

#### Scenario: Eligibility criteria passes with a single inclusion-only criterion
- **WHEN** the user submits `Eligibility criteria` with exactly one inclusion criterion, zero exclusion criteria, and every other per-criterion rule satisfied
- **THEN** the system SHALL treat the `Eligibility criteria` section as valid and SHALL allow the forward action to proceed

#### Scenario: Eligibility criteria passes with a single exclusion-only criterion
- **WHEN** the user submits `Eligibility criteria` with exactly one exclusion criterion, zero inclusion criteria, and every other per-criterion rule satisfied
- **THEN** the system SHALL treat the `Eligibility criteria` section as valid and SHALL allow the forward action to proceed

#### Scenario: Eligibility criteria fails when no criteria exist
- **WHEN** the user submits `Eligibility criteria` with zero inclusion criteria and zero exclusion criteria
- **THEN** the system SHALL treat the `Eligibility criteria` section as invalid, SHALL surface an inline validation error stating at least one criterion is required, and SHALL block the forward action

#### Scenario: Study information fails with an unsupported phase
- **WHEN** the user submits `Study information` whose `phase` is not one of the supported phase values
- **THEN** the system SHALL treat the section as invalid, SHALL surface an inline validation error on the phase control, and SHALL block the forward action

### Requirement: Publish re-validates every section of the draft
The system SHALL re-run the minimum-validity contract against every section of the new-study draft before calling the backend on `Publish`. If any section is invalid, the system SHALL block the `Publish` action, SHALL indicate which sections are incomplete, and SHALL expose navigation to the first incomplete section. Publish SHALL proceed only when all sections satisfy their minimum-validity contract.

#### Scenario: Publish blocks when a section is incomplete
- **WHEN** the user activates `Publish` on the new-study `Summary` while at least one section of the draft violates its minimum-validity contract
- **THEN** the system SHALL NOT send the draft to the backend, SHALL display which sections are incomplete, and SHALL expose navigation that takes the user to the first incomplete section

#### Scenario: Publish proceeds when all sections are valid
- **WHEN** the user activates `Publish` on the new-study `Summary` and every section of the draft satisfies its minimum-validity contract
- **THEN** the system SHALL send the draft to the create-study endpoint and, on success, clear the draft and navigate to the newly created study's `Summary` in edit mode

#### Scenario: User reaches Summary via the sidebar without completing sections
- **WHEN** the user jumps directly to the new-study `Summary` via the sidebar without filling every upstream section
- **THEN** the system SHALL still present the `Publish` button, and activating `Publish` SHALL trigger the full-draft re-validation that blocks submission until the incomplete sections are fixed

### Requirement: Backend-generated study identifiers do not collide with existing records
The system SHALL generate every new study identifier on the backend using a strategy that consults the current repository state, so a newly created study SHALL NOT reuse an identifier that is already present in the repository (including seeded records and previously persisted records). Identifiers SHALL preserve the existing human-readable `study-NNNN` format, and the numeric suffix SHALL be strictly greater than the highest numeric suffix currently present in the repository at the time the study is created.

#### Scenario: First study created after boot skips seeded identifiers
- **WHEN** the backend starts with seeded studies `study-0001` and `study-0002` and a user creates a new study
- **THEN** the system SHALL assign the new study an identifier whose numeric suffix is greater than `0002` (for example `study-0003`) and SHALL NOT assign `study-0001` or `study-0002`

#### Scenario: Subsequent studies continue the sequence without gaps shrinking
- **WHEN** studies with identifiers `study-0001` through `study-0005` exist and the user creates a new study
- **THEN** the system SHALL assign an identifier whose numeric suffix is greater than `0005`

#### Scenario: Backend rejects or retries when a generated identifier would collide
- **WHEN** an identifier proposal somehow matches an already existing record at persistence time
- **THEN** the system SHALL NOT persist a duplicate identifier and SHALL either retry with the next available suffix or surface an internal error without storing the study

### Requirement: Study information uses standardized phase and therapeutic-area vocabularies
The system SHALL restrict `Study information.phase` to the closed vocabulary `Phase 1`, `Phase 2`, `Phase 3`, `Phase 4`, and SHALL restrict `Study information.therapeuticArea` to the closed vocabulary `Cardiovascular`, `Diabetes`, `Hematology`, `Sickle Cell Disease`, `Obesity`, `Rare Diseases`. Both the frontend editor and the backend validation SHALL enforce these allow-lists, and the frontend SHALL present the values as dropdowns rather than free-text inputs.

#### Scenario: User picks a phase from the dropdown
- **WHEN** the user opens the `Study information` editor
- **THEN** the `phase` control SHALL be a dropdown whose options are exactly `Phase 1`, `Phase 2`, `Phase 3`, `Phase 4`

#### Scenario: User picks a therapeutic area from the dropdown
- **WHEN** the user opens the `Study information` editor
- **THEN** the `therapeuticArea` control SHALL be a dropdown whose options are exactly `Cardiovascular`, `Diabetes`, `Hematology`, `Sickle Cell Disease`, `Obesity`, `Rare Diseases`

#### Scenario: Backend rejects unsupported phase or therapeutic area values
- **WHEN** a create-study or full-study update request arrives with a `phase` or `therapeuticArea` value outside the supported vocabularies
- **THEN** the backend SHALL reject the request with validation errors and SHALL NOT persist the study

### Requirement: Study information captures optional schedule-of-activities milestones
The system SHALL allow each study to record three optional schedule-of-activities (SOA) milestone dates on `Study information`: `firstPatientFirstVisit` (FPFV), `lastPatientFirstVisit` (LPFV), and `protocolApprovalDate`. Each field SHALL accept an ISO-8601 calendar date (`YYYY-MM-DD`) or be left empty. A study SHALL remain valid when any, all, or none of these fields are empty.

#### Scenario: User saves study information without any SOA dates
- **WHEN** the user submits `Study information` with all three SOA milestone fields left empty and every other required field valid
- **THEN** the system SHALL accept the submission and persist the study with the SOA milestones stored as empty values

#### Scenario: User saves study information with partial SOA dates
- **WHEN** the user submits `Study information` with a value for `firstPatientFirstVisit` only and the other two SOA fields left empty
- **THEN** the system SHALL accept the submission and persist the study with only `firstPatientFirstVisit` set

#### Scenario: Backend rejects malformed SOA date values
- **WHEN** a create-study or full-study update request arrives with an SOA milestone value that is not an ISO-8601 calendar date
- **THEN** the backend SHALL reject the request with a validation error naming the offending field and SHALL NOT persist the study

### Requirement: Section screens delegate the title composition to the app shell header
The system SHALL render the combined study-and-section title in the app shell header only, using the composition `<studyId> > <section>` for existing studies (for example `study-0002 > Summary`) and `New study > <section>` while a new-study draft is active. Each dedicated section screen (`Study information`, `Objectives`, `Endpoints`, `Eligibility criteria`, `Summary`) SHALL NOT render its own top-level heading that repeats the active study identifier or the section name, so there is a single title per page owned by the shell.

#### Scenario: Header composes study identifier and section name for an existing study
- **WHEN** the user opens any section screen (`Summary`, `Study information`, `Objectives`, `Endpoints`, or `Eligibility criteria`) for an existing study
- **THEN** the app shell header SHALL render the title as `<studyId> > <section>` and the section screen body SHALL NOT render a heading that duplicates either the study identifier or the section name

#### Scenario: Header composes New study with section name in the wizard
- **WHEN** the user opens any section screen within the new-study flow
- **THEN** the app shell header SHALL render the title as `New study > <section>` and the section screen body SHALL NOT render a heading that duplicates either `New study` or the section name

### Requirement: Eligibility criteria editor renders compact rows with auto-resolved unit
The system SHALL render each eligibility criterion on the `Eligibility criteria` screen as a single compact table row with two columns: `Description` and `Criteria`. The `Criteria` column SHALL render the deterministic rule parts inline as three editable controls (dimension, operator, value) without visible field labels, using placeholders only. The `Unit` SHALL NOT be directly editable in the row: the system SHALL derive the unit from the selected dimension's registered allowed unit and render it as a read-only adornment next to the value. Until a dimension is selected for a row, the system SHALL hide the unit adornment and SHALL display placeholders in every rule control. The full description of the selected dimension (for example `LVEF: left ventricular ejection fraction`) SHALL be exposed only through a tooltip shown on hover or keyboard focus of the dimension control, not inline in the row.

#### Scenario: Newly added row shows placeholders and no unit
- **WHEN** the user adds a new inclusion or exclusion criterion
- **THEN** the new row SHALL display a placeholder in the `Description` column, placeholders for dimension, operator, and value in the `Criteria` column, and SHALL NOT display a unit until a dimension is selected

#### Scenario: Unit is derived from the dimension
- **WHEN** the user selects a dimension on a criterion row
- **THEN** the row SHALL display the dimension's registered unit as a read-only adornment next to the value control and the user SHALL NOT be able to edit it directly

#### Scenario: Dimension description is available via tooltip only
- **WHEN** the user hovers or focuses the dimension control for a criterion row
- **THEN** the system SHALL reveal the dimension's full description through a tooltip and SHALL NOT render that description inline as persistent row content

#### Scenario: Criteria render as a table
- **WHEN** the user opens the `Eligibility criteria` screen with one or more criteria
- **THEN** the system SHALL render the criteria as a table whose columns are exactly `Description` and `Criteria`, one row per criterion

