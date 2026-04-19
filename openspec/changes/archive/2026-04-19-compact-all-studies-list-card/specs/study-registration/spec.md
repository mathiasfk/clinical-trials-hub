## MODIFIED Requirements

### Requirement: Users can navigate studies from an All studies home
The system SHALL present `All studies` as the default landing view for the application, list all registered studies with compact summary cards suitable for scanning many studies at once, and provide an explicit action to start registering a new study. Each study card SHALL be a single link that navigates to that study's `Summary` and SHALL render the study's attributes across two content lines plus a metadata footer:

1. An identity line that shows the study ID as the primary text with the phase rendered as an inline pill immediately next to it.
2. A clinical line that shows the therapeutic area followed by a visible separator and the patient population on the same line; the separator SHALL be omitted when either value is absent.
3. A metadata footer that shows the study type, the participant count, the number of arms, the total number of eligibility criteria (inclusion plus exclusion), and — only when the study has a `firstPatientFirstVisit` value — an `FPFV <date>` entry using the acronym `FPFV` as the short label. The footer SHALL use small, muted text and SHALL wrap gracefully on narrow viewports.

The card SHALL NOT stack the phase, study ID, therapeutic area, and patient population onto separate lines. The card SHALL preserve its existing affordance as a single clickable region (border, rounded corners, hover state) and SHALL NOT expose secondary controls beyond the link target.

#### Scenario: User opens the application
- **WHEN** the user opens the application at the root path
- **THEN** the system SHALL render the `All studies` view as the default landing view with the persistent app shell visible

#### Scenario: User reviews study summary information in the list
- **WHEN** the system renders the `All studies` view
- **THEN** each study card SHALL render the study ID and phase pill together on the identity line, the therapeutic area and patient population together on the clinical line separated by a visible separator, and the study type, participant count, number of arms, and total eligibility criteria count together in a metadata footer

#### Scenario: User scans a study whose therapeutic area or patient population is missing
- **WHEN** the system renders a study card whose therapeutic area or patient population is empty
- **THEN** the card SHALL render the remaining value on the clinical line without displaying the separator, and SHALL NOT render a placeholder like `Not set`

#### Scenario: User scans a study with a First patient, first visit milestone set
- **WHEN** the system renders a study card whose `firstPatientFirstVisit` value is present
- **THEN** the metadata footer SHALL include an entry using the short label `FPFV` followed by the milestone value

#### Scenario: User scans a study with no First patient, first visit milestone set
- **WHEN** the system renders a study card whose `firstPatientFirstVisit` value is empty
- **THEN** the metadata footer SHALL NOT render an `FPFV` entry and SHALL NOT render a placeholder like `Not set`

#### Scenario: User starts registering a new study from the list
- **WHEN** the user activates the new-study action on `All studies`
- **THEN** the system SHALL enter the new-study registration flow with the persistent app shell visible and the first section editor shown
