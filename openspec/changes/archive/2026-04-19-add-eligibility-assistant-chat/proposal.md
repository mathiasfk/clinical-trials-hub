## Why

Registering a new study's eligibility criteria from scratch is slow and easy to get wrong; teams routinely reuse criteria from similar studies but the current UI offers no shortcut for that. We want to introduce an assistant experience that shortens this loop without building real AI: a chat-style helper on the `Eligibility criteria` screen that lets users either copy criteria from a study they already know about, or surface criteria from the studies most similar to the current one. Time is tight, so the "AI" must be deterministic — a pure heuristic and menu-driven flow that looks and feels like a chat assistant but has zero LLM or embedding dependency.

## What Changes

- Add a persistent Floating Action Button (FAB) on the `Eligibility criteria` screen (both edit mode and new-study mode) that opens a right-side chat panel.
- Implement a chat panel with standard chat conventions: bot messages aligned left, user "messages" (the interactive choices the user makes) aligned right, a conversation thread that grows top-down, and a `Clear chat` action that resets the thread.
- The conversation is entirely menu-driven: the bot greets the user, explains its capabilities, and ends every turn with an interactive menu button group the user clicks to progress. No free-text input is accepted; every user reply appears in the thread as the label of the option they selected.
- Scope the assistant to two capabilities in this change:
  1. **Copy from a specific study**: the user pastes or types a study identifier through a small guided prompt (still part of the menu flow), the bot lists the inclusion and exclusion criteria of that study as selectable items (description-only preview), and the user can add one or more of them to the current study.
  2. **Suggest relevant criteria**: the bot runs a deterministic similarity heuristic across other registered studies, ranks them, picks the top-K most similar, and offers up to three concrete criteria suggestions drawn from those studies. The user picks at most one per suggestion turn; the picked criterion is appended to the current study.
- Define the similarity heuristic as a closed, deterministic scoring function over already-available study fields (therapeutic area, phase, study type, set of eligibility dimensions in use). Ties are broken by study identifier for reproducibility. **No LLM, no embeddings, no external service.**
- When the assistant adds a criterion to the current study, it MUST go through the same eligibility update path the manual editor uses, so all existing validation (deterministic rule shape, dimension registry, minimum-validity contract) stays authoritative.
- Ship the assistant as frontend-only: rely on the existing study list and study detail endpoints; do NOT add new backend endpoints in this change.

## Capabilities

### New Capabilities
- `study-assistant`: Chat-style, menu-driven helper mounted on study section screens that can read registered studies and compose deterministic suggestions for the current study. This change implements the `Eligibility criteria` scope of that capability; future changes can extend it to other sections without re-specifying the shell.

### Modified Capabilities
<!-- No existing requirement changes; the assistant adds criteria via the existing eligibility flow and does not alter the study-registration contract. -->

## Impact

- **Frontend**: new chat shell and FAB component, per-screen assistant "skill" wiring on `EligibilityCriteriaScreen`, a deterministic similarity module, and shared conversation-state hook. No changes to existing section editors beyond mounting the FAB.
- **Backend**: no new endpoints. The assistant consumes the existing study list and study detail APIs to read other studies, and the existing eligibility update endpoint to persist user-accepted criteria on edit-mode studies. For new-study mode, accepted criteria are appended to the in-memory draft using the same path the manual editor already uses.
- **Dependencies**: no new runtime dependencies. Heuristic scoring is implemented in plain TypeScript with no ML libraries.
- **Tests**: new unit tests for the similarity heuristic and for the assistant's menu state machine; component tests for the chat panel rendering and for "selecting a criterion appends it to the current study".
- **Docs**: update `README.md` feature list to mention the assistant; add a short note in `docs/` describing the heuristic so reviewers know it is intentionally simple.
