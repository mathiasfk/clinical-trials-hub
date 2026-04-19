## 1. Restructure the All studies card markup

- [x] 1.1 In `frontend/src/pages/AllStudiesPage.tsx`, replace the current five stacked spans inside `<Link className="study-card">` with three regions: an identity line containing the study ID (primary) and the phase pill (inline), a clinical line containing the therapeutic area and patient population, and the existing metadata footer.
- [x] 1.2 Render the clinical line's middle-dot separator (` · `) only when both `study.therapeuticArea` and `study.patientPopulation` are non-empty; mark the separator `aria-hidden="true"`.
- [x] 1.3 Add `study.studyType` to the metadata footer alongside the existing `participants`, `arms`, and `criteria count` entries (use concise labels: e.g. `Interventional`, `120 participants`, `2 arms`, `5 criteria`).
- [x] 1.4 Append an `FPFV <date>` entry to the metadata footer when `study.firstPatientFirstVisit` is non-empty, and omit the entry entirely (no `Not set`) otherwise. Add a `title` attribute expanding the acronym (e.g., `First patient, first visit: <date>`).
- [x] 1.5 Add `title` attributes to the therapeutic area and patient population spans so truncated values are discoverable on hover.

## 2. Update card styles for density and the new layout

- [x] 2.1 In `frontend/src/App.css`, add selectors for the new identity and clinical lines (e.g. `.study-card-identity`, `.study-card-clinical`), using a flex row for identity (ID + phase pill inline, `align-items: center`, `gap: 0.5rem`) and a single-line, ellipsis-truncating style for the clinical line.
- [x] 2.2 Tighten `.study-card` vertical padding to `0.75rem` and inner gap to `0.25rem`, and reduce `.study-card-list` inter-card gap to `0.6rem`, while keeping the existing border, border-radius, background, hover transform, and box-shadow.
- [x] 2.3 Ensure `.study-card-phase` retains its current pill appearance when rendered inline next to the ID (no width changes that break the flex row).
- [x] 2.4 Confirm `.study-card-metadata` continues to wrap gracefully with the added study type entry on narrow viewports (`flex-wrap: wrap` preserved).

## 3. Update frontend tests

- [x] 3.1 Update `frontend/src/App.test.tsx` (and any other affected test files) to assert that the All studies list renders the phase pill on the same line as the study ID, the therapeutic area inline with the patient population, and the metadata footer including the study type — avoiding brittle DOM-nesting assertions.
- [x] 3.2 Add a test case (or extend an existing one) that renders a seeded study with an empty `therapeuticArea` or `patientPopulation` and asserts that no separator and no `Not set` placeholder are rendered on the clinical line.
- [x] 3.3 Add test coverage for the FPFV entry: a study with `firstPatientFirstVisit` set renders `FPFV <date>` in the metadata footer, and a study with an empty `firstPatientFirstVisit` renders no `FPFV` text at all.

## 4. Manual verification

- [x] 4.1 Run the frontend test suite (`pnpm --filter frontend test`) and fix any regressions introduced by the card restructure.
- [ ] 4.2 Manually verify the `All studies` page with the current seed studies at desktop (≥1280px), tablet (~768px), and narrow (~375px) widths — confirming the identity line, clinical line, and metadata footer all read correctly and no value overflows the card.
