## Context

The MVP study-registration workspace already ships a sidebar with `Summary` and `Eligibility criteria`, structured eligibility criteria, and an `All studies` home view. The frontend embeds study creation inside the `All studies` screen as a large single form, and treats the sidebar as a per-study component rendered only inside `StudyWorkspace`. Summary mixes display and an edit entry point only for eligibility criteria.

The next product iteration needs a persistent application shell with a fixed sidebar that is visible on every screen, a richer `Study outline` with five subsections, and two distinct flows: a guided new-study wizard ending at `Summary` (with `Publish`/`Discard`), and an edit flow that starts at a read-only `Summary` with per-section pencil shortcuts to dedicated edit screens.

Constraints:
- Backend persistence today supports `POST /api/studies` for full creation and `PUT /api/studies/{id}/eligibility` for eligibility updates. There is no per-field update endpoint for study information, objectives, or endpoints.
- In-memory storage and the React/Vite/pnpm stack are fixed by `platform-bootstrap`.
- No authentication or draft persistence service exists; new-study drafts must live in the browser until `Publish`.

## Goals / Non-Goals

**Goals:**
- A single persistent app shell that owns the sidebar and the selected-study context across `All studies`, study edit screens, and new-study registration screens.
- Clear, declarative structure for the `Study outline` sidebar section: `Summary`, `Study information`, `Objectives`, `Endpoints`, `Eligibility criteria`.
- Header on every study screen displays both the selected study and the active subsection.
- Read-only `Summary` for existing studies with per-section pencil icons that route to the correct edit screen.
- Guided new-study flow that reuses the same section editors, shows the sidebar, ends at `Summary` with `Publish` and `Discard`, and advances each section via the `Save` button.
- `All studies` remains the default landing view and keeps the sidebar visible (without `Study outline`).

**Non-Goals:**
- Authentication, multi-user drafts, or server-side draft persistence.
- Redesigning eligibility rule semantics beyond reusing the existing editor.
- Introducing new domain fields for studies.
- Replacing the in-memory storage model.

## Decisions

### Decision: Persistent app shell as the single layout

Introduce a top-level `AppShell` React layout component that renders the sidebar and a content area containing an `<Outlet />`. All routes (`/studies`, `/studies/new/*`, `/studies/:studyId/*`) live under this shell.

Alternatives considered:
- Keep the sidebar only inside `StudyWorkspace`. Rejected — the requirement explicitly demands a consistent shell across `All studies` and the new-study flow.
- Render two different layouts (one with `Study outline`, one without). Rejected — the sidebar is the same component; it just conditionally renders the `Study outline` section based on context.

Rationale: One shell keeps layout, routing, and navigation state in one place and makes it easy to show/hide `Study outline` based on whether a study or new-study draft is active.

### Decision: Sidebar has two explicit sections

Sidebar renders:
1. `All studies` — always present, links to `/studies`.
2. `Study outline` — rendered only when a study or a new-study draft is the active context. Links to the five subsections of that study/draft.

Rationale: Matches the product brief and makes it obvious when the outline applies.

### Decision: Two route families for study context, sharing section screens

Routes:
- `/studies` — All studies list + "New study" button.
- `/studies/new/:section` — New-study wizard steps. Sections: `study-information`, `objectives`, `endpoints`, `eligibility`, `summary` (in this order). `Summary` is last.
- `/studies/:studyId/:section` — Existing study. Sections: `summary`, `study-information`, `objectives`, `endpoints`, `eligibility`. `Summary` is first and read-only.

Each section screen is a single React component that accepts either a draft (new-study) or the persisted study (edit) and renders its editor. The `Summary` screen has two variants driven by mode (`new` vs `edit`).

Alternatives considered:
- Model the new-study wizard as a modal/dialog. Rejected — the sidebar must be visible and navigable.
- Two completely separate component trees for new vs edit. Rejected — duplicates editors; the requirement is to reuse the same screens.

### Decision: New-study draft is held in a client-side store

A `NewStudyDraftProvider` (React Context + reducer) keeps the draft in memory for the lifetime of the new-study session. On `Publish`, the draft is sent via the existing `POST /api/studies`. On `Discard`, the draft is cleared and the user is routed back to `/studies`. Navigating away from `/studies/new/*` without publishing or discarding keeps the draft if the user returns during the same session (behavior: draft survives until `Publish`, `Discard`, or a hard reload).

Alternatives considered:
- Persist drafts in `localStorage`. Rejected for MVP scope — adds complexity without being required.
- Create the study on the backend at the first save and update incrementally. Rejected — would need new backend endpoints and pollutes the list with unpublished records.

### Decision: Per-section footer action differs by mode (`Save` vs `Next`)

- Edit mode: each section screen shows a `Save` button at the end of the form. `Save` persists the current section to the backend and stays on the same screen, showing a success state. The pencil on `Summary` is the navigation path; there is no "next section" chaining.
- New-study mode: each section screen shows a `Next` button instead of `Save`. `Next` validates the current section, writes the data to the in-memory draft, and navigates to the next section in the wizard order. Since the study is not yet persisted, no backend call is made per section — persistence happens only at `Publish` on the final `Summary` step. The label `Next` makes the forward-navigation intent explicit and avoids suggesting that data is being saved to the server.

The underlying button component is shared; only its label (`Save` vs `Next`) and handler vary by mode.

### Decision: Edit-mode per-section persistence strategy

- `Eligibility criteria`: uses existing `PUT /api/studies/{id}/eligibility`.
- `Study information`, `Objectives`, `Endpoints`: added in this change via a single backend endpoint `PUT /api/studies/{id}` that accepts the full study payload. Each section screen sends the current study merged with its section's edits. This avoids five ad-hoc endpoints and matches the existing full-payload shape.

Alternatives considered:
- Three section-specific endpoints. Rejected — more surface area without clear payoff at MVP.
- Forcing all edits through a single "Edit study" form. Rejected — violates the product requirement that each section has its own screen and `Save`.

### Decision: Summary is read-only in edit mode, action-only in new-study mode

- Edit mode: Summary renders section cards (`Study information`, `Objectives`, `Endpoints`, `Eligibility criteria`) with no inline editing. Each card shows a pencil icon in its header that routes to the corresponding section screen. For `Eligibility criteria`, the card shows a condensed list of inclusion and exclusion descriptions only (no rule metadata) — the full editable view is the `Eligibility criteria` screen.
- New-study mode: Summary renders the same cards from the draft data (read-only) and exposes two primary actions: `Publish` (creates the study via backend, clears the draft, navigates to `/studies/:newId/summary` in edit mode) and `Discard` (confirms, clears the draft, navigates to `/studies`).

### Decision: Header always reflects context

The content area header shows:
- On `/studies`: a generic "All studies" title.
- On any study route (new or existing): the study/draft identifier (or "New study" if the draft has no identifier yet) and the active subsection name.

## Risks / Trade-offs

- Draft volatility → Drafts are lost on hard reload. Mitigation: show a small "Unpublished draft" banner so users understand the draft is ephemeral.
- Larger routing surface → Five section routes per mode plus shared components can regress. Mitigation: one `SectionRoutes` definition consumed by both modes.
- Full-payload `PUT /api/studies/{id}` → Clients could overwrite fields they did not intend to change. Mitigation: each section screen starts from the current persisted study and mutates only its section before submitting.
- Reusing the eligibility editor in the new-study wizard requires dimensions to be loaded before the step renders. Mitigation: block wizard entry to `eligibility` (or show a loading state) until dimensions are available, matching current behavior.

## Migration Plan

- Delete the inline study-creation form in `AllStudiesPage` and replace it with a "New study" button routing to `/studies/new/study-information`.
- Lift the sidebar out of `StudyWorkspace` into `AppShell`. Keep `StudyWorkspace` as the loader of an existing study that feeds the shell context.
- Add a backend `PUT /api/studies/{id}` that replaces the persisted record. Existing tests for `POST` and `PUT .../eligibility` remain; new tests cover the full-replace endpoint.
- Update seeded data and existing tests that rely on the old inline creation form.

### Decision: Discard requires a confirmation modal

Activating `Discard` on the new-study `Summary` SHALL NOT immediately clear the draft. Instead it opens a confirmation modal with a clear warning that unsaved draft data will be lost. The draft is cleared and the user is navigated to `/studies` only after the user confirms. Canceling the modal leaves the user on `Summary` with the draft intact.

Alternatives considered:
- Immediate discard on click. Rejected — a single misclick erases the entire wizard draft, which has no backend backup.
- Browser `window.confirm` dialog. Rejected — inconsistent styling and limited affordances; the rest of the app uses custom UI, and the modal also serves as a hook for future "Save as draft" if we add it later.

Rationale: The draft is ephemeral and client-only, so a confirmation step is the only safeguard against accidental loss.

### Decision: Per-section minimum validation on both `Next` and `Publish`

Every section screen defines a minimum-validity contract that the section data MUST satisfy, applied independently in both new-study and edit modes. Examples (non-exhaustive; full rules live in the section-specific spec or component):
- `Study information`: required `phase`, `therapeuticArea`, `patientPopulation`, `studyType`, `participants >= 1`, `numberOfArms >= 1`.
- `Objectives`: at least one objective, each trimmed length `> 10` characters.
- `Endpoints`: at least one endpoint, each trimmed length `> 10` characters.
- `Eligibility criteria`: at least one inclusion criterion and at least one exclusion criterion, each with a non-empty description and a complete deterministic rule.

Validation is triggered in three places:
1. On `Next` in new-study mode: validate only the current section. If invalid, block navigation, show inline errors, and keep the user on the section.
2. On `Save` in edit mode: validate only the current section. If invalid, block the backend call, show inline errors, and keep the user on the section.
3. On `Publish` on the new-study `Summary`: re-validate **every** section of the draft before calling `POST /api/studies`. If any section is invalid, block `Publish`, show a summary of which sections are incomplete, and expose links that navigate to the first offending section. This guards against users who reached `Summary` by clicking sidebar items directly and skipped filling a section.

Alternatives considered:
- Validate only at `Publish`. Rejected — defers feedback too late and makes the wizard feel permissive about invalid data.
- Validate only per section and trust wizard ordering. Rejected — the sidebar allows jumping sections, so the wizard cannot enforce order and `Publish` must re-check.

Rationale: Early per-section feedback plus a final cross-section gate balances usability with a strong guarantee that published studies are well-formed.

## Open Questions

- None.
