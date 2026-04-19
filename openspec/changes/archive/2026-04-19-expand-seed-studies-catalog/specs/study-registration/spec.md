## MODIFIED Requirements

### Requirement: Application starts with mock study data
The system MUST seed deterministic mock study data at application startup to support demos and local testing. The seeded catalog MUST cover every supported `therapeuticArea` value at least once so that the `StudyHub assistant` and the `All studies` view always have a non-trivial set of reference studies to draw from. Every seeded study MUST satisfy the `Eligibility criteria` minimum-validity contract (at least one criterion in total, each criterion with a non-empty description and a complete deterministic rule whose dimension is registered and whose unit matches the dimension's registered allowed units, or is empty when the registered dimension declares no allowed units).

#### Scenario: Backend starts with seeded records
- **WHEN** the backend service starts
- **THEN** at least one mock clinical study SHALL be available through the read endpoints without requiring prior manual creation

#### Scenario: Seed catalog covers every supported therapeutic area
- **WHEN** the backend service starts
- **THEN** the seeded studies SHALL include at least one study for each value in the closed `therapeuticArea` vocabulary (`Cardiovascular`, `Diabetes`, `Hematology`, `Sickle Cell Disease`, `Obesity`, `Rare Diseases`, `Oncology`, `Neurology`)

#### Scenario: Seeded studies form a contiguous identifier sequence
- **WHEN** the backend service starts with the seeded catalog
- **THEN** the seeded study identifiers SHALL follow the `study-NNNN` format, start at `study-0001`, be strictly increasing, contain no gaps, and contain no duplicates

#### Scenario: Every seeded criterion resolves against the dimension registry
- **WHEN** the backend service starts with the seeded catalog
- **THEN** every inclusion or exclusion criterion across the seeded studies SHALL carry a `dimensionId` that resolves via the eligibility dimension registry and a `unit` value that is either empty (when the registered dimension declares no allowed units) or one of the dimension's registered allowed units

### Requirement: Eligibility dimensions come from a declarative registry
The system MUST provide supported eligibility dimensions from a declarative registry that includes an identifier, display name, full description for hover or tooltip content, and the set of allowed units for that dimension. A dimension MAY declare an empty allowed-units set to indicate it has no unit (for example a performance-status score or a cognitive-screening score). The registry SHALL be the single source of truth consulted by both the eligibility validation path and the `Eligibility criteria` editor, and SHALL cover at least the clinical categories needed by the seeded catalog: demographics / anthropometrics, vital signs, metabolic, renal, hepatic, hematology, cardiac, and performance / cognitive.

#### Scenario: User opens the eligibility criteria editor
- **WHEN** the user loads the eligibility criteria section
- **THEN** the system SHALL provide the supported dimensions and their metadata for selection and display

#### Scenario: Team adds a new supported dimension
- **WHEN** a developer adds a new dimension entry to the registry
- **THEN** the system SHALL make that dimension available to validation and UI rendering without requiring rule-specific code changes

#### Scenario: Dimension registry supports unitless dimensions
- **WHEN** the registry contains a dimension whose allowed-units list is empty
- **THEN** that dimension SHALL be selectable in the `Eligibility criteria` editor, the editor SHALL NOT render a unit adornment for criteria using it, and the validation path SHALL accept such criteria when their `unit` field is the empty string

#### Scenario: Registry includes the baseline clinical categories consumed by seeds
- **WHEN** the backend service starts
- **THEN** the eligibility dimension registry SHALL include at minimum one dimension per clinical category needed by the seeded catalog — demographics / anthropometrics, vital signs, metabolic, renal, hepatic, hematology, cardiac, and performance / cognitive — so every seeded criterion can reference a registered dimension

### Requirement: Section screens enforce a minimum-validity contract before advancing or saving
The system SHALL define a minimum-validity contract per section and SHALL enforce it before any forward action that commits or advances the section data. In new-study mode, the `Next` button SHALL block advancement when the current section is invalid; in edit mode, the `Save` button SHALL block the backend call when the current section is invalid. Invalid submissions SHALL render inline validation messages next to the offending fields without clearing entered data.

The minimum-validity contract per section:
- `Study information`: `phase` MUST be one of the supported phase values (`Phase 1`, `Phase 2`, `Phase 3`, `Phase 4`); `therapeuticArea` MUST be one of the supported therapeutic-area values (`Cardiovascular`, `Diabetes`, `Hematology`, `Sickle Cell Disease`, `Obesity`, `Rare Diseases`, `Oncology`, `Neurology`); `patientPopulation` MUST be non-empty after trimming; `studyType` MUST be one of the supported values; `participants` MUST be an integer greater than or equal to 1; `numberOfArms` MUST be an integer greater than or equal to 1. The SOA milestone fields `firstPatientFirstVisit`, `lastPatientFirstVisit`, and `protocolApprovalDate` MAY each be left empty; when provided, each MUST be a valid ISO-8601 calendar date.
- `Objectives`: MUST contain at least one objective, and every objective MUST have a trimmed length greater than 10 characters.
- `Endpoints`: MUST contain at least one endpoint, and every endpoint MUST have a trimmed length greater than 10 characters.
- `Eligibility criteria`: MUST contain at least one criterion in total, counting inclusion and exclusion criteria together; there is no requirement to have at least one of each side. Every criterion MUST have a non-empty description and a complete deterministic rule. The rule SHALL contain a `dimensionId` that resolves via the eligibility dimension registry, an `operator`, a `value`, and a `unit` that is either empty (when the resolved dimension declares no allowed units) or one of the dimension's registered allowed units.

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

#### Scenario: Eligibility criteria passes with a unitless dimension criterion
- **WHEN** the user submits an eligibility criterion whose resolved dimension declares no allowed units and whose `unit` field is the empty string, with every other rule part present
- **THEN** the system SHALL treat the criterion as valid and SHALL NOT require a non-empty unit for that dimension

#### Scenario: Eligibility criteria fails when a unit does not match the dimension
- **WHEN** the user submits an eligibility criterion whose `unit` is non-empty but is not one of the resolved dimension's registered allowed units
- **THEN** the system SHALL treat the criterion as invalid, SHALL surface an inline validation error on the unit resolution, and SHALL block the forward action

### Requirement: Study information uses standardized phase and therapeutic-area vocabularies
The system SHALL restrict `Study information.phase` to the closed vocabulary `Phase 1`, `Phase 2`, `Phase 3`, `Phase 4`, and SHALL restrict `Study information.therapeuticArea` to the closed vocabulary `Cardiovascular`, `Diabetes`, `Hematology`, `Sickle Cell Disease`, `Obesity`, `Rare Diseases`, `Oncology`, `Neurology`. Both the frontend editor and the backend validation SHALL enforce these allow-lists, and the frontend SHALL present the values as dropdowns rather than free-text inputs. The backend `domain.AllowedTherapeuticAreas` list and the frontend `THERAPEUTIC_AREA_OPTIONS` constant SHALL remain identical in membership and order.

#### Scenario: User picks a phase from the dropdown
- **WHEN** the user opens the `Study information` editor
- **THEN** the `phase` control SHALL be a dropdown whose options are exactly `Phase 1`, `Phase 2`, `Phase 3`, `Phase 4`

#### Scenario: User picks a therapeutic area from the dropdown
- **WHEN** the user opens the `Study information` editor
- **THEN** the `therapeuticArea` control SHALL be a dropdown whose options are exactly `Cardiovascular`, `Diabetes`, `Hematology`, `Sickle Cell Disease`, `Obesity`, `Rare Diseases`, `Oncology`, `Neurology`

#### Scenario: Backend rejects unsupported phase or therapeutic area values
- **WHEN** a create-study or full-study update request arrives with a `phase` or `therapeuticArea` value outside the supported vocabularies
- **THEN** the backend SHALL reject the request with validation errors and SHALL NOT persist the study

#### Scenario: Frontend and backend therapeutic-area lists stay aligned
- **WHEN** the frontend dropdown options and the backend allow-list are loaded at runtime
- **THEN** the two lists SHALL contain the same set of values in the same order so that any dropdown selection is accepted by the backend and any backend-accepted value has a corresponding dropdown entry

### Requirement: Backend-generated study identifiers do not collide with existing records
The system SHALL generate every new study identifier on the backend using a strategy that consults the current repository state, so a newly created study SHALL NOT reuse an identifier that is already present in the repository (including seeded records and previously persisted records). Identifiers SHALL preserve the existing human-readable `study-NNNN` format, and the numeric suffix SHALL be strictly greater than the highest numeric suffix currently present in the repository at the time the study is created.

#### Scenario: First study created after boot skips seeded identifiers
- **WHEN** the backend starts with the seeded catalog and a user creates a new study
- **THEN** the system SHALL assign the new study an identifier whose numeric suffix is strictly greater than the highest numeric suffix present in the seeded catalog and SHALL NOT assign any identifier already present in the catalog

#### Scenario: Subsequent studies continue the sequence without gaps shrinking
- **WHEN** studies with identifiers up to `study-NNNN` exist and the user creates a new study
- **THEN** the system SHALL assign an identifier whose numeric suffix is strictly greater than `NNNN`

#### Scenario: Backend rejects or retries when a generated identifier would collide
- **WHEN** an identifier proposal somehow matches an already existing record at persistence time
- **THEN** the system SHALL NOT persist a duplicate identifier and SHALL either retry with the next available suffix or surface an internal error without storing the study
