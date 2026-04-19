## Why

The MVP study registration and editing flow has rough edges that hurt perceived quality and data integrity: typography feels heavy and inconsistent, study IDs are generated from a counter that can collide with existing records, section screens duplicate titles already shown in the header, free-text fields that should be standardized (phase, therapeutic area) are not, schedule-of-activities milestones (FPFV, LPFV, protocol approval date) are missing, and the eligibility criteria editor is verbose with redundant labels, editable units, and inline dimension descriptions. This change polishes these points so the product looks and behaves like a professional clinical trial tool.

## What Changes

- Reduce and standardize typography scale across the app for a lighter, more minimalist, professional look.
- **BREAKING** Change backend study ID generation to always produce the next available non-colliding identifier based on the current repository state (no reliance on a process-local counter that can collide with seeded or previously persisted records).
- Remove redundant per-screen section titles; the app header SHALL render the active study and subsection together (e.g., `study-0002 > Summary`, `study-0002 > Objectives`) and each section screen SHALL NOT repeat that title.
- Add standardized dropdowns for `Study information`:
  - `Phase`: `Phase 1`, `Phase 2`, `Phase 3`, `Phase 4`.
  - `Therapeutic area`: `Cardiovascular`, `Diabetes`, `Hematology`, `Sickle Cell Disease`, `Obesity`, `Rare Diseases`.
- Add optional schedule-of-activities (SOA) milestone dates to `Study information`: `First patient first visit (FPFV)`, `Last patient first visit (LPFV)`, `Protocol approval date`. All three MAY be left blank.
- **BREAKING** Change the eligibility criteria minimum-validity contract: require at least one criterion in total across inclusion and exclusion (previously required at least one inclusion AND at least one exclusion).
- Redesign the eligibility criteria editor:
  - Render each criterion as a single compact table row with two columns: `Description` and `Criteria` (rule parts inline).
  - Drop visible field labels (`Dimension`, `Operator`, `Value`, `Unit`) in favor of placeholders only.
  - On a newly added row show placeholders for every field (Dimension, Operator, Value).
  - Derive the `Unit` automatically from the selected dimension and render it as read-only; hide the unit control until a dimension is selected.
  - Show the dimension's full description (e.g., `LVEF: left ventricular ejection fraction`) only through a hover tooltip on the dimension name, not inline.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `study-registration`: Updates header title composition, section screen titles, `Study information` field set (phase/therapeutic-area vocabularies, SOA milestones), eligibility minimum-validity contract, eligibility editor presentation, and backend study ID generation to avoid collisions.

## Impact

- Frontend global CSS: typography scale adjustments.
- Frontend `ContentHeader`: renders combined `<studyId> > <section>` title.
- Frontend section screens (`StudyInformationScreen`, `ObjectivesScreen`, `EndpointsScreen`, `EligibilityCriteriaScreen`, `SummaryScreen`): remove redundant headings.
- Frontend `StudyInformationScreen`: new controlled dropdowns for phase and therapeutic area, three optional date inputs for SOA milestones.
- Frontend `EligibilityEditor` and `eligibilityDrafts`: new compact table layout, auto unit resolution from dimension, dimension tooltip.
- Frontend `sections/validation.ts`: relaxed eligibility minimum to "at least one criterion total".
- Shared types (`frontend/src/types.ts`) and backend `domain.Study`: add optional SOA date fields; constrain `phase` and `therapeuticArea` allowed values at validation time.
- Backend `service.IDGenerator` and `StudyService.CreateStudy`: ID generation based on current repository contents to avoid collisions.
- Seed data and automated tests updated to reflect the new fields, dropdown values, relaxed eligibility rule, and ID generation behavior.
