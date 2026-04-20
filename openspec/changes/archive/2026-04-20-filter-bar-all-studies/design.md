## Context

The `All studies` page (`frontend/src/pages/AllStudiesPage.tsx`) is the application's default landing view and the primary surface for scanning registered studies. It receives the full `studies: Study[]` array from the caller (`App.tsx`), refreshes it on mount via `onRefreshStudies`, and renders a single vertical list of compact study cards. Each card shows the study ID, phase pill, therapeutic area, patient population, and a metadata footer (study type, participants, arms, criteria count, optional FPFV).

The seeded catalog now covers every supported `therapeuticArea` value and is being expanded toward dozens of studies. Without any narrowing affordance, users must visually scan the entire list to find the study they care about. The four attributes users overwhelmingly ask about when selecting a study are the study identifier, the therapeutic area, the phase, and the study type — all of which are already present on each study card and all of which map cleanly to small filter controls.

The vocabularies for two of those attributes already live in `frontend/src/sections/constants.ts`:

- `PHASE_OPTIONS = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4']`
- `THERAPEUTIC_AREA_OPTIONS = ['Cardiovascular', 'Diabetes', 'Hematology', 'Sickle Cell Disease', 'Obesity', 'Rare Diseases', 'Oncology', 'Neurology']`

Study type is defined as a TypeScript union in `frontend/src/types.ts` (`'parallel' | 'crossover' | 'single-arm'`) but has no co-located option array yet; the existing study-information screen uses radio-like controls rather than a dropdown for study type. Study identifiers follow the `study-NNNN` format (for seeded studies) but the frontend should not assume anything stricter than "substring match" so that custom or future ID shapes keep working.

The list endpoint already returns the full dataset in a single response and the list is small by any reasonable MVP standard, so filtering client-side over the in-memory `studies` array is the obvious approach: no new endpoints, no pagination plumbing, no debouncing concerns.

## Goals / Non-Goals

**Goals:**
- Let a user narrow the rendered `All studies` list by study ID, therapeutic area, phase, and study type, with live (every-keystroke) feedback.
- Combine active filters with AND semantics so users can, for example, ask for `Phase 2` + `Oncology` studies at once.
- Reuse the existing closed vocabularies (`PHASE_OPTIONS`, `THERAPEUTIC_AREA_OPTIONS`) as the single source of truth for dropdown options so the filter bar stays aligned with the editor and backend validation.
- Keep the count badge informative under filtering (`X of Y studies`) so the user always knows how much they have narrowed the list.
- Provide a zero-friction reset via a `Clear filters` action.
- Render a dedicated empty state when no study matches the current filters, without conflating it with the existing "no studies registered yet" or loading states.
- Keep the implementation local to `AllStudiesPage.tsx` and its stylesheet: no new dependencies, no backend changes, no new shared components.

**Non-Goals:**
- URL-query-string persistence of filters, deep-linking to filtered views, or restoring filters across navigation. Filter state is local to the page for this iteration.
- Free-text full-text search over every attribute (objectives, endpoints, population, criteria). This iteration is limited to the four specified filters.
- Multi-select on any of the dropdowns. Each dropdown is single-select with an explicit "All" entry.
- Server-side filtering, pagination, or sorting. The list endpoint continues to return the full dataset and we filter in the browser.
- Redesigning the study card or the panel header beyond the count badge text.
- Adding a saved-filters or quick-filter-chip mechanism.

## Decisions

1. **Client-side filtering over the already-loaded `studies` array**
   - **Decision:** Derive the rendered list via a `useMemo` over `studies`, `idQuery`, `therapeuticArea`, `phase`, and `studyType`. A study is kept when:
     - `idQuery` is empty, OR `study.id.toLowerCase()` contains `idQuery.trim().toLowerCase()`.
     - `therapeuticArea === 'All'` OR `study.therapeuticArea === therapeuticArea`.
     - `phase === 'All'` OR `study.phase === phase`.
     - `studyType === 'All'` OR `study.studyType === studyType`.
   - **Rationale:** The list endpoint returns the entire dataset in one call (`onRefreshStudies` already populates the array we render), and the dataset is small. Client-side filtering eliminates round-trips, avoids any debouncing/cancellation complexity, and makes every filter change feel instant. If the dataset later outgrows this approach, the filter state shape is already the same shape we would send to a server query.
   - **Alternatives considered:**
     - Server-side filtering via new query parameters on the list endpoint. Rejected for this iteration: adds backend surface area and validation work for a list size that does not warrant it.
     - Debounced text input. Rejected: for list sizes in the low hundreds, the filter runs in well under a frame and debouncing only adds perceived latency.

2. **Closed-vocabulary filters render as dropdowns with an explicit `"All"` sentinel entry**
   - **Decision:** Each dropdown (therapeutic area, phase, study type) renders `"All"` as the first option and maps to the value `'All'` in component state. The filtering predicate short-circuits that value instead of performing a comparison against the study's attribute.
   - **Rationale:** A sentinel `"All"` option keeps the control surface uniform (the user always selects an option, never has to "clear" a field), plays well with native `<select>` semantics, and avoids an inconsistent special case like `""` that would collide with how the study-information editor persists empty values.
   - **Alternatives considered:**
     - A per-filter "×" clear button inside each control. Rejected because it doubles the widget surface and duplicates the global `Clear filters` affordance.
     - Multi-select dropdowns. Rejected as explicitly out of scope; a single-select keeps the mental model simple for the MVP and covers every user story we have today.

3. **`Study ID` filter is a substring, case-insensitive text match**
   - **Decision:** Keep the ID filter as a free-text `<input type="search">` that matches by `study.id.toLowerCase().includes(idQuery.trim().toLowerCase())`. Empty input disables the filter. No regex, no field-qualified syntax.
   - **Rationale:** Seeded IDs follow the `study-NNNN` format, so typing `7`, `07`, `0007`, `study-0`, or `STUDY-01` should all do the obvious thing. Substring matching on the lowercased ID covers every case a user will want without introducing a query syntax.
   - **Alternatives considered:**
     - Prefix-only matching. Rejected because users often remember a trailing digit (`0042`) rather than the full identifier.
     - Numeric-only input that assumes the `study-NNNN` format. Rejected because it couples the filter to a specific ID scheme the backend is free to change.

4. **Filter controls live in a dedicated bar between the panel header and the list**
   - **Decision:** Render a new `<div className="study-filter-bar">` inside the same `.panel` that hosts the list, placed directly under the `panel-header` and above the `.study-card-list`. The bar uses a flex layout with `flex-wrap: wrap` and small gaps so each control keeps a minimum width on narrow viewports. Each control is labeled (visible, not just aria) — e.g., "Study ID", "Therapeutic area", "Phase", "Study type" — for scannability and accessibility.
   - **Rationale:** Co-locating the filter bar with the list keeps the relationship between controls and results obvious. Placing it inside the existing panel preserves the page's visual rhythm (panel header → filters → list) and reuses the panel's padding and border. Visible labels avoid the common anti-pattern of icon-only filters that users have to mouse over to understand.
   - **Alternatives considered:**
     - A collapsible "filters" accordion. Rejected: filters are the whole point on this screen — hiding them by default adds a click for no gain.
     - A right-side filter sidebar. Rejected as visually heavier than needed for four controls and harder to adapt to narrow viewports.

5. **Count badge becomes `X of Y studies` while filters are active; stays `Y studies` otherwise**
   - **Decision:** The existing `.panel-badge` span continues to render. When no filter is active (all dropdowns are `'All'` and the ID input is empty), its text is `{studies.length} studies`. When at least one filter is active, its text becomes `{filtered.length} of {studies.length} studies`. The singular/plural wording stays as-is (`studies`) rather than branching on 1 vs. many; this keeps the markup simple and is consistent with the current code.
   - **Rationale:** The total count is the anchor that tells the user how aggressive their narrowing is ("3 of 87" means much more than "3 of 4"). Hiding the total during filtering would lose that context.
   - **Alternatives considered:**
     - Always showing `X of Y`. Rejected because on an unfiltered list the `of Y` portion would be redundant (and identical to X).
     - Putting the filtered count in a separate chip. Rejected as noisier than a single badge.

6. **`Clear filters` is conditional and sits at the end of the filter bar**
   - **Decision:** Render a `Clear filters` text button at the trailing end of the filter bar only when at least one filter is active. Clicking it resets `idQuery` to `''` and each dropdown's state to `'All'`. It is a plain button with no destructive styling.
   - **Rationale:** A single global reset is less visually noisy than per-filter clears and is the standard pattern for multi-filter bars. Hiding it when no filter is active avoids offering a no-op affordance.
   - **Alternatives considered:**
     - Always visible, disabled when no filter is active. Rejected as extra visual weight for no benefit; React makes conditional rendering trivial.

7. **Filtered-empty state is distinct from the two existing empty states**
   - **Decision:** Add a third empty-state branch: when `!isLoadingList && studies.length > 0 && filtered.length === 0`, render a message like `No studies match the current filters.` with a short prompt to adjust or clear filters. The existing branches (`isLoadingList` → loading, `!isLoadingList && studies.length === 0` → "No studies available yet") remain unchanged.
   - **Rationale:** Conflating "you filtered everything out" with "there are no studies at all" misleads the user; the correct action in each case is different (adjust filters vs. create a study).
   - **Alternatives considered:**
     - Reusing the existing empty-state copy for both cases. Rejected because the recovery action differs.

8. **Introduce `STUDY_TYPE_OPTIONS` alongside the existing vocabulary constants**
   - **Decision:** Add `STUDY_TYPE_OPTIONS: readonly StudyType[] = ['parallel', 'crossover', 'single-arm']` (and a matching type guard if useful) in `frontend/src/sections/constants.ts`, mirroring how `PHASE_OPTIONS` and `THERAPEUTIC_AREA_OPTIONS` already live there. The filter dropdown renders those values with their existing labels.
   - **Rationale:** Keeping all closed-vocabulary option lists in one module makes them easy to find and reuse (the filter bar, the study-information editor, tests), and it codifies the canonical order for UI rendering.
   - **Alternatives considered:**
     - Hard-coding the array inline in `AllStudiesPage.tsx`. Rejected because it would drift from any future study-type vocabulary changes elsewhere.

9. **Filter state stays local to `AllStudiesPage.tsx`**
   - **Decision:** Store the four filter values in component-local `useState` within `AllStudiesPage`. Do not lift them into `App.tsx`, do not round-trip through React Router search params, and do not persist them in `localStorage`.
   - **Rationale:** Keeps the change small, avoids introducing URL-encoding concerns for values like `Sickle Cell Disease`, and matches the MVP's general pattern of local-only page state. A follow-up change can add URL sync once we know which filter patterns are actually used.
   - **Alternatives considered:**
     - Mirroring state in the URL via `useSearchParams`. Deferred as an explicit non-goal for this iteration.
     - Persisting to `localStorage`. Deferred; filters that stick across reloads can surprise users who forgot them.

## Risks / Trade-offs

- **[Risk] Users might expect the study-ID filter to understand the `study-NNNN` format and be surprised when typing `42` matches any ID containing `42`** → **Mitigation:** The input uses `type="search"` with a placeholder like `Search by study ID`, and the filter operates on the raw substring; the seeded IDs are zero-padded so meaningful collisions are rare. If this becomes confusing, a follow-up change can add smarter matching (for example, zero-padding the typed number before comparison).
- **[Risk] Client-side filtering over a very large catalog could become noticeable** → **Mitigation:** At the current MVP scale the list is small and `useMemo` recomputes the filtered array only when the inputs change. The document explicitly defers server-side filtering to a later iteration when the dataset justifies it.
- **[Risk] The `Clear filters` button toggling in and out of the filter bar could cause layout jitter on narrow viewports** → **Mitigation:** The filter bar uses `flex-wrap: wrap` and the button has a fixed horizontal placement at the end of the row; because it appears only when a filter is active, the user always has a cue that something changed and the bar height is the same whether the button is visible or not.
- **[Risk] Tests that query the All studies list by an exact count or by specific seeded studies could become brittle when the filter bar is introduced** → **Mitigation:** Update the existing tests to assert against the rendered-after-filter list (`filtered.length`) and to exercise the filter bar explicitly; avoid hardcoding seeded counts where possible.
- **[Trade-off] No URL persistence of filters in this change** → Accepted: simplifies the first iteration and defers a real decision about shareable filtered views until we have usage data.
- **[Trade-off] `"All"` sentinel values in dropdown state are slightly less type-safe than a nullable union** → Accepted: the component layer is the only place that sees the sentinel, and using a literal `'All'` keeps the `<select>` value string stable and the predicate compact.

## Migration Plan

1. Add `STUDY_TYPE_OPTIONS` (and, if helpful, `isStudyTypeOption`) to `frontend/src/sections/constants.ts` so every closed-vocabulary dropdown in the app uses the same source.
2. In `frontend/src/pages/AllStudiesPage.tsx`:
   - Introduce local state for `idQuery`, `therapeuticArea`, `phase`, and `studyType` (each dropdown defaults to `'All'`).
   - Compute `filteredStudies` with `useMemo` using the AND-combined predicate described in Decision 1.
   - Render the new `.study-filter-bar` between the panel header and the list, with labeled controls wired to state.
   - Replace the count badge text with the `X of Y studies` form when any filter is active.
   - Add the filtered-empty state branch and the `Clear filters` button.
3. Update `frontend/src/App.css` to add the filter-bar layout rules, reusing existing input/select styles where possible.
4. Update `frontend/src/App.test.tsx` (and any other tests that touch the All studies list) to exercise the filter bar: setting each filter narrows the list, combinations AND together, `Clear filters` resets everything, and the filtered-empty state renders when no study matches.
5. Run the frontend test suite and manually verify the `All studies` page at desktop, tablet, and narrow viewport widths.

No backend, API, or data migration is involved. The change is purely additive on the frontend; rollback is a straightforward revert of the touched files.
