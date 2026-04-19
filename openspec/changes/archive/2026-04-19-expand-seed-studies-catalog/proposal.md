## Why

The `StudyHub assistant` we just shipped on the `Eligibility criteria` screen is only as useful as the pool of studies it can learn from. Right now the backend seeds exactly two studies (`study-0001` cardiovascular RA/Phase 2, `study-0002` diabetes/Phase 2) and both reuse the same four dimensions (`age`, `hsCRP`, `LVEF`, `SBP`). In that world the `Copy criteria from another study` menu lists at most one other study, the `Suggest criteria based on similar studies` ranking has almost nothing to weigh, and most criteria reachable through the assistant are drawn from a single thin vocabulary. We want the assistant to demonstrate real value on a cold start: both the seed **catalog** and the eligibility **dimension registry** need to grow in lockstep so seeded studies carry the kinds of criteria reviewers expect in real clinical trials (HbA1c thresholds in diabetes, hemoglobin / ECOG cutoffs in oncology and hematology, renal safety exclusions via eGFR and creatinine, cognitive scores in neurology, etc.).

## What Changes

- Expand `backend/internal/bootstrap/SeedStudies()` from 2 to roughly **16** studies, with at least two studies per supported therapeutic area, covering every supported `phase` (`Phase 1` through `Phase 4`) at least once and every supported `studyType` (`parallel`, `crossover`, `single-arm`) at least once across the set.
- Use the CSV exports in `docs/clinical-trials-gov-examples/` as **inspiration only** (not one-to-one copies) for study titles, patient populations, objectives, endpoints, and eligibility descriptions, so seeded data feels realistic to reviewers and product testers.
- Add two therapeutic areas to the closed vocabulary: **`Oncology`** and **`Neurology`**. Both the backend `domain.AllowedTherapeuticAreas` list and the frontend `THERAPEUTIC_AREA_OPTIONS` constant SHALL be updated so the `Study information` dropdown and backend validation stay aligned. Existing seeded studies keep their current therapeutic-area assignments unchanged.
- Substantially extend the declarative eligibility dimension registry in `backend/internal/domain/eligibility.go` from **4 to roughly 22** dimensions, grouped by clinical purpose so criteria across all eight therapeutic areas can be expressed naturally:
  - **Demographics / anthropometrics**: `age` (existing), `BMI`, `weight`.
  - **Vital signs**: `SBP` (existing), `DBP`, `heartRate`, `QTc`.
  - **Metabolic**: `HbA1c`, `fastingPlasmaGlucose`.
  - **Renal**: `eGFR`, `creatinine`.
  - **Hepatic**: `ALT`, `totalBilirubin`.
  - **Hematology**: `hemoglobin`, `HbF`, `platelets`, `ANC`.
  - **Cardiac**: `LVEF` (existing), `hsCRP` (existing), `NTproBNP`.
  - **Performance / cognitive (unitless)**: `ECOG`, `MMSE`.
  Each new dimension MUST specify its `id`, `displayName`, `description`, and allowed units (a single canonical unit, or an empty list for unitless categorical dimensions).
- Keep every seeded criterion compliant with the existing deterministic-rule shape and the `Eligibility criteria` minimum-validity contract, so the seed set remains a valid fixture for the existing backend and frontend tests. For unitless dimensions (`ECOG`, `MMSE`), the registry declares an empty `AllowedUnits` slice and the criterion's `unit` field is the empty string; validation on both the backend and the frontend MUST accept that combination.
- Preserve the deterministic identifier sequence: the new seeded studies SHALL occupy `study-0001` through `study-NNNN` contiguously, and the backend-generated-identifier logic SHALL still allocate the next available `study-NNNN` suffix for user-created studies without colliding with the expanded seed set.
- Do **NOT** change any API contract, no new endpoints, no new request/response shapes, no new frontend UI. The assistant consumes the enlarged set through the existing `/api/studies`, `/api/studies/:id`, and `/api/eligibility-dimensions` endpoints.

## Capabilities

### New Capabilities
<!-- None. The change extends fixture data, a registry, and a closed vocabulary within an existing capability. -->

### Modified Capabilities
- `study-registration`: the "Application starts with mock study data", "Eligibility dimensions come from a declarative registry", "Section screens enforce a minimum-validity contract before advancing or saving", "Study information uses standardized phase and therapeutic-area vocabularies", and "Backend-generated study identifiers do not collide with existing records" requirements all continue to hold, but their scope grows: the closed `therapeuticArea` vocabulary now includes `Oncology` and `Neurology`, the seed catalog now covers every area in that expanded vocabulary, the dimension registry now carries roughly 18 new entries and supports unitless dimensions, the minimum-validity contract clarifies that `unit` is required only when the registered dimension declares allowed units, and the identifier generator must still sit strictly above the new highest seeded suffix.

## Impact

- **Backend**: `backend/internal/bootstrap/seed.go` grows considerably; `backend/internal/domain/eligibility.go` gains roughly 18 new `DimensionDefinition` entries; `backend/internal/domain/study.go` gains two entries in `AllowedTherapeuticAreas` (`Oncology`, `Neurology`). A narrow validation tweak in `backend/internal/service/study_service.go` may be needed to accept an empty `unit` for unitless dimensions (only if the audit in the tasks confirms the current code rejects it). No changes to repository contracts or HTTP handlers.
- **Frontend**: `frontend/src/sections/constants.ts` `THERAPEUTIC_AREA_OPTIONS` gains the two new areas so the `Study information` dropdown stays in sync with the backend. A mirror validation tweak in `frontend/src/sections/validation.ts` may be needed for unitless dimensions (same conditional as the backend tweak). No component or routing changes; the assistant's similarity heuristic and state machine already handle an arbitrary number of studies, dimensions, and therapeutic-area values.
- **API**: no new endpoints or DTOs. `/api/eligibility-dimensions` and `/api/studies` responses become larger.
- **Tests**: update any backend or frontend test that asserts on "exactly 2 seeded studies", on the specific dimension count, or on the therapeutic-area vocabulary length; add a backend-level seed-integrity test asserting every allowed `therapeuticArea` is covered, every seeded criterion references a registered dimension with an allowed unit (or an empty unit for unitless dimensions), and study IDs form a contiguous `study-NNNN` sequence.
- **Docs**: `README.md` MVP Scope list gets the two new therapeutic areas added and a short bullet noting the seed catalog spans all supported areas for the assistant.
- **Dependencies**: none.
