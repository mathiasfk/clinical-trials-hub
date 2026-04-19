## MODIFIED Requirements

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
- **THEN** the screen header SHALL display the selected study identifier (or a "New study" indicator for an unpublished draft) together with the name of the active subsection

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

## ADDED Requirements

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
- `Study information`: `phase`, `therapeuticArea`, `patientPopulation` MUST be non-empty after trimming; `studyType` MUST be one of the supported values; `participants` MUST be an integer greater than or equal to 1; `numberOfArms` MUST be an integer greater than or equal to 1.
- `Objectives`: MUST contain at least one objective, and every objective MUST have a trimmed length greater than 10 characters.
- `Endpoints`: MUST contain at least one endpoint, and every endpoint MUST have a trimmed length greater than 10 characters.
- `Eligibility criteria`: MUST contain at least one inclusion criterion and at least one exclusion criterion; every criterion MUST have a non-empty description and a complete deterministic rule (dimension, operator, value, and unit when required by the dimension).

#### Scenario: Next is blocked when a new-study section is invalid
- **WHEN** the user activates `Next` on a new-study section whose data violates the section's minimum-validity contract
- **THEN** the system SHALL NOT advance to the next section, SHALL surface inline validation errors describing each violation, and SHALL preserve the user's entered data

#### Scenario: Save is blocked when an edit-mode section is invalid
- **WHEN** the user activates `Save` on an edit-mode section whose data violates the section's minimum-validity contract
- **THEN** the system SHALL NOT call the backend, SHALL surface inline validation errors describing each violation, and SHALL preserve the user's entered data

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
