## 1. Assistant module scaffolding

- [x] 1.1 Create `frontend/src/assistant/` with an `index.ts` barrel export for the dock component, state machine, similarity module, and skill registration helpers.
- [x] 1.2 Add `frontend/src/assistant/types.ts` with the public types: `AssistantTurn`, `AssistantPrompt`, `MenuOption`, `SkillDefinition`, `AssistantContext` (current study or draft, list of other studies, dimensions), and the callback shape `onAddCriterion(group, criterion)`.
- [x] 1.3 Add colocated stylesheet `frontend/src/assistant/assistant.css` with the FAB, drawer, thread, bubble, and menu button styles consistent with the existing CSS variables.

## 2. Deterministic similarity heuristic

- [x] 2.1 Add `frontend/src/assistant/similarity.ts` exposing `similarityScore(current, other)` returning an integer per Decision 6 of the design (+3 therapeutic area, +2 phase, +1 study type, +1 per shared eligibility `dimensionId`).
- [x] 2.2 Implement `rankStudies(current, others)` that returns `others` sorted by descending score and ascending `studyId` for ties, excluding the current study.
- [x] 2.3 Implement `collectSuggestions(current, rankedOthers, limit = 3)` that walks ranked studies and collects up to `limit` criteria (inclusion first, exclusion second per study) that are not already present in the current draft, preserving the source study identifier and the group (`inclusion` | `exclusion`) on each suggestion.
- [x] 2.4 Implement `isSameCriterion(a, b)` and use it in `collectSuggestions` and in the copy-from-study menu filter so duplicates are skipped consistently.
- [x] 2.5 Add unit tests in `frontend/src/assistant/similarity.test.ts` covering: exact scoring breakdown, tie-breaking by study id, empty current-draft fallback, no-other-studies case, and the "up to three, no duplicates" extraction rule.

## 3. Conversation state machine

- [x] 3.1 Add `frontend/src/assistant/state.ts` exporting the `AssistantState` (thread + active prompt), the `createInitialState(skills)` factory that seeds the intro turns and the root menu, and the pure `reducer(state, action)` function.
- [x] 3.2 Support the action `SELECT_OPTION` that appends a user turn with the option label, runs the option's resolver to produce bot turns and the next prompt, and commits them to the state. Support `CLEAR_CHAT` that returns the output of `createInitialState(skills)`.
- [x] 3.3 Implement the root menu resolver dispatching to `copy-from-study` and `suggest-relevant-criteria` skill state machines.
- [x] 3.4 Implement the `copy-from-study` sub-state: study picker menu (built from `context.otherStudies`, excluding the current study), criterion picker menu (built from the selected study's filtered criteria), and the acknowledgement turn generator that calls `onAddCriterion`. The criterion picker SHALL remain navigable until the user chooses `Pick another study` or `Back to main menu`.
- [x] 3.5 Implement the `suggest-relevant-criteria` sub-state: use `rankStudies` + `collectSuggestions` to build the three-option menu, and on acceptance emit an acknowledgement turn plus a follow-up menu with `Suggest three more` and `Back to main menu`. `Suggest three more` SHALL re-run suggestion collection against the updated draft.
- [x] 3.6 Cover empty-result edge cases: no other studies to copy from, no distinct suggestions to propose. Each SHALL emit a bot turn explaining the situation and a menu with `Back to main menu` as the only action.
- [x] 3.7 Add unit tests in `frontend/src/assistant/state.test.ts` that drive end-to-end conversations for both skills using a fake `context` and a spy `onAddCriterion`. Assert the thread, the active prompt, and the spy calls at every step.

## 4. Chat dock component

- [x] 4.1 Create `frontend/src/assistant/AssistantChatDock.tsx` accepting `skills`, `context`, and `onAddCriterion` as props. Internally hold the `AssistantState` via `useReducer`.
- [x] 4.2 Render the FAB at the bottom-right of the viewport with an accessible label. Toggling the FAB SHALL open or close the drawer without discarding the state.
- [x] 4.3 Render the drawer with the header (`StudyHub assistant` title, `Clear chat` action, close button), the scrollable thread, and the inert footer row mimicking the `Ask anything…` input with the paper-clip icon. The input SHALL be `disabled` with an explanatory placeholder.
- [x] 4.4 Render bot turns left-aligned and user turns right-aligned. The latest bot turn that exposes a menu SHALL render its menu options as full-width pill buttons; older bot turns keep their menu options visible but disabled once a new menu supersedes them, so the thread reads as a chronological log.
- [x] 4.5 Implement auto-scroll to the latest turn when the thread grows, using a ref on the bottom sentinel and `scrollIntoView({ block: 'end' })`.
- [x] 4.6 Wire `Clear chat` to dispatch `CLEAR_CHAT`. Wire close button to collapse the drawer without dispatching `CLEAR_CHAT`.

## 5. Wire the dock into the Eligibility criteria screen

- [x] 5.1 In `frontend/src/sections/EligibilityCriteriaScreen.tsx`, prepare the `AssistantContext` value: current `inclusionCriteria` and `exclusionCriteria` drafts, current study metadata (therapeuticArea, phase, studyType, id), the list of other registered studies (obtained via `listStudies()` fetched on mount and refreshed when the dock opens), and the eligibility dimensions already exposed via `SectionContext`.
- [x] 5.2 Pass `onAddCriterion(group, criterion)` into the dock. The callback SHALL append the criterion to the correct `useState` setter (`setInclusionCriteria` / `setExclusionCriteria`) using `criteriaToDrafts` so the drafts remain compatible with the editor.
- [x] 5.3 Mount `<AssistantChatDock />` inside `EligibilityCriteriaScreen` (outside the form element) so the drawer floats over the editor layout.
- [x] 5.4 Guarantee the dock clears on unmount (switch screens, discard draft) by letting `useReducer` live inside the dock component whose key is tied to the current study id or the literal `'new'` string.

## 6. Load other studies for the assistant

- [x] 6.1 In `frontend/src/assistant/useOtherStudies.ts` (new file), implement a hook that fetches the full study list via `listStudies()` once and returns `{ otherStudies, isLoading, error, reload }`, filtering out the current study by id (or nothing when in new-study mode).
- [x] 6.2 Call the hook from `EligibilityCriteriaScreen` when the dock is visible, lazily (only after the first FAB open) to avoid paying the cost on every visit to the section.
- [x] 6.3 Surface load errors inside the chat thread as a bot turn with a `Retry` option and a `Back to main menu` option. Do NOT crash the drawer or the host screen.

## 7. Component and integration tests

- [x] 7.1 Add `frontend/src/assistant/AssistantChatDock.test.tsx` that renders the dock with a fixed `context` and asserts: intro turns appear, root menu offers the two skills, clicking `Copy criteria from another study` opens the study picker, picking a study opens the criterion menu, clicking a criterion triggers `onAddCriterion` with the expected `(group, criterion)` pair, and `Back to main menu` returns to the root menu with history preserved.
- [x] 7.2 Add a test for the suggestion flow: seed the dock with a current draft and two other studies, assert the three offered suggestions are the ones the heuristic should pick, pick one, and assert `onAddCriterion` is called with the matching group + criterion and that `Suggest three more` regenerates without repeating the accepted suggestion.
- [x] 7.3 Add an `EligibilityCriteriaScreen` integration test that verifies: opening the dock, copying one criterion from another study, and asserting the editor now displays the new criterion AND that no network request to `/api/studies/:id/eligibility` has been made until the user activates `Save`.
- [x] 7.4 Add a test that navigating away from the `Eligibility criteria` screen discards the conversation (reopening the dock replays the intro turn).
- [x] 7.5 Add a test that `Clear chat` resets the thread to the intro state while keeping the dock open.

## 8. Styling polish and accessibility pass

- [x] 8.1 Verify the FAB has a visible focus style and an `aria-label` describing its action (`Open StudyHub assistant`).
- [x] 8.2 Verify the drawer container uses `role="complementary"` with an `aria-labelledby` pointing at the drawer title, and traps focus in a sensible manner when open (at minimum, the first menu button receives focus when the drawer opens or a new menu renders).
- [x] 8.3 Confirm bot bubbles, user bubbles, and menu buttons meet contrast requirements against the drawer background using the existing CSS color tokens.
- [x] 8.4 Confirm the drawer renders correctly in both edit mode and new-study mode (no layout regressions, FAB still visible, drawer does not clash with `SectionFooter`).

## 9. Documentation

- [x] 9.1 Update `README.md` to mention the assistant on the `Eligibility criteria` screen and link to the heuristic description.
- [x] 9.2 Add `docs/assistant-heuristic.md` explaining the similarity scoring formula, the suggestion-collection rule, and the explicit non-AI nature of the feature.

## 10. Verification

- [x] 10.1 Run the frontend test suite (`pnpm test`) and confirm all new unit/component tests pass alongside existing ones.
- [x] 10.2 Run the backend test suite (`go test ./...`) to confirm no backend assumptions have shifted despite this change being frontend-only.
- [x] 10.3 Manually verify on a local dev build that the FAB appears only on the `Eligibility criteria` screen for both an existing seeded study and a new-study draft, that both skills complete end-to-end, and that saved/published studies correctly include the assistant-contributed criteria.
