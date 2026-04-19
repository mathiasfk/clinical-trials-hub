## Why

The current study-registration experience treats the sidebar as a per-study concept and mixes creation and editing in the same summary screen. The product now needs a persistent app shell with a fixed sidebar that works across all screens (including `All studies`), an expanded study outline with dedicated subsections, and two clearly distinct flows for registering a new study versus editing an existing one, with `Summary` acting as a read-only dashboard for existing studies and as the final review/publish step for new studies.

## What Changes

- Promote the sidebar to a persistent app shell layout that is always visible, including on `All studies`.
- Split the sidebar into two sections: `All studies` (always shown) and `Study outline` (shown only when a study is selected).
- Expand `Study outline` into five subsections: `Summary`, `Study information`, `Objectives`, `Endpoints`, `Eligibility criteria`.
- Display the selected study and the active subsection in the screen header whenever a study is selected.
- Make the `Summary` screen primarily read-only for existing studies: each section block (study information, objectives, endpoints, eligibility criteria) shows a compact summary with a pencil icon that navigates to the dedicated section editor.
- Turn each dedicated section screen (`Study information`, `Objectives`, `Endpoints`, `Eligibility criteria`) into the single place where edits happen, each ending with an explicit `Save` button in the edit-existing-study flow.
- Introduce a new-study registration flow that reuses the same section editors with the sidebar visible; in this mode each section ends with a `Next` button instead of `Save`, since the study is not yet persisted and the intent is forward navigation through the wizard rather than saving to the backend.
- In the new-study flow, `Summary` is the final step and shows `Publish` and `Discard` actions instead of being read-only; in the edit-existing-study flow, `Summary` is the first step and has no publish/discard actions.
- Require a confirmation modal before `Discard` clears a new-study draft, since drafts are not persisted server-side and accidental loss is irreversible.
- Enforce a minimum-validity contract per section (e.g. at least one objective with length > 10 characters, at least one inclusion and one exclusion criterion) that blocks `Next` in the new-study flow and `Save` in the edit flow, and re-run the full-draft validation on `Publish` so users who skipped sections via the sidebar cannot publish an incomplete study.
- Make `All studies` the default landing view; it lists registered studies and exposes a button to start registering a new one.
- **BREAKING**: Remove the current all-in-one study creation form in favor of the guided new-study flow driven by the sidebar and section screens. Users can no longer submit a full study in a single form.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `study-registration`: Replace the current sidebar/summary behavior with a persistent app shell, an expanded study outline, read-only summary for existing studies with per-section edit entry points, and a guided new-study flow where `Summary` is the final step with `Publish`/`Discard` actions.

## Impact

- Changes frontend routing, layout, and navigation state (persistent shell, selected-study context, new-study draft context).
- Changes frontend screens: `All studies`, `Summary`, `Study information`, `Objectives`, `Endpoints`, `Eligibility criteria`, and the new-study registration flow.
- Does not require new backend endpoints beyond what `study-registration` already exposes (list, get, create, update eligibility); existing update capability may be reused for per-section saves in the edit flow, and draft state for new studies is kept on the client until publish.
- Updates any existing frontend integration tests or component tests tied to the previous single-screen creation form and per-study sidebar.
