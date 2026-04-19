## Why

The `All studies` list card currently stacks each attribute on its own line (phase tag, study ID, therapeutic area, patient population, metadata row), which wastes horizontal space and makes the list feel long even with only a handful of studies. As we expand the seeded catalog toward dozens or hundreds of example studies, scanning the list will become painful unless each card is denser and carries more useful at-a-glance information.

## What Changes

- Tighten the `All studies` study card layout to use the full horizontal width instead of stacking every attribute vertically:
  - Render the phase tag on the same line as the study ID, with the ID visually primary and the phase as a trailing pill.
  - Render the therapeutic area inline before the patient population, separated by a visible middle-dot separator (` · `).
  - Keep the existing metadata row (`participants`, `arms`, `criteria`) as a compact footer, but align it to the same horizontal band so the card reads as two short lines instead of five.
- Add the study type to the card so users can distinguish interventional vs. observational studies without opening the study.
- Add the `First patient, first visit` milestone to the card using the short label `FPFV` so users can scan study timing at a glance; when the milestone is not set, omit the entry entirely rather than printing a placeholder.
- Reduce vertical padding and per-row gap on the card so many cards fit in a single viewport, without changing the overall card border, radius, or hover affordance.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `study-registration`: Tightens the `All studies` list presentation contract — what each card SHALL show and how the primary identifiers and clinical attributes SHALL be laid out.

## Impact

- Frontend `AllStudiesPage.tsx`: restructured card markup (header row with ID + phase pill, clinical line with therapeutic area · patient population, metadata footer including study type and the optional FPFV milestone).
- Frontend `App.css`: adjusted `.study-card`, `.study-card-phase`, `.study-card-metadata` styles (header row, inline separator, tighter padding/gap, horizontal alignment).
- Frontend tests covering the `All studies` list: assertions updated to reflect the new card structure.
- No backend, API, or domain changes.
