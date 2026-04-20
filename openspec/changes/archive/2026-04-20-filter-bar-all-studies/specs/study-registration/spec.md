## ADDED Requirements

### Requirement: All studies exposes a filter bar for narrowing the study list
The system SHALL render a filter bar on the `All studies` view positioned between the panel header and the list of study cards. The filter bar SHALL expose four filter controls, in this order, each with a visible label:

1. `Study ID`: a free-text input that filters the list to studies whose identifier contains the trimmed input as a case-insensitive substring. An empty input SHALL NOT constrain the list.
2. `Therapeutic area`: a single-select dropdown whose options are exactly the `therapeuticArea` closed vocabulary (`Cardiovascular`, `Diabetes`, `Hematology`, `Sickle Cell Disease`, `Obesity`, `Rare Diseases`, `Oncology`, `Neurology`) preceded by an `All` option. Selecting `All` SHALL NOT constrain the list; selecting any other value SHALL restrict the list to studies whose `therapeuticArea` equals the selected value.
3. `Phase`: a single-select dropdown whose options are exactly the `phase` closed vocabulary (`Phase 1`, `Phase 2`, `Phase 3`, `Phase 4`) preceded by an `All` option. Selecting `All` SHALL NOT constrain the list; selecting any other value SHALL restrict the list to studies whose `phase` equals the selected value.
4. `Study type`: a single-select dropdown whose options are exactly the supported `StudyType` values (`parallel`, `crossover`, `single-arm`) preceded by an `All` option. Selecting `All` SHALL NOT constrain the list; selecting any other value SHALL restrict the list to studies whose `studyType` equals the selected value.

The filter bar's controls SHALL combine using AND semantics: a study SHALL be rendered only when it satisfies every currently active filter. Filters set to `All` (for dropdowns) or to an empty string (for the `Study ID` input) SHALL be considered inactive and SHALL NOT constrain the list. Filter state SHALL be local to the `All studies` view and SHALL reset when the user navigates away and back.

#### Scenario: User opens All studies and sees the filter bar
- **WHEN** the user opens the `All studies` view
- **THEN** the system SHALL render the filter bar above the list of study cards with the four controls (`Study ID`, `Therapeutic area`, `Phase`, `Study type`), each dropdown defaulted to `All` and the `Study ID` input defaulted to empty, so that every registered study appears in the list

#### Scenario: User filters by Study ID substring
- **WHEN** the user types a non-empty value into the `Study ID` input on the `All studies` view
- **THEN** the list SHALL render only studies whose identifier contains the trimmed input as a case-insensitive substring, and SHALL update on every keystroke without requiring a submit action

#### Scenario: User filters by therapeutic area
- **WHEN** the user selects a therapeutic area other than `All` from the `Therapeutic area` dropdown on the `All studies` view
- **THEN** the list SHALL render only studies whose `therapeuticArea` equals the selected value

#### Scenario: User filters by phase
- **WHEN** the user selects a phase other than `All` from the `Phase` dropdown on the `All studies` view
- **THEN** the list SHALL render only studies whose `phase` equals the selected value

#### Scenario: User filters by study type
- **WHEN** the user selects a study type other than `All` from the `Study type` dropdown on the `All studies` view
- **THEN** the list SHALL render only studies whose `studyType` equals the selected value

#### Scenario: Filters combine with AND semantics
- **WHEN** the user has set two or more filters to non-`All` (or non-empty) values on the `All studies` view
- **THEN** the list SHALL render only studies that satisfy every active filter simultaneously

#### Scenario: Selecting All clears a single filter
- **WHEN** the user changes a previously selected dropdown back to `All` on the `All studies` view
- **THEN** that filter SHALL no longer constrain the list, while the remaining active filters SHALL continue to apply

#### Scenario: Emptying the Study ID input clears the ID filter
- **WHEN** the user clears the `Study ID` input on the `All studies` view
- **THEN** the study-ID filter SHALL no longer constrain the list, while the remaining active filters SHALL continue to apply

### Requirement: All studies count badge reflects filter state
The system SHALL update the `All studies` panel count badge to communicate filter results. When no filter is active, the badge SHALL read `<total> studies`, where `<total>` is the number of studies returned by the list endpoint. When at least one filter is active, the badge SHALL read `<matching> of <total> studies`, where `<matching>` is the number of studies currently rendered after filtering.

#### Scenario: Badge shows total count when no filter is active
- **WHEN** the user is on `All studies` with no filter active
- **THEN** the count badge SHALL read `<total> studies`, where `<total>` is the total number of registered studies

#### Scenario: Badge shows matching-of-total when a filter is active
- **WHEN** the user is on `All studies` with at least one active filter
- **THEN** the count badge SHALL read `<matching> of <total> studies`, where `<matching>` is the number of studies rendered after filtering and `<total>` is the total number of registered studies

### Requirement: All studies exposes a Clear filters affordance
The system SHALL render a `Clear filters` action at the trailing end of the filter bar on the `All studies` view whenever at least one filter is active. Activating `Clear filters` SHALL reset the `Study ID` input to an empty string and each dropdown (`Therapeutic area`, `Phase`, `Study type`) to its `All` value, restoring the unfiltered list. The `Clear filters` action SHALL NOT be rendered when no filter is active.

#### Scenario: Clear filters is hidden when no filter is active
- **WHEN** the user is on `All studies` and every filter control is in its default state
- **THEN** the filter bar SHALL NOT render the `Clear filters` action

#### Scenario: Clear filters appears when a filter becomes active
- **WHEN** the user sets any filter on `All studies` to a non-default value
- **THEN** the filter bar SHALL render the `Clear filters` action at its trailing end

#### Scenario: Clear filters resets every filter
- **WHEN** the user activates `Clear filters` on `All studies`
- **THEN** the system SHALL reset the `Study ID` input to empty and the three dropdowns to `All`, SHALL render the full unfiltered list, and SHALL stop rendering the `Clear filters` action

### Requirement: All studies renders a distinct filtered-empty state
The system SHALL render a dedicated empty state on `All studies` when at least one study is registered but no study matches the currently active filters. This filtered-empty state SHALL be visually and textually distinct from the existing "no studies registered yet" state and from the loading state, and SHALL prompt the user to adjust or clear filters (for example `No studies match the current filters.`).

#### Scenario: User filters out every study
- **WHEN** the user is on `All studies` with at least one registered study and sets filters such that no study satisfies every active filter
- **THEN** the system SHALL render the filtered-empty state message and SHALL NOT render the "no studies available yet" message

#### Scenario: User clears filters from the filtered-empty state
- **WHEN** the user activates `Clear filters` from the filtered-empty state on `All studies`
- **THEN** the system SHALL restore the full unfiltered list and SHALL stop rendering the filtered-empty state

#### Scenario: No-studies-yet state still wins when the catalog is empty
- **WHEN** the user is on `All studies` and the list endpoint has returned zero studies
- **THEN** the system SHALL render the existing "no studies available yet" state and SHALL NOT render the filtered-empty state, regardless of filter values
