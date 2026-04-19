## Context

The `study-registration` capability already defines a declarative eligibility dimension registry (`backend/internal/domain/eligibility.go`), a closed therapeutic-area vocabulary (`backend/internal/domain/study.go` + `frontend/src/sections/constants.ts`), and a deterministic seed list (`backend/internal/bootstrap/seed.go`). The frontend `StudyHub assistant` (change `add-eligibility-assistant-chat`) reads those seeded studies through the existing `listStudies()` call, ranks them with a deterministic similarity heuristic (`therapeuticArea` +3, `phase` +2, `studyType` +1, shared `dimensionId` +1), and surfaces suggestions in its chat drawer. With only two seeded studies, four eligibility dimensions, and six therapeutic areas where several (Oncology, Neurology) that are heavy in real clinical-trial registries are not represented at all, the heuristic has almost nothing to differentiate candidates and the `Copy criteria from another study` menu shows at most one button.

The user has dropped six `docs/clinical-trials-gov-examples/ctg-studies-*.csv` files — one per existing therapeutic area — as realism fodder. These CSVs carry real `NCT` identifiers, titles, brief summaries, phase and study-type metadata, and loose intervention text, but no structured eligibility rules. They are inspiration, not a schema to import. The CSVs do not cover Oncology or Neurology, so the two added therapeutic areas are seeded from generic clinical-trial conventions rather than a CSV row.

Constraints driving this design:
- **No new API, no new UI.** The expansion must flow through the existing endpoints and the existing frontend render path.
- **Deterministic**: the seed list must be identical across reboots so the similarity heuristic and every existing test remain reproducible.
- **Valid against the existing contracts**: every new study must satisfy `Study information`, `Objectives`, `Endpoints`, and `Eligibility criteria` minimum-validity rules; every criterion must reference a registered dimension with an allowed unit (or an empty unit for unitless dimensions).
- **Closed vocabularies stay closed, just larger**: expanding `therapeuticArea` is a vocabulary change, not a structural change; both backend and frontend must stay aligned.
- **Backend test harness must keep passing**: the identifier generator continues to allocate `study-(maxSeededSuffix+1)` for user-created studies, and any test that asserts on the seed count, dimension count, or vocabulary length must be updated in the same change.
- **Assistant similarity heuristic must get meaningful signal**: the distribution of therapeutic areas, phases, study types, and dimensions needs to produce non-trivial score spreads.

## Goals / Non-Goals

**Goals:**
- Provide at least two seeded studies for each supported therapeutic area after expansion, so the heuristic has within-area differentiation driven by `phase`, `studyType`, and shared `dimensionId` tie-breakers.
- Cover every supported `phase` (`Phase 1` through `Phase 4`) at least once and every supported `studyType` (`parallel`, `crossover`, `single-arm`) at least once across the new seed set.
- Extend the eligibility dimension registry with a clinically-meaningful taxonomy (demographics / anthropometrics, vital signs, metabolic, renal, hepatic, hematology, cardiac, performance / cognitive) so criteria across every therapeutic area read like real trial language.
- Add two closed-vocabulary therapeutic areas — `Oncology` and `Neurology` — that are dominant in real clinical-trial registries and that naturally exercise dimensions the existing vocabulary would barely touch (ECOG, MMSE, NTproBNP, ANC, hemoglobin).
- Keep the seed list a single deterministic Go function (no JSON loading, no file I/O at startup) so boot time and test reproducibility are unchanged.
- Update the backend and frontend tests that currently pin the seed count, the dimension count, or the therapeutic-area vocabulary length so they describe the enlarged fixture without re-asserting exact numbers that would make future additions painful.

**Non-Goals:**
- No import of the raw CSVs at runtime; no parser, no `encoding/csv` dependency. The CSVs remain a developer reference.
- No change to the `Study` domain type, the `StudyCreateInput` DTO, the repository interface, or any HTTP handler.
- No change to the frontend assistant, the similarity heuristic, or the `Eligibility criteria` editor. Their existing tests remain valid in shape (they may need updated fixtures to reflect the new seed size, but no behavior assertion changes).
- No additional therapeutic areas beyond `Oncology` and `Neurology` in this change. We deliberately stop at eight areas to keep the `Study information` dropdown comfortable and the seed catalog inside the assistant's "small workspace" ergonomic envelope.
- No internationalization or localization of the seeded descriptions; they stay in English to match the current MVP.
- No seeding of user-generated studies or per-environment variants. One canonical seed list for local dev and tests.
- No change to the `study-registration` wizard order, section footer behavior, or any existing validation rule except the narrow "unit required iff dimension declares allowed units" clarification.

## Decisions

1. **Seeds stay as a hand-written Go slice, not CSV-driven**
   - **Decision:** Keep `SeedStudies()` as a pure function returning `[]domain.Study` literals. Expand the slice in-place. Do not introduce CSV parsing, embed files, or any new runtime dependency.
   - **Rationale:** The CSV columns (`Study Title`, `Brief Summary`, `Interventions`, `Phases`, `Enrollment`, `Study Type`) do not map 1:1 to the MVP `Study` fields, and most real entries lack structured eligibility rules. Hand-writing the seeds lets us produce clinically-plausible criteria that comply with the declarative rule shape, and keeps the seed function trivially deterministic.
   - **Alternatives considered:** Parse the CSVs via `encoding/csv` at startup. Rejected because the CSVs are incomplete relative to `Study` (no structured criteria, no `numberOfArms`, no SOA milestones), because it would make the seed list non-deterministic with respect to CSV edits, and because it adds runtime cost and failure modes for no functional benefit.

2. **Target size ≈ 16 studies, distributed 2 per therapeutic area across the expanded vocabulary**
   - **Decision:** Seed roughly 16 studies with the following distribution: Cardiovascular ×2, Diabetes ×2, Hematology ×2, Sickle Cell Disease ×2, Obesity ×2, Rare Diseases ×2, Oncology ×2, Neurology ×2. Within each area, vary `phase`, `studyType`, `numberOfArms`, and `participants` so the similarity heuristic can differentiate. Final count is flexible ±1 depending on how many distinct criterion bundles can be written cleanly, but MUST cover all eight areas.
   - **Rationale:** Sixteen studies keeps the `Copy criteria from another study` menu scrollable in the ~380px drawer without pagination (still within the "≤ ~20 seeded + user-created studies" assumption called out in the assistant's own design doc), and is plenty to generate non-trivial similarity rankings. Two studies per area guarantees the `+3 therapeuticArea` bonus has within-area tie-breaking exercised by the `+2 phase` and `+1 studyType` rules.
   - **Alternatives considered:** Seed 30+ studies to pressure-test scale. Rejected: the assistant's design explicitly called out that menu scrolling is acceptable at MVP scale (≤ ~20 total); going higher would force an assistant-pagination follow-up we don't want in this change. Seed a minimal one-per-area eight-pack. Rejected: zero within-area differentiation defeats the heuristic's tie-breakers.

3. **Expand the therapeutic-area vocabulary with `Oncology` and `Neurology`**
   - **Decision:** Append `Oncology` and `Neurology` to both `backend/internal/domain/AllowedTherapeuticAreas` and `frontend/src/sections/constants.ts THERAPEUTIC_AREA_OPTIONS`, preserving the order of existing entries. These two areas are the most common real-world clinical-trial buckets not already represented, and they pull in dimensions (ECOG, MMSE, ANC, hemoglobin) that would otherwise look out of place in the existing six areas.
   - **Rationale:** The similarity heuristic hinges on `therapeuticArea` as its strongest signal (+3). Adding two heavyweight areas multiplies the cases where the heuristic produces a clear, defensible ranking, and lets us write seeded criteria that exercise the new cognitive and performance-status dimensions realistically.
   - **Alternatives considered:** Add more areas (Respiratory, Autoimmune, Infectious Disease). Rejected for scope: each extra area requires at least two seeded studies and a broader dropdown. Stopping at eight keeps the `Study information` select comfortable and the seed catalog inside the assistant's ergonomic envelope. Add zero new areas. Rejected: Oncology especially is the domain that most obviously motivates dimensions like `ECOG` and `ANC`, and it would look arbitrary to introduce those dimensions while having no study to use them in.

4. **Grow the eligibility dimension registry along clinical-purpose lines**
   - **Decision:** Extend `eligibilityDimensions` in `backend/internal/domain/eligibility.go` from 4 to roughly 22 entries. The final list, grouped for readability, is:
     - **Demographics / anthropometrics**: `age` (existing, `years old`), `BMI` (`kg/m²`), `weight` (`kg`).
     - **Vital signs**: `SBP` (existing, `mmHg`), `DBP` (`mmHg`), `heartRate` (`bpm`), `QTc` (`ms`).
     - **Metabolic**: `HbA1c` (`%`), `fastingPlasmaGlucose` (`mg/dL`).
     - **Renal**: `eGFR` (`mL/min/1.73m²`), `creatinine` (`mg/dL`).
     - **Hepatic**: `ALT` (`U/L`), `totalBilirubin` (`mg/dL`).
     - **Hematology**: `hemoglobin` (`g/dL`), `HbF` (`%`, for sickle-cell-disease fetal-hemoglobin criteria), `platelets` (`×10⁹/L`), `ANC` (`×10⁹/L`, absolute neutrophil count).
     - **Cardiac**: `LVEF` (existing, `%`), `hsCRP` (existing, `mg/L`), `NTproBNP` (`pg/mL`).
     - **Performance / cognitive (unitless)**: `ECOG` (`[]`, Eastern Cooperative Oncology Group score `0..4`), `MMSE` (`[]`, Mini-Mental State Examination score `0..30`).
     Each entry MUST include `ID`, `DisplayName`, `Description`, and an `AllowedUnits` slice (a single canonical unit, or empty for `ECOG` / `MMSE`). Identifiers stay case-insensitive via the existing `LookupEligibilityDimension` matcher; the final catalog has no duplicate ids.
   - **Rationale:** Grouping dimensions by clinical purpose (not alphabetically) makes the registry readable and makes the added dimensions' intent obvious at review time. Each group is populated with the dimensions that most commonly gate eligibility in the corresponding therapeutic area: HbA1c + FPG for diabetes, hemoglobin + HbF + platelets + ANC for hematology / SCD / oncology, eGFR + creatinine for renal safety exclusions across the board, ALT + total bilirubin for hepatic safety exclusions, ECOG for oncology, MMSE for neurology. This keeps the seeded criteria plausible at a reviewer glance without needing to model every possible lab.
   - **Alternatives considered:** Keep the registry at four and overload existing dimensions. Rejected: forcing diabetes criteria to be expressed with `SBP` or `age` produces implausible studies and breaks the inspiration-from-CSV goal. Add all lab values under the sun (50+ dimensions). Rejected as scope inflation that would balloon the dropdown without improving the assistant's differentiation signal.

5. **Unitless dimensions are modelled with an empty `AllowedUnits` slice, not a sentinel string**
   - **Decision:** For categorical dimensions `ECOG` (`0..4`) and `MMSE` (`0..30`), set `AllowedUnits: []string{}` and leave the criterion's `unit` field as the empty string. The criterion still carries a numeric `value` and an `operator` (for example `ECOG <= 2` or `MMSE >= 24`), so the existing deterministic-rule shape is satisfied unchanged.
   - **Rationale:** Honest modelling. Inventing a unit string for a dimension that has none would leak into the assistant's copy-from-study confirmations, the summary view, and exported data, making the fixture look wrong. Empty `AllowedUnits` cleanly expresses "unit not required", and the existing `unit,omitempty` on `DeterministicRule` already tolerates the empty string at the JSON layer.
   - **Alternatives considered:** Use a `"score"` or `"grade"` placeholder unit. Rejected for honesty and consistency with the CSV examples. Exclude unitless dimensions entirely. Rejected because ECOG and MMSE are the eligibility gates that most obviously distinguish oncology and neurology studies; omitting them would make both new areas' criteria artificially thin.

6. **Narrow, backward-compatible clarification to unit validation**
   - **Decision:** Audit the current validation path (`backend/internal/service/study_service.go` and the frontend `frontend/src/sections/validation.ts`) to confirm a criterion whose dimension has `AllowedUnits: []` is accepted with an empty `unit` string and rejected with a non-empty `unit`. If either direction is not already implemented, extend both validators so that:
     - When the resolved dimension's `AllowedUnits` list is empty, the criterion's `unit` SHALL be the empty string (and MUST NOT be any non-empty value).
     - When the resolved dimension's `AllowedUnits` list is non-empty, the criterion's `unit` SHALL be one of those allowed values (unchanged from today's behavior).
     This is a narrow clarification of the existing "complete deterministic rule" rule in the `Eligibility criteria` minimum-validity contract: "unit when required by the dimension" already hints at it; we make the "when required" predicate concrete via "required iff `len(AllowedUnits) > 0`".
   - **Rationale:** Keeps the change genuinely additive. If validation is already permissive, nothing changes; if it forces a non-empty unit, we fix that once, symmetrically on backend and frontend, in a way that keeps every existing seeded criterion valid.
   - **Alternatives considered:** Skip unitless dimensions entirely (see rejected alternative in decision 5).

7. **Deterministic identifier sequence is preserved**
   - **Decision:** Assign seeded studies `study-0001` through `study-00NN` in the order they appear in the slice, with the numeric suffix strictly increasing and no gaps. Existing IDs `study-0001` and `study-0002` stay unchanged. The identifier generator's contract ("new study suffix strictly greater than the highest numeric suffix currently present") then automatically allocates `study-00(NN+1)` for the first user-created study.
   - **Rationale:** Matches the existing requirement "Backend-generated study identifiers do not collide with existing records" without any code change to the generator. Contiguous suffixes make the seed easier to scan and keep the identifier-generator contract tests valid.
   - **Alternatives considered:** Use NCT-style identifiers to mirror the CSV (e.g. `NCT04967261`). Rejected because the `study-NNNN` format is codified in the existing spec and referenced by multiple scenarios; changing it would require a much broader spec delta.

8. **CSV inspiration stays loose on copy, strict on metadata**
   - **Decision:** Borrow the CSV's `Study Title`-adjacent language to shape each seeded study's `patientPopulation`, `objectives`, and `endpoints` so they read as real trials. Do NOT copy long brief-summary paragraphs verbatim — keep objectives and endpoints concise enough to satisfy the per-entry minimum-validity contract (`> 10` trimmed chars) without ballooning the seed file. Borrow `Phases` (`PHASE1`/`PHASE2`/…) by mapping to our closed vocabulary (`Phase 1`/`Phase 2`/…) and map `Study Type` (`INTERVENTIONAL`/`OBSERVATIONAL`) loosely to our closed vocabulary (`parallel`/`crossover`/`single-arm`) at our discretion, because our MVP study-type vocabulary does not model observational designs. For the Oncology and Neurology seeds (which have no CSV), use generic clinically-plausible wording (for example "Adults with advanced non-small-cell lung cancer", "Early Alzheimer's disease with MMSE 20–26").
   - **Rationale:** Gives reviewers a clear "this looks like a real trial" feeling while staying inside the MVP's closed vocabularies. Keeps the seed file readable and under a few hundred lines.
   - **Alternatives considered:** Copy entire CSV rows into the seed file verbatim (minus structured criteria). Rejected because the CSV brief-summary fields are multi-sentence paragraphs that would bloat the file; also, copyright-provenance for long paragraphs is noise in a demo fixture.

9. **Preserve the two existing seeded studies unchanged**
   - **Decision:** Retain `study-0001` and `study-0002` exactly as-is (do not reshuffle their IDs, criteria, or metadata). Add the new studies as `study-0003` onward. Existing tests that reference `study-0001` / `study-0002` by ID continue to work without any modification.
   - **Rationale:** Minimizes test churn. The two existing seeds are already valid fixtures that test the "mixed-therapeutic-area" assistant flow; they just need company.
   - **Alternatives considered:** Replace the two existing seeds with a curated set and re-number. Rejected: unnecessary breakage of existing tests and existing demo muscle memory.

10. **Seed-level integrity test added alongside the data**
    - **Decision:** Add a new backend test `backend/internal/bootstrap/seed_test.go` that asserts, over `SeedStudies()`:
      - All values in `domain.AllowedTherapeuticAreas` (including the newly added `Oncology` and `Neurology`) are represented at least once.
      - Every `phase` value is one of `domain.AllowedPhases`.
      - Every `studyType` is one of the allowed values.
      - Every seeded criterion's `dimensionId` resolves via `domain.LookupEligibilityDimension`, and its `unit` is either empty (for dimensions with empty `AllowedUnits`) or one of the dimension's `AllowedUnits`.
      - Study IDs form a contiguous `study-NNNN` sequence starting at `study-0001`, with no gaps and no duplicates.
    - **Rationale:** Prevents future seed edits from regressing the assistant's input shape and catches copy-paste errors (wrong dimension, wrong unit, duplicate ID, missed area coverage) in CI. Also pins the "expanded vocabulary is covered" invariant so reverting a therapeutic area without updating seeds would be caught immediately.
    - **Alternatives considered:** Rely on existing repository contract tests to catch drift. Rejected because those tests do not check therapeutic-area coverage or dimension/unit integrity — they test repository semantics, not fixture quality.

## Risks / Trade-offs

- **[Risk] The `Copy criteria from another study` menu will now render ~15 buttons inside a ~380px drawer.** → **Mitigation:** The assistant design accepted this at up to ~20 items; 16 is still under that line. The menu scrolls inside the bubble and no pagination work is triggered by this change.
- **[Risk] Expanding the therapeutic-area vocabulary can de-sync backend and frontend if either list is updated in isolation.** → **Mitigation:** A single task in this change explicitly pairs the backend `AllowedTherapeuticAreas` edit with the frontend `THERAPEUTIC_AREA_OPTIONS` edit, and the existing `Backend rejects unsupported phase or therapeutic area values` scenario continues to hold. The seed-integrity test additionally asserts every `AllowedTherapeuticAreas` value has at least one seeded study.
- **[Risk] Larger dimension registry can expose edge cases in the existing `Eligibility criteria` editor where the unit adornment assumes a single allowed unit or a specific string format.** → **Mitigation:** Every new dimension is defined with exactly one allowed unit (or an empty list for unitless dimensions), matching the existing entries' convention. No multi-unit dimensions are introduced. Unicode units (`kg/m²`, `×10⁹/L`) are modelled as plain strings; the editor already renders the unit verbatim, so no new formatting is required.
- **[Risk] Any backend or frontend test that hard-codes the exact seed count, the exact dimension list, or the therapeutic-area vocabulary length will fail.** → **Mitigation:** Update those tests in this change to either use length-independent assertions or to describe the expanded invariants (all areas covered, every criterion resolves) introduced in decision 10.
- **[Risk] Hand-written clinical criteria can be subtly wrong (e.g. ECOG thresholds inconsistent with the described study phase) and mislead reviewers.** → **Mitigation:** Keep criteria within commonly-used thresholds documented in published trial protocols and standard clinical references; no value we invent needs to be medically authoritative, only plausible at a reviewer glance. The seed-integrity test catches structural wrongness (missing unit, unknown dimension), and visible reviewer inspection catches semantic implausibility.
- **[Trade-off] Harder to scale past ~20 studies without adding pagination/typeahead to the assistant.** → Accepted and already captured as a follow-up in the assistant's own design doc; this change is intentionally sized to stay inside that envelope.
- **[Trade-off] Unit handling for unitless dimensions may require a small validation tweak.** → Accepted; the tweak is small, additive, symmetric between backend and frontend, and consistent with the spirit of the existing "unit when required" rule.

## Migration Plan

1. Extend `backend/internal/domain/study.go` `AllowedTherapeuticAreas` with `Oncology` and `Neurology`, and extend `frontend/src/sections/constants.ts THERAPEUTIC_AREA_OPTIONS` with the same two values in the same order.
2. Extend `backend/internal/domain/eligibility.go` with the new `DimensionDefinition` entries grouped by clinical purpose per decision 4.
3. Audit backend and frontend validation (decision 6). If a gap exists for unitless dimensions, update `backend/internal/service/study_service.go` and `frontend/src/sections/validation.ts` symmetrically so empty `unit` is valid for unitless dimensions and non-empty `unit` is rejected.
4. Expand `backend/internal/bootstrap/seed.go` with the new studies, appended after the existing two, assigned IDs `study-0003` onward, with distributions and dimension usage from decisions 2 and 4.
5. Add `backend/internal/bootstrap/seed_test.go` with the integrity assertions from decision 10.
6. Update any existing backend test that currently asserts "exactly 2 seeded studies", "exactly 4 dimensions", or a specific therapeutic-area vocabulary length to the new invariants; do the same for frontend tests that snapshot or count these values.
7. Run `go test ./...` and `pnpm test` (frontend) to confirm nothing regresses. No production config, no environment flags, no migration.
8. Rollback is a clean revert of the modified seed / registry / vocabulary files, the small validation tweak (if made), and the new test file.

## Open Questions

- Do we want to flag the originating `NCT` identifier on each CSV-inspired seeded study for provenance (e.g. as a Go line comment)? **Leaning:** yes; no change to the `Study` domain type. Oncology and Neurology seeds will not carry an NCT reference since they have no CSV source.
- Should `ECOG` and `MMSE` values be restricted to integer ranges (`0..4` and `0..30` respectively) by the registry? **Leaning:** no in this change — the existing `DeterministicRule.Value` is a `float64` and the minimum-validity contract does not carry per-dimension numeric bounds. Encoding those bounds would require either a dimension-specific validator or a new registry field, both out of scope here. Seed values stay within the canonical integer ranges, and a follow-up change can introduce typed value constraints if needed.
- Should we also add a seed for a deliberately-empty-criteria study to exercise the assistant's "no suggestions available" path? **Leaning:** no — all seeded studies already contain at least one criterion, and introducing an intentionally-thin study contradicts the `Eligibility criteria` minimum-validity contract at save time; we will test that path with a unit test on `collectSuggestions`, not with a seed.
