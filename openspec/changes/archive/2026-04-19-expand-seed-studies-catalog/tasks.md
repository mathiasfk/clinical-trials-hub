## 1. Audit existing validation and registry behavior

- [x] 1.1 Re-read `backend/internal/domain/eligibility.go` to confirm the current `DimensionDefinition` shape, the `EligibilityDimensions()` exporter, and the `LookupEligibilityDimension` case-insensitive matcher.
- [x] 1.2 Re-read `backend/internal/service/study_service.go` and its tests to identify every place a criterion's `dimensionId` / `operator` / `value` / `unit` is validated. Record whether a unitless dimension (empty `AllowedUnits`) is currently accepted with an empty `unit` string, and whether a non-empty `unit` on a unitless dimension is explicitly rejected.
- [x] 1.3 Re-read `frontend/src/sections/validation.ts` and `frontend/src/sections/EligibilityEditor.tsx` to confirm the same unit-handling path on the frontend: does an empty allowed-units list currently render without a unit adornment, is the empty `unit` string accepted by the minimum-validity contract, and is a non-empty `unit` on a unitless dimension rejected?
- [x] 1.4 Write a short note (PR description or task comment) summarizing whether any narrow validation tweak is needed to accept unitless dimensions symmetrically on backend and frontend. If the current code already tolerates them cleanly, tasks 4.x become no-ops.
  - **Note:** `normalizeEligibilityCriteria` already enforced empty `unit` for `len(AllowedUnits)==0` and rejected non-empty units. `EligibilityEditor` hides the unit adornment when `allowedUnits[0]` is absent. The frontend validator only required a unit when `allowedUnits.length > 0` and did **not** reject stray units on unitless dimensions—**4.3 / 4.4** add that symmetry.
- [x] 1.5 Grep the backend and frontend for any hard-coded reference to the therapeutic-area vocabulary length (e.g. `len(AllowedTherapeuticAreas) == 6`, `THERAPEUTIC_AREA_OPTIONS.length === 6`, or equivalent assertions in tests) so they can be updated atomically with the vocabulary expansion.

## 2. Expand the therapeutic-area vocabulary with Oncology and Neurology

- [x] 2.1 In `backend/internal/domain/study.go`, append `"Oncology"` and `"Neurology"` to `AllowedTherapeuticAreas` in that order, preserving the existing six entries unchanged.
- [x] 2.2 In `frontend/src/sections/constants.ts`, append `'Oncology'` and `'Neurology'` to `THERAPEUTIC_AREA_OPTIONS` in the same order so the dropdown mirrors the backend list exactly.
- [x] 2.3 Run `go test ./backend/internal/domain/...` and `pnpm test` (frontend) and update any existing tests that hard-code the vocabulary length or list membership so they describe the expanded vocabulary.
- [x] 2.4 Spot-check the `Study information` editor in the running frontend to confirm the new options appear in the `Therapeutic area` dropdown and that selecting them submits successfully to the backend.

## 3. Extend the eligibility dimension registry

- [x] 3.1 In `backend/internal/domain/eligibility.go`, keep the existing four dimensions (`age`, `hsCRP`, `LVEF`, `SBP`) unchanged and append new `DimensionDefinition` entries grouped by clinical purpose in the following order (the order is the order they will render in the editor dropdown):
  - **Demographics / anthropometrics**: `BMI` (`kg/m²`, description `body mass index`), `weight` (`kg`, description `participant body weight`).
  - **Vital signs**: `DBP` (`mmHg`, description `diastolic blood pressure`), `heartRate` (`bpm`, description `resting heart rate`), `QTc` (`ms`, description `corrected QT interval`).
  - **Metabolic**: `HbA1c` (`%`, description `glycated hemoglobin`), `fastingPlasmaGlucose` (`mg/dL`, description `fasting plasma glucose`).
  - **Renal**: `eGFR` (`mL/min/1.73m²`, description `estimated glomerular filtration rate`), `creatinine` (`mg/dL`, description `serum creatinine`).
  - **Hepatic**: `ALT` (`U/L`, description `alanine aminotransferase`), `totalBilirubin` (`mg/dL`, description `total serum bilirubin`).
  - **Hematology**: `hemoglobin` (`g/dL`, description `blood hemoglobin concentration`), `HbF` (`%`, description `fetal hemoglobin fraction`), `platelets` (`×10⁹/L`, description `platelet count`), `ANC` (`×10⁹/L`, description `absolute neutrophil count`).
  - **Cardiac biomarker**: `NTproBNP` (`pg/mL`, description `N-terminal pro B-type natriuretic peptide`).
  - **Performance / cognitive (unitless)**: `ECOG` (allowed units `[]`, description `Eastern Cooperative Oncology Group performance status (0–4)`), `MMSE` (allowed units `[]`, description `Mini-Mental State Examination score (0–30)`).
- [x] 3.2 Confirm that every new identifier is unique after lowercasing (since `LookupEligibilityDimension` is case-insensitive) and that no identifier collides with an existing entry.
- [x] 3.3 Run `go test ./backend/internal/domain/...` and update any test that iterates the dimension list with length-based assertions to use the new count or switch to coverage-based assertions.

## 4. Narrow validation adjustment for unitless dimensions (only if the audit in 1.x shows it is needed)

- [x] 4.1 In `backend/internal/service/study_service.go` (or wherever criterion validation lives), ensure that when a resolved dimension has an empty `AllowedUnits` list, a criterion with an empty `unit` string is accepted, and a criterion with any non-empty `unit` is rejected with a descriptive validation error naming the offending field.
- [x] 4.2 Add or update a unit-validation test that asserts both branches from 4.1 — empty unit accepted for unitless dimension, non-empty unit rejected for unitless dimension — using the new `ECOG` dimension as the fixture.
- [x] 4.3 In `frontend/src/sections/validation.ts`, mirror the same rule so the `Eligibility criteria` editor does not produce false positives: a row whose dimension has no registered unit is valid with no unit, invalid if the row carries a non-empty unit.
- [x] 4.4 Add a Vitest case in `frontend/src/sections/validation.test.ts` covering the unitless-dimension branch using `ECOG` or `MMSE` as the fixture.

## 5. Expand the seed catalog to cover all eight therapeutic areas

- [x] 5.1 In `backend/internal/bootstrap/seed.go`, keep `study-0001` and `study-0002` unchanged, and append new `domain.Study` literals with contiguous IDs `study-0003` onward. Target distribution (16 studies total, 2 per area):
  - **Cardiovascular**: `study-0003` `Phase 3` `parallel` (LVEF, SBP, DBP, BMI); existing `study-0001` already in this area.
  - **Diabetes**: `study-0004` `Phase 3` `parallel` (HbA1c, BMI, age, eGFR exclusion); `study-0005` `Phase 1` `crossover` (HbA1c, weight, fastingPlasmaGlucose). `study-0002` is already Diabetes Phase 2.
  - **Hematology**: `study-0006` `Phase 2` `parallel` (hemoglobin, platelets inclusion, ECOG exclusion); `study-0007` `Phase 4` `single-arm` (age, hemoglobin, ANC).
  - **Sickle Cell Disease**: `study-0008` `Phase 2` `parallel` (hemoglobin, HbF, age, SBP exclusion); `study-0009` `Phase 3` `single-arm` (HbF, hemoglobin, age).
  - **Obesity**: `study-0010` `Phase 2` `parallel` (BMI, weight, HbA1c prediabetes, age); `study-0011` `Phase 3` `crossover` (BMI, weight, SBP, DBP).
  - **Rare Diseases**: `study-0012` `Phase 1` `single-arm` (age, ECOG, hemoglobin); `study-0013` `Phase 2` `parallel` (age, creatinine, ALT exclusion).
  - **Oncology**: `study-0014` `Phase 2` `single-arm` (ECOG, ANC, platelets, hemoglobin, ALT / totalBilirubin exclusions); `study-0015` `Phase 3` `parallel` (ECOG, hemoglobin, eGFR, creatinine).
  - **Neurology**: `study-0016` `Phase 2` `parallel` (MMSE inclusion window, age, creatinine exclusion); `study-0017` `Phase 3` `parallel` (MMSE, age, QTc exclusion). Final count may land at 16 ±1 if any bundle collapses; keep the distribution above as the floor.
- [x] 5.2 For each new study, write `Objectives` and `Endpoints` entries that exceed 10 trimmed characters and read as realistic trial language (loose paraphrases of the CSV `Study Title` / `Brief Summary` fields are fine; do not copy entire summaries verbatim). Oncology and Neurology seeds have no CSV source — use generic clinically-plausible wording.
- [x] 5.3 For each new study, set `PatientPopulation` to a plausible one-sentence cohort description (for Oncology and Neurology, examples: "Adults with advanced non-small-cell lung cancer on prior platinum-based therapy", "Early Alzheimer's disease with MMSE 20–26").
- [x] 5.4 For each new study, set `Participants` (≥1), `NumberOfArms` (≥1), `Phase`, `TherapeuticArea`, and `StudyType` to values inside the closed vocabularies; SOA milestone fields MAY be left empty or filled with ISO-8601 dates consistent with the existing two seeds.
- [x] 5.5 Annotate each CSV-inspired seed literal with a one-line Go comment referencing the inspiration NCT id from the relevant CSV (for example `// inspired by NCT04913207`). Oncology and Neurology seeds MAY omit the comment or reference a generic trial pattern (for example `// generic oncology fixture`).
- [x] 5.6 Double-check that every criterion's `DimensionID` resolves via `domain.LookupEligibilityDimension` and that its `Unit` is either empty (for `ECOG` / `MMSE`) or present in the dimension's `AllowedUnits`.
- [x] 5.7 Double-check that IDs `study-0001` through the last seeded id are contiguous and strictly increasing with no duplicates; confirm every value in `domain.AllowedTherapeuticAreas` appears at least once across the seed set; confirm every `domain.AllowedPhases` value appears at least once; confirm every `studyType` value (`parallel`, `crossover`, `single-arm`) appears at least once.
- [x] 5.8 Run `gofmt` on the file and manually inspect for readability; break the seed into grouped literals per therapeutic area with blank-line separators so future edits are easy to navigate.

## 6. Seed-level integrity test

- [x] 6.1 Create `backend/internal/bootstrap/seed_test.go` asserting that `SeedStudies()` covers every value in `domain.AllowedTherapeuticAreas` at least once (including the newly added `Oncology` and `Neurology`).
- [x] 6.2 Extend the same test to assert every seeded study's `Phase` is in `domain.AllowedPhases`, `StudyType` is one of the allowed values (`parallel`, `crossover`, `single-arm`), and `Participants` and `NumberOfArms` are ≥1.
- [x] 6.3 Extend the test to assert every seeded inclusion and exclusion criterion resolves via `domain.LookupEligibilityDimension`, and that the criterion's `Unit` is either empty (when the resolved dimension has no allowed units) or is present in the dimension's `AllowedUnits` list.
- [x] 6.4 Extend the test to assert the seeded IDs form a contiguous `study-NNNN` sequence starting at `study-0001`, with no gaps and no duplicates, and that every ID matches the `^study-[0-9]{4}$` pattern.
- [x] 6.5 Run `go test ./backend/internal/bootstrap/...` and confirm the new test passes.

## 7. Update existing backend tests that assume old counts

- [x] 7.1 Grep `backend/` for hard-coded `len(...) == 2` or references to `study-0001` / `study-0002` in isolation that would be broken when new seeds appear. Update each one either to a length-independent assertion or to explicitly-named IDs, whichever is clearer.
- [x] 7.2 Grep `backend/` for assertions on the dimension count (for example `len(EligibilityDimensions()) == 4`) and update them to match the expanded registry or to coverage-based checks.
- [x] 7.3 Grep `backend/` for assertions on the therapeutic-area vocabulary length and update them to reflect the eight-area vocabulary.
- [x] 7.4 Run `go test ./...` and fix any remaining regressions. All tests MUST pass.

## 8. Update existing frontend tests that assume old fixture shape

- [x] 8.1 Grep `frontend/` for tests that hard-code the seeded study count, specific seeded study IDs beyond `study-0001` / `study-0002`, the dimension count, or the therapeutic-area vocabulary length. Update them as in 7.1 / 7.2 / 7.3.
- [x] 8.2 Specifically check `frontend/src/assistant/similarity.test.ts` and `frontend/src/assistant/state.test.ts` — the deterministic heuristic and state machine fixtures may embed synthetic studies with the old vocabulary. Ensure no test inadvertently asserts "exactly 2 candidate studies" against the real seed set; any such test SHOULD use its own synthetic fixture list, not the real seeds.
- [x] 8.3 Run `pnpm test` in `frontend/` and confirm every suite passes, including the assistant similarity and state-machine tests. None of the expected assistant behaviors should change.

## 9. Documentation

- [x] 9.1 Update `README.md` `MVP Scope` bullet list so the therapeutic-area enumeration includes `Oncology` and `Neurology` alongside the original six, and add a short bullet noting the seed catalog now covers every supported area so the `StudyHub assistant` has meaningful data to rank against.
- [x] 9.2 Optionally add a short note to `docs/` referencing the CSV inspiration files, clarifying that the seed list is hand-curated (not imported from CSV at runtime), and that Oncology / Neurology seeds were written from generic clinical-trial conventions since no CSV was provided for those areas.

## 10. Manual verification

- [x] 10.1 Run `go run ./backend/cmd/api` locally, hit `GET /api/studies`, and confirm the response contains the expanded catalog with IDs `study-0001` through the last seeded id and at least one study per therapeutic area (including `Oncology` and `Neurology`).
- [x] 10.2 Hit `GET /api/eligibility-dimensions` and confirm the expanded registry is present (the four existing dimensions plus the new additions across all clinical-purpose groups), and that `ECOG` and `MMSE` return an empty `allowedUnits` array.
- [x] 10.3 Start the frontend with `pnpm dev`, open the `Study information` section for any seeded study, and confirm the `Therapeutic area` dropdown now lists all eight areas in order.
- [x] 10.4 Open the `Eligibility criteria` screen for any seeded study, open the `StudyHub assistant`, pick `Copy criteria from another study`, and confirm the study picker menu lists 15 other studies with visible therapeutic-area and phase labels (ordered as produced by the state machine).
- [x] 10.5 From the same screen pick `Suggest criteria based on similar studies` and confirm three criterion suggestions are returned, drawn from studies that share the current study's therapeutic area or phase when possible. Try this for at least one seeded Oncology study and one seeded Neurology study to confirm ECOG and MMSE criteria surface as expected.
- [x] 10.6 Open the `Eligibility criteria` editor for a seeded Oncology study and confirm that ECOG criteria render without a unit adornment (per the unitless-dimension rule), while hemoglobin / ANC criteria render their units normally.
- [x] 10.7 Create a brand-new study via the wizard and confirm its generated identifier is strictly greater than the highest seeded suffix (i.e. not colliding with any seeded study).
