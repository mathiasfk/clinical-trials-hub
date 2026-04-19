## 1. Backend Domain and Validation

- [x] 1.1 Add optional SOA milestone fields (`firstPatientFirstVisit`, `lastPatientFirstVisit`, `protocolApprovalDate`) as ISO-8601 date strings to `domain.Study` and `domain.StudyCreateInput`, wiring them through JSON tags, normalization, and validation (accept empty; reject malformed dates).
- [x] 1.2 Define closed vocabularies for `phase` and `therapeuticArea` in the domain layer and enforce them in `normalizeAndValidateCreateInput` (and any shared validation paths used by full-study update), returning field-level validation errors when values are outside the allow-lists.
- [x] 1.3 Update the eligibility aggregate validation so a study is valid when it has at least one criterion in total across inclusion and exclusion (remove the "at least one of each side" rule), keeping per-criterion rule validation intact.
- [x] 1.4 Update `bootstrap.SeedStudies` so seed studies populate the new SOA date fields (some set, some empty) and use allowed phase/therapeutic-area values.

## 2. Backend ID Generation

- [x] 2.1 Replace `service.NewSequentialIDGenerator(prefix)` with a repository-aware generator that, at create time, inspects the current study repository, finds the highest existing `study-NNNN` suffix, and returns the next suffix that is not already present.
- [x] 2.2 Update `StudyService.CreateStudy` (and wiring in `cmd/api` and any test helpers) to use the new generator signature, ensuring the generator has access to the repository.
- [x] 2.3 Add or update backend tests to cover: (a) new study ID skips seeded suffixes, (b) consecutive creates continue to increment past the highest existing suffix, (c) collisions at persistence time are not introduced.

## 3. Backend HTTP and Tests

- [x] 3.1 Update create-study and full-study update HTTP tests to assert new SOA fields round-trip and that invalid phase/therapeutic-area/SOA-date values produce 400 responses with field-level validation errors.
- [x] 3.2 Run `go test ./...` for the backend and fix any regressions surfaced by the new validation and generator behavior.

## 4. Shared Types and Frontend Data

- [x] 4.1 Update `frontend/src/types.ts` so `Study`, `StudyCreateInput`, and any derived form types include the three optional SOA date fields.
- [x] 4.2 Extend `frontend/src/sections/constants.ts` (or an appropriate shared module) with the phase and therapeutic-area allow-lists and expose helpers for rendering dropdown options.
- [x] 4.3 Ensure all frontend draft/form state (`newStudy/draftState`, section screens, summary cards) initializes and persists the new SOA fields without breaking existing flows.

## 5. Frontend Shell and Typography

- [x] 5.1 Reduce and standardize the global typography scale in `index.css`/`App.css` to a lighter, more minimalist, professional look (define a consistent font-size scale for headings, body text, form labels, and helper text).
- [x] 5.2 Update `ContentHeader` so it renders a single combined title `<studyId> > <section>` for existing studies and `New study > <section>` for drafts, removing the stacked eyebrow/subtitle composition for study contexts.
- [x] 5.3 Remove redundant top-level headings from `SummaryScreen`, `StudyInformationScreen`, `ObjectivesScreen`, `EndpointsScreen`, and `EligibilityCriteriaScreen` so each page renders only the shell-owned H1.

## 6. Frontend Study Information Editor

- [x] 6.1 Replace the free-text `phase` input with a dropdown backed by the shared allow-list constants.
- [x] 6.2 Replace the free-text `therapeuticArea` input with a dropdown backed by the shared allow-list constants.
- [x] 6.3 Add three optional date inputs (FPFV, LPFV, Protocol approval date) to the study information editor, wired to the draft state, that accept blank values and enforce a calendar-date format on the input.
- [x] 6.4 Update the frontend minimum-validity check for `Study information` so the SOA milestones stay optional and phase/therapeutic-area are validated against the allow-lists.

## 7. Frontend Eligibility Editor

- [x] 7.1 Refactor `EligibilityEditor` to render criteria as a two-column table (`Description` | `Criteria`) with one row per criterion, removing the stacked card/label layout.
- [x] 7.2 Remove visible field labels for `Dimension`, `Operator`, `Value`, and `Unit` in favor of placeholders on each control; show placeholders on newly added rows.
- [x] 7.3 Derive the criterion unit from the selected dimension's registry entry, render it as a read-only adornment next to the value control, and hide it until a dimension is selected.
- [x] 7.4 Expose the dimension's full description (e.g., `LVEF: left ventricular ejection fraction`) only through an accessible tooltip on hover or keyboard focus of the dimension control; remove any inline description rendering.
- [x] 7.5 Update the frontend validation in `sections/validation.ts` (and any consumers) to require at least one criterion in total across inclusion and exclusion, keeping per-criterion rule checks intact.

## 8. Frontend Tests and Verification

- [x] 8.1 Update `sections/validation.test.ts` and affected component tests to reflect: combined header title, removed section headings, new dropdowns, optional SOA dates, relaxed eligibility aggregate, auto-resolved unit, and tooltip-only dimension description.
- [x] 8.2 Run `pnpm test` (and any existing lint/type-check scripts) for the frontend and fix any regressions.

## 9. Docs and Final Checks

- [x] 9.1 Update any README or in-repo docs that reference the old phase/therapeutic-area guidance, study ID generation behavior, or eligibility "one of each side" rule.
- [x] 9.2 Run `openspec validate polish-study-registration-flow` and confirm the change is ready to archive.
