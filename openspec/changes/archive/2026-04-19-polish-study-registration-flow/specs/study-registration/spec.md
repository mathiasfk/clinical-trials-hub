## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Users can register clinical studies with required MVP fields
The system SHALL allow users to create a clinical study registration record containing objectives, endpoints, inclusion and exclusion criteria, number of participants, study type, number of arms, phase, therapeutic area, patient population, and the optional schedule-of-activities milestone dates `firstPatientFirstVisit`, `lastPatientFirstVisit`, and `protocolApprovalDate`.

#### Scenario: User creates a study with complete registration data
- **WHEN** the user submits a study registration payload with all required MVP fields and any subset (including all or none) of the optional SOA milestone dates
- **THEN** the system SHALL persist the study record and return the created study representation

#### Scenario: User submits incomplete study registration data
- **WHEN** the user submits a study registration payload missing one or more required MVP fields
- **THEN** the system SHALL reject the request with validation errors describing missing or invalid fields

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
