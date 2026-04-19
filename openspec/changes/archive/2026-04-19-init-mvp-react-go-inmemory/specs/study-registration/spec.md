## ADDED Requirements

### Requirement: Users can register clinical studies with required MVP fields
The system SHALL allow users to create a clinical study registration record containing objectives, endpoints, inclusion and exclusion criteria, number of participants, study type, number of arms, phase, therapeutic area, and patient population.

#### Scenario: User creates a study with complete registration data
- **WHEN** the user submits a study registration payload with all required MVP fields
- **THEN** the system SHALL persist the study record and return the created study representation

#### Scenario: User submits incomplete study registration data
- **WHEN** the user submits a study registration payload missing one or more required MVP fields
- **THEN** the system SHALL reject the request with validation errors describing missing or invalid fields

### Requirement: Study registration supports structured criteria and endpoint lists
The system MUST support multiple objectives, endpoints, inclusion criteria, and exclusion criteria per study.

#### Scenario: User submits multiple objectives and endpoints
- **WHEN** the user includes multiple objective and endpoint entries in the registration payload
- **THEN** the system SHALL store and return them as ordered collections associated with the study

#### Scenario: User submits multiple inclusion and exclusion criteria
- **WHEN** the user includes multiple inclusion and exclusion criteria in the registration payload
- **THEN** the system SHALL store and return them as separate collections associated with the study

### Requirement: Users can retrieve registered studies
The system SHALL provide read access for registered studies for MVP verification and usage.

#### Scenario: User lists studies
- **WHEN** the user requests the study list endpoint
- **THEN** the system SHALL return all registered studies available in the current runtime

#### Scenario: User retrieves a single study by identifier
- **WHEN** the user requests a specific study by ID
- **THEN** the system SHALL return the matching study if it exists, or a not-found response otherwise

### Requirement: Application starts with mock study data
The system MUST seed deterministic mock study data at application startup to support demos and local testing.

#### Scenario: Backend starts with seeded records
- **WHEN** the backend service starts
- **THEN** at least one mock clinical study SHALL be available through the read endpoints without requiring prior manual creation
