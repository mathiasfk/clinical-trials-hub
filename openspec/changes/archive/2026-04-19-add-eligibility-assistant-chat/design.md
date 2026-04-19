## Context

We want a "StudyHub assistant" that feels like a chat-based LLM helper but has zero AI dependency. The first scope is the `Eligibility criteria` screen, which today is a pure CRUD editor over `inclusionCriteria` and `exclusionCriteria` and relies on the `/api/studies`, `/api/studies/:id`, `/api/studies/:id/eligibility`, and `/api/eligibility-dimensions` endpoints. There is no existing backend or frontend concept of "assistant", "chat", or "similarity". The stack is React + Vite on the frontend and Go on the backend, with all persistence in-memory.

Constraints driving this design:
- Ship fast: no LLM, no embeddings, no new backend endpoints.
- Deterministic end-to-end: the same inputs must always produce the same assistant responses and the same ordered suggestions.
- Pure menu-driven UX: no free-text box; every user "message" must come from clicking a button rendered by the previous bot turn.
- Must feel like a chat: left-aligned bot bubbles, right-aligned user bubbles, persistent thread, intro message on open, FAB entrypoint, right-side drawer on activation.
- Must not weaken existing eligibility validation. Every criterion the assistant contributes goes through the same validation path as manually-entered criteria.

## Goals / Non-Goals

**Goals:**
- Deliver a reusable `AssistantChatDock` component (FAB + right drawer + thread + menu renderer) that is mounted by section screens and fed a screen-specific "skill set".
- Implement two `Eligibility criteria` skills: `copy-from-study` and `suggest-relevant-criteria`, both driven by a deterministic conversation state machine.
- Implement a pure, unit-tested similarity heuristic over already-stored study fields.
- Keep the assistant additive: it mutates the in-memory form state of the eligibility editor, never the backend directly, so the existing `Save`/`Next` contract stays the single source of truth for persistence.

**Non-Goals:**
- Any real NLP, embeddings, or remote AI call.
- A free-text chat input, voice, or file attachment input (the paper-clip and `Ask anything…` field in the reference screenshot are visual only for MVP and inert for keyboard focus).
- Cross-screen assistant skills (`Objectives`, `Endpoints`, etc.) — this change scaffolds the dock so they can be added later, but does not implement them.
- Persistence of the conversation thread across navigations, reloads, or sessions.
- Backend changes: no new endpoints, no new domain types, no schema migrations.
- Mobile-specific layouts for the drawer (desktop width is adequate for MVP).
- Multi-criterion selection in a single user turn (the menu accepts one choice at a time; users can repeat the flow for more).

## Decisions

1. **Assistant lives entirely on the frontend, fed by existing read endpoints**
   - **Decision:** Add no new backend routes. The assistant loads the full study list via the existing `listStudies()` call and the current study via the existing detail endpoint or `SectionContext`. All scoring, selection, and suggestion rendering run in the browser.
   - **Rationale:** The dataset is small (in-memory seed + a handful of user-created studies), scoring is O(N) on at most a few dozen records, and doing it client-side removes the need for any new domain/API artifact.
   - **Alternatives considered:** A backend `/api/studies/:id/suggestions` endpoint that returns precomputed similar studies. Rejected because it adds API surface with no new persistent state, and every input to the computation is already exposed by existing endpoints.

2. **Assistant dock is a reusable component, not a route**
   - **Decision:** Introduce `frontend/src/assistant/AssistantChatDock.tsx` that renders the FAB and the right-side drawer. The dock accepts a `skills` prop describing available top-level menu entries and their conversation starters. The dock owns the thread state, intro message, and `Clear chat` behavior. `EligibilityCriteriaScreen` composes the dock and supplies the eligibility skills.
   - **Rationale:** A component (not a route) keeps the dock scoped to screens that choose to host it without polluting the router or the shell. The `skills` prop is the extension point for future screens.
   - **Alternatives considered:** Mount the dock globally in `AppShell.tsx` and gate it by route. Rejected because the shell would need to know every screen's skill set, which couples the shell to individual section implementations.

3. **Conversation is a pure state machine over typed turns**
   - **Decision:** Model the thread as an array of `AssistantTurn` objects and the active prompt as `AssistantPrompt`. Each `AssistantPrompt` is the currently rendered menu. Selecting an option runs a deterministic reducer that appends a user turn with the option label, computes the next bot turn(s), and resolves the next prompt. Support the turn kinds: `bot-text`, `bot-menu`, `user-choice`. A menu option carries an `id`, a `label`, and an `action` that the reducer interprets against the current skill scope.
   - **Rationale:** Treating the flow as a state machine with immutable turns makes every conversation step unit-testable without rendering and guarantees determinism — the same sequence of choices always produces the same thread. It also lets us record and replay conversations in tests.
   - **Alternatives considered:** Imperative callbacks that mutate a message list inside components. Rejected: untestable, easy to regress, and conflates rendering with logic.

4. **Two eligibility skills with explicit, closed menus**
   - **Decision:** The `Eligibility criteria` skill set has exactly two entries at the root:
     - `copy-from-study`: Bot asks which study to copy from. The reply menu lists every registered study OTHER than the current one, one button per study, labeled `<studyId> — <therapeuticArea>, <phase>`. Selecting a study transitions to a second menu listing that study's inclusion and exclusion criteria as buttons grouped under two labeled sub-headers. Selecting a criterion appends it to the current study's matching group (inclusion stays inclusion, exclusion stays exclusion) and posts a bot confirmation turn. The menu re-renders with the just-added criterion visibly marked as added and disabled, plus a `Pick another study` button and a `Back to main menu` button.
     - `suggest-relevant-criteria`: Bot computes similarity (see decision 6), picks the top three candidate criteria, and renders them as three buttons, each labeled with the criterion description and its source study id. Selecting a button appends that criterion to the appropriate group of the current study, then posts a confirmation with a follow-up menu: `Suggest three more` (regenerate from remaining criteria) and `Back to main menu`.
   - **Rationale:** Closed menus map directly to the state machine, satisfy "no free-text input", and make "receive the ID of the study" concrete — the selected button's value IS the study ID. The fixed "three" suggestions comes from the user's request.
   - **Alternatives considered:** A single combined flow. Rejected: the two flows diverge in data source (specific study vs. ranked set) and would be harder to explain in the intro message. A free-text ID input for `copy-from-study`. Rejected because it violates the menu-only rule; showing every study as a button is feasible at MVP scale.

5. **Assistant writes to local form state, not to the backend**
   - **Decision:** `EligibilityCriteriaScreen` passes the dock an `onAddCriterion(group, criterion)` callback that appends the criterion to the screen's existing `inclusionCriteria` / `exclusionCriteria` state (via `criteriaToDrafts` so types match). The user commits using the existing `Save` (edit mode) or `Next` (new-study mode) button. The assistant SHALL NOT call `updateStudyEligibility` directly.
   - **Rationale:** Keeps the existing validation contract (including the minimum-validity and per-criterion deterministic rule rules) authoritative and the "review then save" UX intact. The assistant is strictly a drafting helper.
   - **Alternatives considered:** Assistant persists immediately. Rejected because it would bypass validation, create a two-writer problem with the manual editor, and surprise users who expect to review before saving.

6. **Deterministic similarity heuristic over existing fields**
   - **Decision:** Define `similarityScore(current, other)` as:
     - +3 when `therapeuticArea` matches exactly (case-insensitive).
     - +2 when `phase` matches exactly.
     - +1 when `studyType` matches exactly.
     - +1 for each eligibility `dimensionId` that appears in both studies' criteria (counting the dimension once per study regardless of repetition).
     - Studies with a strictly higher score rank first; ties are broken by lower lexicographic `studyId` so ordering is reproducible.
     - When the current study has no therapeutic area, phase, or criteria filled in (typical for a brand-new draft early in the wizard), the heuristic still returns a deterministic ordering (ties-only → pure studyId sort) so the flow still has something to show. If there are no other studies registered, the bot posts a friendly "No other studies to compare with yet" turn and re-offers the main menu.
   - **Decision (suggestion extraction):** After ranking, iterate the top three scoring studies in order and, for each, take its first inclusion criterion followed by its first exclusion criterion that is NOT already present in the current study (same description AND same deterministic rule counts as present). Keep adding until three distinct suggestions are collected; if fewer than three can be collected, show what's available and tell the user why.
   - **Rationale:** Transparent, bounded, easy to unit test. Fields are already present on the `Study` type so no extra data plumbing is needed.
   - **Alternatives considered:** TF-IDF over criterion descriptions. Rejected as overkill for MVP. Cosine similarity over a vector of one-hot fields. Rejected because the weighted integer sum is easier to reason about and already deterministic.

7. **Duplicate prevention stays in the assistant layer**
   - **Decision:** Before surfacing a criterion in any menu, the assistant filters out criteria that already exist in the current draft (matched by description trim-insensitive AND full `deterministicRule` equality). Selecting a duplicate is therefore not possible; the bot does not need a "duplicate detected" message.
   - **Rationale:** Keeps the UX honest — options shown in the menu are always actionable.
   - **Alternatives considered:** Show duplicates but block selection with a warning. Rejected as noisy.

8. **Conversation state lifetime**
   - **Decision:** The thread state is local to `AssistantChatDock` and therefore to the current mount of `EligibilityCriteriaScreen`. Navigating away unmounts the dock and clears the thread. Closing the drawer (the `×` button in the reference screenshot) hides the drawer but preserves the thread, so reopening restores it. `Clear chat` explicitly resets the thread and replays the intro turn.
   - **Rationale:** Matches user expectations from consumer chat products and avoids any persistence work.

9. **Visual parity with the reference screenshot without a design-system overhaul**
   - **Decision:** Use hand-written CSS in a dedicated stylesheet colocated with the dock component. Implement: round FAB with icon bottom-right of the viewport, right-side drawer ~380px wide (viewport height), bot bubbles on the left with a subtle border, user bubbles on the right with a filled accent color, menu options rendered as full-width pill buttons inside the latest bot turn, a header with title and `Clear chat` and close buttons, and an inert footer row that mimics the input area shown in the reference (the `Ask anything…` field is a disabled input with an `aria-hidden` paper-clip icon purely for visual parity).
   - **Rationale:** The existing codebase has no component library, so introducing one for this change would balloon scope. Colocated CSS matches the pattern used elsewhere.
   - **Alternatives considered:** Add a library like Radix or Headless UI for the drawer + buttons. Rejected for time.

10. **Intro message content is fixed and concise**
    - **Decision:** The intro is three bot bubbles followed by the root menu: (1) `Welcome to StudyHub assistant!`, (2) `I can help you draft eligibility criteria faster.`, (3) `All picks land in the current draft. You still need to activate Save or Next to persist them.`, followed by the root menu with the two skill buttons. Menu entries render with a single title line (no subtitle), matching the two skills: `Copy criteria from another study` and `Suggest criteria based on similar studies`.
    - **Rationale:** Keeps the greeting short for the narrow drawer width and avoids subtitle wrapping inside pill buttons. The "Save/Next still required" clarification remains as its own bubble so users know the assistant only drafts locally.

## Risks / Trade-offs

- **[Risk] Menu-listing every registered study does not scale past a small workspace** → **Mitigation:** At MVP scale (≤ ~20 seeded + user-created studies) scrolling the menu is acceptable. Mark a follow-up to introduce pagination or a typeahead when the list outgrows the drawer. Until then, render the list with vertical scroll inside the bubble.
- **[Risk] Similarity heuristic might rank obviously-unrelated studies first when the current draft is empty** → **Mitigation:** The intro and the suggestion bot turn explicitly state that ranking is based on already-filled fields; the heuristic still returns something so the flow isn't dead-ended for brand-new drafts.
- **[Risk] Assistant writes into a form state it doesn't own, so race conditions (e.g. user edits a row while the assistant appends another) could surprise users** → **Mitigation:** Append-only semantics — the assistant never removes or modifies existing criteria, only adds to the end of the correct group. No in-place edit path exists for the dock.
- **[Risk] "Chat" UI raises user expectations that they can type free-form questions** → **Mitigation:** The intro message states up front that interaction is via the menu; the text input shown in the drawer footer is disabled with a visible "Not available in MVP" placeholder.
- **[Risk] Menu state machine grows organically and becomes hard to follow** → **Mitigation:** The reducer and prompt types live in a dedicated `assistant/state.ts` with unit tests driving the state machine through every transition.
- **[Trade-off] Thread state is not persisted across navigations** → Accepted for MVP; persisting would force a storage decision we don't need yet.
- **[Trade-off] Duplicates are filtered out of menus rather than shown as disabled** → Accepted for clarity; we can revisit if users report they expect to see the "already added" state.

## Migration Plan

1. Add the `frontend/src/assistant/` module with the dock component, state machine, similarity heuristic, and colocated styles. Ship these behind no feature flag since there is no prior behavior to preserve.
2. Modify `EligibilityCriteriaScreen.tsx` to mount `AssistantChatDock` and wire the `onAddCriterion` callback into its local state setters.
3. Add unit tests for the similarity heuristic and the conversation state machine; add a component-level test that covers opening the dock, running one `copy-from-study` flow to completion, and asserting that the relevant criterion appears in the local form state (but is NOT yet sent to the backend until `Save`).
4. Update `README.md` and add a short `docs/assistant-heuristic.md` that explains the scoring formula.
5. No data migration is required. No environment variables or configuration are needed. Rollback is a clean revert of the new files and the changes to `EligibilityCriteriaScreen.tsx`.

## Open Questions

- Should the FAB be hidden on mobile-width viewports, or should the drawer go full-screen? **Leaning:** hidden below ~720px for MVP; revisit after first user test.
- Do we want to surface the computed similarity score (e.g. as a small badge next to each suggested study) or keep the ranking silent? **Leaning:** keep silent in MVP to avoid implying precision; reconsider if testers ask why a study was picked.
