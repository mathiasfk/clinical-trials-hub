## 1. Extend the shared vocabulary constants

- [x] 1.1 In `frontend/src/sections/constants.ts`, add `STUDY_TYPE_OPTIONS` as `readonly StudyType[]` containing `'parallel'`, `'crossover'`, `'single-arm'` (in that order), alongside the existing `PHASE_OPTIONS` and `THERAPEUTIC_AREA_OPTIONS`, and export a matching `StudyTypeOption` type.
- [x] 1.2 (Optional) Add a `isStudyTypeOption(value: unknown): value is StudyTypeOption` type guard mirroring `isPhaseOption` / `isTherapeuticAreaOption`, to keep the module's API consistent.

## 2. Introduce filter state and predicate in AllStudiesPage

- [x] 2.1 In `frontend/src/pages/AllStudiesPage.tsx`, add local `useState` hooks for `idQuery: string` (default `''`), `therapeuticArea: 'All' | TherapeuticAreaOption` (default `'All'`), `phase: 'All' | PhaseOption` (default `'All'`), and `studyType: 'All' | StudyTypeOption` (default `'All'`).
- [x] 2.2 Add a `useMemo`-based derivation `filteredStudies` that filters the `studies` prop with AND semantics: keep a study when (a) `idQuery.trim()` is empty OR `study.id.toLowerCase()` contains `idQuery.trim().toLowerCase()`, (b) `therapeuticArea === 'All'` OR `study.therapeuticArea === therapeuticArea`, (c) `phase === 'All'` OR `study.phase === phase`, (d) `studyType === 'All'` OR `study.studyType === studyType`.
- [x] 2.3 Add a derived boolean `hasActiveFilter` that is true when any of the four filter values is non-default (`idQuery.trim() !== ''` or any dropdown value is not `'All'`).

## 3. Render the filter bar above the list

- [x] 3.1 Inside the existing `<section className="panel">`, between the `panel-header` and the `<ul className="study-card-list">`, render a new `<div className="study-filter-bar">` containing, in order: a labeled `<input type="search">` bound to `idQuery` with a placeholder like `Search by study ID`; a labeled `<select>` bound to `therapeuticArea` whose options are `All` followed by `THERAPEUTIC_AREA_OPTIONS`; a labeled `<select>` bound to `phase` whose options are `All` followed by `PHASE_OPTIONS`; a labeled `<select>` bound to `studyType` whose options are `All` followed by `STUDY_TYPE_OPTIONS`.
- [x] 3.2 Give every filter control a visible label (not just `aria-label`) — `Study ID`, `Therapeutic area`, `Phase`, `Study type` — and associate each label with its control via `htmlFor`/`id` so the bar is accessible.
- [x] 3.3 At the trailing end of the filter bar, conditionally render a `Clear filters` button (only when `hasActiveFilter` is true) whose click handler resets `idQuery` to `''` and each dropdown to `'All'`.

## 4. Wire the panel count badge and the empty states to the filtered list

- [x] 4.1 Replace the count badge text in `.panel-badge` so it reads `{studies.length} studies` when `hasActiveFilter` is false and `{filteredStudies.length} of {studies.length} studies` when `hasActiveFilter` is true.
- [x] 4.2 Replace the `studies.map(...)` call with `filteredStudies.map(...)` so the rendered list reflects the active filters.
- [x] 4.3 Keep the existing loading (`isLoadingList`) and no-studies-yet (`!isLoadingList && studies.length === 0`) empty-state branches unchanged, and add a third branch: when `!isLoadingList && studies.length > 0 && filteredStudies.length === 0`, render a distinct filtered-empty message such as `No studies match the current filters.` (the existing `No studies available yet.` message SHALL NOT be reused for this case).

## 5. Style the filter bar

- [x] 5.1 In `frontend/src/App.css`, add a `.study-filter-bar` selector laying out the controls as a wrap-friendly flex row (`display: flex; flex-wrap: wrap; gap: …;`) with enough per-control min-width that labels never collide with inputs; reuse existing `input` and `select` styling where possible.
- [x] 5.2 Add styles for the per-filter label/control pairing (e.g. `.study-filter-bar > .filter-field`) so each label sits directly above its input/select and the whole pair flows naturally in the flex row.
- [x] 5.3 Style the `Clear filters` button as a subtle text/ghost button (no destructive coloring) aligned to the trailing end of the filter bar, ensuring it does not cause layout jitter when it appears or disappears.
- [x] 5.4 Verify at narrow viewports (~375px) that the filter bar wraps cleanly above the study list and that no control gets clipped.

## 6. Update tests

- [x] 6.1 In `frontend/src/App.test.tsx`, add test coverage that renders `AllStudiesPage` with a small fixture of studies and asserts the filter bar renders the four labeled controls (`Study ID`, `Therapeutic area`, `Phase`, `Study type`) with their default values.
- [x] 6.2 Add tests that type into the `Study ID` input and assert only studies whose identifier contains the input as a case-insensitive substring are rendered; include at least one mixed-case input to prove case-insensitivity.
- [x] 6.3 Add tests that change each dropdown (`Therapeutic area`, `Phase`, `Study type`) to a non-`All` value and assert the rendered list narrows accordingly, and that selecting `All` again restores the prior breadth.
- [x] 6.4 Add a test that sets two filters simultaneously (e.g. `Phase 2` + `Oncology`) and asserts the rendered list is the AND-intersection.
- [x] 6.5 Add a test that the panel count badge reads `<total> studies` with no filter active and `<matching> of <total> studies` when a filter is active.
- [x] 6.6 Add a test that `Clear filters` is not rendered with no active filter, becomes visible when a filter is active, and when clicked resets every filter and restores the full list.
- [x] 6.7 Add a test that filtering out every study renders the filtered-empty message (`No studies match the current filters.`) and does NOT render the `No studies available yet.` message; and that with a truly empty catalog the existing no-studies-yet message still wins.
- [x] 6.8 Update any pre-existing `App.test.tsx` assertion that expected a hardcoded total count or the old badge wording so it matches the new `<total> studies` / `<matching> of <total> studies` format.

## 7. Manual verification

- [x] 7.1 Run `pnpm --filter frontend test` and confirm the suite passes.
- [ ] 7.2 Run the frontend locally and, on the `All studies` page with the current seed catalog, verify: each filter narrows the list as expected; combinations AND together; the count badge updates live; `Clear filters` resets every control and hides itself; the filtered-empty state shows the new message and not the original empty-catalog message.
- [ ] 7.3 Verify the filter bar at desktop (≥1280px), tablet (~768px), and narrow (~375px) viewport widths — controls wrap gracefully, labels remain attached to their controls, and the `Clear filters` button does not introduce layout jitter.
