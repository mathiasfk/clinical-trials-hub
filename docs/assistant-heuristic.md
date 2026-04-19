# StudyHub assistant — heuristic reference

The `Eligibility criteria` screen hosts a chat-style assistant (bottom-right FAB
→ right-side drawer). It looks like an AI helper but is intentionally **not**
AI: it uses a deterministic scoring function and closed menus so the same
inputs always produce the same outputs. This document describes the
heuristic in full so reviewers know exactly how suggestions are made.

## Non-AI guarantees

- No LLM call.
- No embeddings, no vector database, no feature hashing.
- No external service or network call other than the existing
  `GET /api/studies` and `GET /api/eligibility-dimensions` endpoints.
- All scoring and selection run in the browser, in pure TypeScript, in
  `frontend/src/assistant/similarity.ts`.

## Similarity scoring

The assistant computes a similarity score between the **current study draft**
and every **other registered study**. For two studies `current` and `other`,
`similarityScore(current, other)` is the sum of:

| Contribution | When it applies                                                 |
|--------------|-----------------------------------------------------------------|
| **+3**       | `therapeuticArea` matches exactly (trimmed, case-insensitive)   |
| **+2**       | `phase` matches exactly                                         |
| **+1**       | `studyType` matches exactly                                     |
| **+1** each  | For every eligibility `dimensionId` that appears in **both** studies' criteria (counted once per dimension per study, regardless of repetition) |

Empty or unset current fields contribute 0 — a brand-new draft still returns
a deterministic score (every candidate simply has 0 from the field rules and
is ranked purely by dimension overlap).

Studies are then ordered:

1. **Descending score**.
2. **Ascending lexicographic `studyId`** for ties.

This makes the ordering reproducible across reloads and test runs.

## Suggestion collection

After ranking, the assistant walks the ranked list to collect up to
`limit = 3` suggestions. For each study it considers the **first inclusion
criterion**, then the **first exclusion criterion**, then the second pair,
and so on, skipping any criterion that:

- is already present in the current draft (by description + full
  deterministic rule equality, see `isSameCriterion`), or
- has already been added to the suggestion batch.

If fewer than three unique suggestions can be collected, the assistant says
so explicitly in a bot turn rather than padding with duplicates.

The **`Suggest three more`** follow-up re-runs the same pipeline against the
updated draft (which now includes any previously accepted suggestion), so
already-accepted criteria are naturally filtered out.

## Copy-from-study menu filter

The same `isSameCriterion` equality is applied when listing another study's
criteria under the `Copy criteria from another study` skill. Duplicates are
**not** rendered as disabled options; they are simply absent from the menu so
every option in front of the user is actionable.

## What the heuristic does NOT do

- It does not rank criteria within a single study.
- It does not consider the textual description when matching criteria for
  duplicate detection (description similarity is exact-match after trimming
  + lowercasing, not fuzzy).
- It does not learn from past user choices — the ranking depends only on the
  current draft and the other studies' structured fields.

## Source

- Similarity + extraction: `frontend/src/assistant/similarity.ts`
- Unit tests: `frontend/src/assistant/similarity.test.ts`
- Conversation state machine: `frontend/src/assistant/state.ts`
