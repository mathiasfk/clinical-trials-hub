## Context

The MVP study registration flow works end-to-end but feels unpolished. Concrete pain points observed:

- Typography across the app uses a relatively large default scale that reads as heavy and unprofessional on dense screens.
- Backend study ID generation (`service.NewSequentialIDGenerator`) uses a process-local counter that starts at zero on every boot. Seed data inserts `study-0001` and `study-0002`, so the first created study after startup gets `study-0001` and fails the create call (or silently collides depending on repository behavior).
- Section screens duplicate the same information the app header already renders: `ContentHeader` shows "Study / study-0002 / Summary" and the `SummaryScreen` component itself also renders a `Summary` heading.
- `Study information` accepts free-text for `Phase` and `Therapeutic area`. This produces inconsistent values across studies and makes filtering impossible.
- The current registration flow has no place to capture schedule-of-activities milestones the product team needs for downstream views (FPFV, LPFV, protocol approval date).
- The eligibility criteria editor shows each criterion as a tall card with explicit field labels (`Dimension`, `Operator`, `Value`, `Unit`), an editable `Unit` control, and an inline description of the selected dimension. This is verbose and error-prone. Since every supported dimension has exactly one canonical unit today, `Unit` should be derived, not edited.
- The minimum-validity contract for `Eligibility criteria` currently requires at least one inclusion AND at least one exclusion criterion, which is stricter than what clinicians actually need to get started. The product wants to allow a study with, e.g., inclusion-only rules.

## Goals / Non-Goals

**Goals:**
- Ship a lighter, consistent typography scale without a design-system overhaul.
- Make backend-issued study IDs globally unique against the current repository contents, regardless of restart timing or seed data.
- Consolidate the header so `<studyId>` (or `New study`) and the active subsection name are rendered together, and remove the redundant per-screen titles.
- Standardize `Phase` and `Therapeutic area` to a closed vocabulary with dropdown UX and backend validation.
- Capture three optional SOA milestone dates on `Study information`.
- Relax the eligibility minimum-validity contract to "at least one criterion total across inclusion and exclusion".
- Make the eligibility editor compact (one row per criterion), label-free, and auto-resolve `Unit` from the chosen dimension, with a hover tooltip for the dimension's full description.

**Non-Goals:**
- Introducing a component library or theme system (typography changes stay in the existing CSS files).
- Adding filtering, sorting, or analytics by the new standardized fields.
- Supporting multiple units per dimension or unit conversion.
- Persisting SOA activities beyond the three milestone dates (no per-visit schedule).
- Changing the HTTP API shape for eligibility (it already takes structured criteria).

## Decisions

1. **Make study ID generation repository-aware**
   - **Decision:** Replace `NewSequentialIDGenerator(prefix)` with an ID generator that consults the current repository state and returns the next available `<prefix>-NNNN` identifier that is not already in use. The generator SHALL be provided to `StudyService` at composition time and SHALL resolve the next ID at create time (not at process boot). The sequence SHALL continue past the highest existing numeric suffix so IDs remain human-readable and monotonically increasing.
   - **Rationale:** The counter-based generator is not aware of seeded or previously persisted records and collides predictably. Resolving at create time using the repository is simple, keeps the generator pure (no shared mutable state), and preserves the `study-0001`, `study-0002`, … format already relied on by tests and docs.
   - **Alternatives considered:** Seed the counter at startup from the repository. Rejected because it still races with concurrent creates and hides the intent (the invariant is "no collisions", not "counter starts at N"). Using UUIDs. Rejected because existing UX and tests depend on the readable sequential format.

2. **Combine header identifier and section into a single title**
   - **Decision:** `ContentHeader` SHALL render a single title `<studyId> > <section>` (e.g., `study-0002 > Summary`, or `New study > Study information`) and each section screen component SHALL NOT render its own H1 title. Breadcrumb styling stays lightweight — same element as today, just a different composition rule.
   - **Rationale:** The current duplication makes screens feel noisy. Centralizing the title in the header guarantees consistency across sections and keeps each section component focused on its form content.
   - **Alternatives considered:** Keep duplicate titles and distinguish them by hierarchy. Rejected because the information is identical and adds visual weight with no value.

3. **Closed vocabularies for phase and therapeutic area**
   - **Decision:** Define the allowed values as frontend constants reused both by the dropdown components and by shared validation. Mirror the same allow-list on the backend `StudyInformation` validation so the API rejects arbitrary strings. The allowed values are:
     - `Phase`: `Phase 1`, `Phase 2`, `Phase 3`, `Phase 4`.
     - `Therapeutic area`: `Cardiovascular`, `Diabetes`, `Hematology`, `Sickle Cell Disease`, `Obesity`, `Rare Diseases`.
   - **Rationale:** A closed vocabulary enforced on both sides prevents drift between UI options and stored values. Keeping the constants in shared locations (`frontend/src/sections/constants.ts` and `backend/internal/domain/study.go`) keeps the source of truth explicit per tier.
   - **Alternatives considered:** Pull the vocabulary from a backend endpoint (like dimensions). Rejected as overkill for stable short lists; revisit only if values start to vary by tenant.

4. **SOA milestones as three optional date fields**
   - **Decision:** Add `firstPatientFirstVisit`, `lastPatientFirstVisit`, and `protocolApprovalDate` as optional ISO-8601 date strings (`YYYY-MM-DD`) on both the frontend type and the backend domain model. All three are optional and independent; no cross-field ordering is enforced at this stage.
   - **Rationale:** Dates are independently useful and often entered at different moments in study preparation. Enforcing ordering now would create friction without product value. ISO-8601 date (no time component) is sufficient for milestone tracking.
   - **Alternatives considered:** Timestamps with timezone. Rejected because milestone dates are conceptually day-level. A nested `soa` object. Rejected to keep the Study payload flat and easy to diff.

5. **Relaxed eligibility minimum-validity contract**
   - **Decision:** The minimum-validity contract for `Eligibility criteria` becomes: the study MUST contain at least one criterion in total (inclusion or exclusion); there is no longer a requirement to have both. Per-criterion rules (non-empty description, complete deterministic rule with dimension/operator/value, unit when required) remain unchanged.
   - **Rationale:** Real protocols sometimes start with inclusion-only or exclusion-only rules. Requiring both up front forces users to invent filler criteria. The per-criterion completeness rules already guarantee every saved criterion is meaningful.
   - **Alternatives considered:** Keep the stricter rule. Rejected per user feedback. Require N ≥ 2 total. Rejected as arbitrary; N ≥ 1 matches the "can we publish something useful" threshold.

6. **Compact table layout and auto-unit for eligibility editor**
   - **Decision:** Render each criterion as a single row with two columns, `Description` and `Criteria`. The `Criteria` column renders inline controls for `Dimension`, `Operator`, and `Value` (no field labels, placeholders only). `Unit` is not directly editable — it is derived from the selected dimension via the existing `EligibilityDimension.allowedUnits` metadata (the first/only allowed unit is used) and rendered as a read-only adornment. Until a dimension is selected, the unit slot SHALL be hidden. A tooltip on the dimension name SHALL expose the dimension's full description on hover/focus.
   - **Rationale:** Every supported dimension today declares a single canonical unit, so the "Unit" field is redundant UI. Moving the description into a tooltip keeps the row compact while keeping the educational content discoverable. Dropping labels in favor of placeholders is standard for dense table editors.
   - **Alternatives considered:** Keep an editable Unit dropdown gated on dimensions with more than one unit. Deferred — we can reintroduce a visible unit control if/when a dimension declares more than one allowed unit. Show description inline as helper text. Rejected for adding vertical noise per row.

7. **Keep a single H1 (title) per screen in the app shell**
   - **Decision:** Only the header composed by the shell renders an `<h1>`. Section screens switch to `<h2>` or plain `<div>` for in-form headings if they need any. Validation errors, submit buttons, and helper text are not affected.
   - **Rationale:** Avoids multiple H1 elements on the same page (accessibility and semantics). Reinforces that the shell owns navigational context.

## Risks / Trade-offs

- **[Risk] Repository-aware ID generation requires a list scan on create** → **Mitigation:** Scan the in-memory repository's current IDs once per create call (O(N) on a small dataset). If the store grows, replace with a maintained "max suffix" counter persisted alongside records.
- **[Risk] Closed vocabulary on backend rejects previously persisted studies with different strings** → **Mitigation:** There is no durable storage today (in-memory only), so no migration is needed. Update seed data in the same change so freshly booted instances satisfy the new validation.
- **[Risk] Header-owned title breaks deep-linked screenshots/tests that asserted section H1s** → **Mitigation:** Update the frontend tests that probed section headings to assert the combined header title instead.
- **[Risk] Relaxed eligibility minimum could let users publish studies with a single trivial criterion** → **Mitigation:** Per-criterion validation (non-empty description, complete rule, valid dimension/operator/value) remains; this change only relaxes the aggregate count rule.
- **[Risk] Auto-resolved unit hides a potential future case where a dimension supports multiple units** → **Mitigation:** Keep `allowedUnits` as a list in the registry and in the shared type; re-introduce a visible unit control when a dimension declares `allowedUnits.length > 1`.
- **[Trade-off] Typography polish via CSS edits without a design system** → Changes are localized to `index.css`/`App.css`. Acceptable for MVP scope; revisit if we introduce a component library.

## Migration Plan

1. Land backend changes first: domain fields for SOA milestones, repository-aware ID generator, validation for phase/therapeutic-area vocabularies, and relaxed eligibility aggregate rule. Update seeds and existing backend tests.
2. Land shared TypeScript type updates to mirror new domain fields.
3. Land frontend changes: typography scale, header-owned title, section screen title removals, study information dropdowns and SOA inputs, eligibility editor table layout, and validation updates. Update frontend tests.
4. No data migration is required (in-memory repository). The first post-deploy backend boot re-seeds with the new fields populated for the two seed studies.
