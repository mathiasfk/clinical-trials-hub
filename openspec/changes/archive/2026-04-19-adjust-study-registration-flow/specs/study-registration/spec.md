## ADDED Requirements

### Requirement: Users can navigate studies from an All studies home
The system SHALL present `All studies` as the default home view for study registration workflows and list all studies with basic summary information needed for selection.

#### Scenario: User opens the study workspace home
- **WHEN** the user opens the application
- **THEN** the system SHALL show the `All studies` view with the registered studies available in the current runtime

#### Scenario: User reviews study summary information in the list
- **WHEN** the system renders the `All studies` view
- **THEN** each study entry SHALL show enough basic information to help the user choose a study to inspect

### Requirement: Users can navigate a study through a sidebar workspace
The system SHALL provide a study-centered workspace with sidebar navigation, where `Summary` is the default section for a selected study.

#### Scenario: User opens a study from All studies
- **WHEN** the user selects a study from the `All studies` view
- **THEN** the system SHALL open that study in its workspace and show `Summary` as the initial section

#### Scenario: User changes study sections from the sidebar
- **WHEN** the user selects `Summary` or `Eligibility criteria` from the study sidebar
- **THEN** the system SHALL navigate to the requested section for the current study

### Requirement: Users can edit eligibility criteria from summary
The system SHALL provide an edit action for eligibility criteria from the study summary that opens the dedicated `Eligibility criteria` section.

#### Scenario: User edits eligibility criteria from summary
- **WHEN** the user activates the eligibility criteria edit action from `Summary`
- **THEN** the system SHALL navigate to the `Eligibility criteria` section for that study

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

## MODIFIED Requirements

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
