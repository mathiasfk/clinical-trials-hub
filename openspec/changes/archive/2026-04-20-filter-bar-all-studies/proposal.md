## Why

As the seeded study catalog has grown and users now land on `All studies` as the default scanning surface, browsing the full list by eye is no longer sufficient to locate relevant studies. Users need a way to narrow the list by the handful of attributes that actually drive study selection — the study identifier, the therapeutic area, the phase, and the study type — so finding a study feels like a quick filter instead of a scroll hunt.

## What Changes

- Add a persistent filter bar at the top of the `All studies` panel, above the list of study cards and below the panel header, allowing the user to narrow the rendered list by:
  - **Study ID**: a free-text input that matches study identifiers by substring (case-insensitive), so the user can type a partial ID like `0007` or `study-01` and see only matching studies.
  - **Therapeutic area**: a dropdown whose options are exactly the `THERAPEUTIC_AREA_OPTIONS` closed vocabulary (with an "All" entry that disables the filter), so selecting one value renders only studies in that area.
  - **Phase**: a dropdown whose options are exactly the `PHASE_OPTIONS` closed vocabulary (with an "All" entry), so selecting one value renders only studies in that phase.
  - **Study type**: a dropdown whose options cover every supported `StudyType` value (`parallel`, `crossover`, `single-arm`) plus an "All" entry.
- Combine active filters with AND semantics: a study is rendered only when it matches every filter that is currently set; filters set to "All" (or, for Study ID, an empty string) do not constrain the list.
- Update the existing panel count badge (currently `{studies.length} studies`) to reflect the filtered result, e.g. `3 of 12 studies`, so users can see at a glance both the matching count and the total.
- Provide a single `Clear filters` action that resets every filter to its "All"/empty state, visible only when at least one filter is active.
- Render a distinct empty state when all studies are filtered out (e.g. `No studies match the current filters.`) that is visually distinguishable from the existing "no studies registered yet" empty state and from the loading state.
- Keep the filter state local to the `All studies` screen for this iteration: filters reset when the user navigates away from `All studies` and back; there is no URL-query-string persistence in this change.
- No backend, API, or domain model changes: all filtering happens on the client over the already-loaded `studies` array returned by the existing list endpoint.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `study-registration`: Extends the `All studies` list presentation contract — what the panel SHALL expose for filtering and how the rendered study list SHALL respond to the active filter values.

## Impact

- Frontend `frontend/src/pages/AllStudiesPage.tsx`: introduces local filter state (`idQuery`, `therapeuticArea`, `phase`, `studyType`), derives the filtered list, renders the new filter bar above the study cards, adjusts the count badge, and adds the filtered-empty and `Clear filters` affordances.
- Frontend `frontend/src/sections/constants.ts`: reused as the source of truth for the `Phase` and `Therapeutic area` dropdown options (no new constants required); a new `STUDY_TYPE_OPTIONS` constant and `StudyTypeOption` type may be added alongside the existing `PHASE_OPTIONS` and `THERAPEUTIC_AREA_OPTIONS` to keep vocabulary-based dropdowns co-located.
- Frontend `frontend/src/App.css`: adds selectors for the filter bar layout (`.study-filter-bar`, filter controls, `Clear filters` button), using existing form/control styles where possible.
- Frontend tests (`frontend/src/App.test.tsx`): new coverage asserting the filter bar renders with the expected controls, that setting each filter narrows the rendered list, that filters combine with AND semantics, that `Clear filters` resets the list, and that the filtered-empty state renders when no study matches.
- No backend, API, or persistence changes; no new dependencies.
