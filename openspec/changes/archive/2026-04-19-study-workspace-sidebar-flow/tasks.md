## 1. Backend: full-study update endpoint

- [x] 1.1 Add service method to replace an existing study by id with a full payload, returning validation errors on missing/invalid required fields.
- [x] 1.2 Add HTTP handler `PUT /api/studies/{id}` that wires the service method, reusing the existing create payload shape (`StudyCreateInput`).
- [x] 1.3 Update CORS allowed methods to continue including `PUT` (already present) and verify the new route is reachable.
- [x] 1.4 Add unit tests for the service covering: successful replace, not-found id, and validation errors.
- [x] 1.5 Add HTTP-level tests for the new handler covering success, validation errors, and not-found.

## 2. Frontend: persistent app shell and routing

- [x] 2.1 Create `AppShell` component that renders the sidebar and a content-area `<Outlet />`.
- [x] 2.2 Create a `Sidebar` component with two sections: `All studies` (always rendered) and `Study outline` (rendered only when an active study or new-study draft exists).
- [x] 2.3 Create a `ContentHeader` component that displays the active study identifier (or "New study" for an unpublished draft) and the current subsection name on all study-scoped routes.
- [x] 2.4 Restructure routes so that `AppShell` is the root element: `/studies` (list), `/studies/new/:section`, `/studies/:studyId/:section`, with redirects for default subsections (`/studies/:studyId` → `/studies/:studyId/summary`, `/studies/new` → `/studies/new/study-information`).
- [x] 2.5 Add an `ActiveStudyContext` (or equivalent) used by `Sidebar` and `ContentHeader` to decide whether to render `Study outline` and what to display in the header.

## 3. Frontend: new-study draft state

- [x] 3.1 Implement a `NewStudyDraftProvider` with a React reducer that holds draft fields for study information, objectives, endpoints, and eligibility criteria.
- [x] 3.2 Expose draft read/update hooks for section screens and a publish/discard action pair.
- [x] 3.3 Ensure the provider mounts at the start of the new-study flow and tears down on `Publish` or `Discard`.
- [x] 3.4 Add an "Unpublished draft" indicator in the header or sidebar while a draft is active.

## 4. Frontend: All studies view changes

- [x] 4.1 Remove the inline `CreateStudyForm` from `AllStudiesPage`.
- [x] 4.2 Add a "New study" button on `AllStudiesPage` that navigates to `/studies/new/study-information`.
- [x] 4.3 Ensure the sidebar on `AllStudiesPage` shows only the `All studies` section (no `Study outline`).
- [x] 4.4 Verify the `All studies` view remains the default landing view (root `/` redirects to `/studies`).

## 5. Frontend: section screens (shared between edit and new-study modes)

- [x] 5.1 Create `StudyInformationScreen` with fields for `phase`, `therapeuticArea`, `patientPopulation`, `studyType`, `participants`, and `numberOfArms`, ending with a single mode-aware footer button.
- [x] 5.2 Create `ObjectivesScreen` editor ending with a single mode-aware footer button.
- [x] 5.3 Create `EndpointsScreen` editor ending with a single mode-aware footer button.
- [x] 5.4 Refactor the existing `EligibilityCriteriaPage` so its editor component can be reused by both modes, ending with a single mode-aware footer button.
- [x] 5.5 Implement a shared footer-button component whose label is `Save` in edit mode and `Next` in new-study mode; ensure only one of the two labels is rendered per screen based on mode.
- [x] 5.6 Implement mode-aware button behavior: in edit mode the `Save` button calls the backend (`PUT /api/studies/{id}` for 5.1–5.3, `PUT /api/studies/{id}/eligibility` for 5.4) and stays on the screen with a success indication; in new-study mode the `Next` button writes the data to the draft without any backend call and navigates to the next section in the wizard order.
- [x] 5.7 Implement a shared `validateSection(section, data)` function that encodes the minimum-validity contract for every section: `Study information` (required `phase`, `therapeuticArea`, `patientPopulation`, `studyType`, `participants >= 1`, `numberOfArms >= 1`), `Objectives` (≥1 objective, each trimmed length > 10), `Endpoints` (≥1 endpoint, each trimmed length > 10), `Eligibility criteria` (≥1 inclusion and ≥1 exclusion criterion, each with non-empty description and complete deterministic rule).
- [x] 5.8 Wire `validateSection` to run on both `Save` (edit mode) and `Next` (new-study mode); on failure, block the action, render inline errors next to offending fields, and preserve user input.
- [x] 5.9 Surface server-side validation errors returned by the backend in edit mode alongside any client-side errors.

## 6. Frontend: Summary screen variants

- [x] 6.1 Implement a read-only Summary variant for existing studies with section cards for `Study information`, `Objectives`, `Endpoints`, and `Eligibility criteria`, each with a pencil icon in its card header that routes to the corresponding section screen.
- [x] 6.2 Render the `Eligibility criteria` card as a list of inclusion and exclusion descriptions only (no rule metadata), with the pencil icon routing to the full `Eligibility criteria` screen.
- [x] 6.3 Implement a new-study Summary variant that renders the same read-only cards populated from the draft and exposes `Publish` and `Discard` buttons instead of pencil icons.
- [x] 6.4 Before calling the backend on `Publish`, re-run `validateSection` for every section of the draft; if any section is invalid, block the request, render a per-section incomplete-sections summary on `Summary`, and expose a link that navigates to the first incomplete section.
- [x] 6.5 Wire `Publish` (only when the full-draft validation passes) to create the study via `POST /api/studies`, clear the draft, and navigate to `/studies/{newId}/summary` in edit mode.
- [x] 6.6 Implement a reusable `ConfirmModal` component (with confirm and cancel actions, keyboard-accessible, and dismissible via backdrop/Escape).
- [x] 6.7 Wire `Discard` to open the `ConfirmModal`; on confirm, clear the draft and navigate to `/studies`; on cancel or dismiss, keep the draft intact and stay on `Summary`.

## 7. Frontend: navigation and wizard ordering

- [x] 7.1 Define a single `SECTION_ORDER` constant for the new-study wizard: `study-information` → `objectives` → `endpoints` → `eligibility` → `summary`.
- [x] 7.2 Ensure clicking any sidebar subsection within the new-study flow navigates to that section while preserving draft data.
- [x] 7.3 Ensure clicking any sidebar subsection within the edit flow navigates to that section for the active study.
- [x] 7.4 Ensure each screen's header shows the correct subsection name for both modes.

## 8. Tests and cleanup

- [x] 8.1 Update or remove existing frontend tests that relied on the inline creation form in `AllStudiesPage`.
- [x] 8.2 Add component/integration tests covering: sidebar visibility on `All studies`, wizard advancement on `Next` in new-study mode, `Publish` creating a study and routing to its edit summary, `Discard` clearing the draft, and pencil icons routing from edit-mode summary to the correct section screens.
- [x] 8.3 Add a test ensuring that the edit-mode Summary screen never renders `Publish`/`Discard` and that the new-study Summary screen never renders pencil icons.
- [x] 8.4 Add a test ensuring each section screen renders `Save` in edit mode and `Next` in new-study mode, and never both labels simultaneously.
- [x] 8.5 Add tests for `validateSection` covering happy paths and each failure case per section (empty requireds, objective/endpoint length ≤ 10, missing inclusion or exclusion criterion, incomplete deterministic rule).
- [x] 8.6 Add component tests asserting that `Next` (new-study) and `Save` (edit) are blocked with inline errors when `validateSection` fails.
- [x] 8.7 Add a component test that `Publish` is blocked when any section of the draft is invalid, renders a list of incomplete sections, and navigates to the first incomplete section when the user clicks the link.
- [x] 8.8 Add component tests for the Discard flow: clicking `Discard` opens the confirm modal; confirming clears the draft and navigates to `/studies`; canceling leaves the draft intact on `Summary`.
- [x] 8.9 Update seeded data documentation or README snippets that reference the old single-form creation flow. (No references found in README.md or frontend/README.md.)
- [x] 8.10 Run `openspec validate "study-workspace-sidebar-flow" --strict` and `pnpm -w lint && pnpm --filter frontend test && cd backend && go test ./...` before archiving.

## 9. Post-implementation polish

- [x] 9.1 Render the All studies "New study" control as a real `<button>` (not a `Link`) that programmatically navigates to `/studies/new/study-information`.
- [x] 9.2 Remove the "Refresh studies" button from `AllStudiesPage` and refresh the list automatically on mount.
- [x] 9.3 Give the `age` eligibility dimension the unit `years old`; update seed data and backend tests that previously sent `age` with an empty unit.
