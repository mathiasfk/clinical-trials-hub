## Context

The `All studies` page (`AllStudiesPage.tsx`) renders a vertical list of study cards. Each card currently uses a single-column grid (`.study-card { display: grid; gap: 0.35rem; }`) that stacks five blocks on their own lines:

1. Phase pill (`.study-card-phase`) — its own row, left-aligned.
2. Study ID (`<strong>`) — its own row.
3. Therapeutic area — its own row.
4. Patient population — its own row.
5. Metadata row (participants, arms, criteria) — flex row, small font.

With only 2–3 seeded studies this reads fine, but we have an in-flight change (`expand-seed-studies-catalog`) that imports many more CSV-derived examples into the seed catalog, and the product goal is to eventually browse dozens or hundreds of studies. A parallel change (`add-eligibility-assistant-chat`) also drives the list toward being a primary scanning surface. The current card consumes ~180–220px of vertical space and leaves large horizontal whitespace on desktop, so only ~3 cards fit above the fold.

The user has given explicit layout direction:
- Phase tag should sit next to the study ID instead of above it.
- Therapeutic area should sit before the patient population on the same line, separated by a visible separator.

## Goals / Non-Goals

**Goals:**
- Fit more study cards per viewport without sacrificing legibility or the card's identity (border, radius, hover).
- Surface the most useful scanning attributes — study ID, phase, therapeutic area, patient population, study type, participant count, arm count, criteria count — in a two-line layout per card.
- Keep the card a single clickable `Link` that navigates to the study's Summary (no secondary interactive controls inside the card).
- Keep the list-level affordances (panel header, count badge, empty/loading states, `New study` action) unchanged.

**Non-Goals:**
- Adding filtering, sorting, grouping, or pagination for the studies list (tracked separately).
- Introducing a denser multi-column grid (the list remains a single vertical column of cards for this change).
- Replacing the card with a table layout.
- Changing any backend payload, API shape, or domain field; the card composes what the list endpoint already returns.
- Introducing a design-system component abstraction for the card.

## Decisions

1. **Two-line card layout: identity line + clinical line, with a metadata footer**
   - **Decision:** Restructure the card into three horizontally-aligned regions stacked with small gaps:
     1. **Identity line** — a flex row that renders the study ID as the primary text on the left and the phase pill immediately to its right.
     2. **Clinical line** — a single text line that renders the therapeutic area followed by a middle-dot separator (` · `) and the patient population. When either value is missing, render the remaining one without a trailing separator.
     3. **Metadata footer** — the existing metadata row (participants, arms, criteria), plus the study type, as a wrap-friendly flex row with smaller, muted text.
   - **Rationale:** This matches the user's direction exactly (phase beside ID, therapeutic area before population with a separator) and collapses five rows into two content lines plus a small footer. The middle dot (` · `, `\u00B7`) is the existing visual language across dense lists (Clinical Trials .gov, PubMed, etc.) and does not require any extra DOM element.
   - **Alternatives considered:**
     - Two columns side-by-side (identity on the left, clinical block on the right). Rejected as heavier and less consistent with a scanning rhythm across many cards; also fragile on narrow viewports.
     - A table row. Rejected because the card still needs a hover/press affordance and a single link target; keeping a card preserves the existing visual hierarchy for the page.

2. **Phase tag becomes an inline pill anchored to the study ID**
   - **Decision:** Keep the existing `.study-card-phase` pill styling (shape, color, padding) but place it inline next to the study ID, using `display: flex; align-items: center; gap: 0.5rem;` on a new wrapper. The ID remains the primary text (`<strong>`), and the phase pill stays visually secondary.
   - **Rationale:** Keeps the chip language users already associate with phase, while the inline placement removes the dedicated top row. No new color or typography tokens are introduced.
   - **Alternatives considered:** Render the phase as plain text after the ID. Rejected because the pill is how phase reads as categorical data; stripping the pill loses information density.

3. **Clinical line uses a visible middle-dot separator, not a bullet list**
   - **Decision:** Render therapeutic area and patient population as two `<span>` elements inside a single paragraph-like line; interleave a `.card-separator` span containing `·` (styled with muted color and inline horizontal margin) only when both values are present. The line uses `text-overflow: ellipsis` with `overflow: hidden; white-space: nowrap;` so very long populations do not force the card to grow.
   - **Rationale:** The separator is text-level, accessible (read as "dot" by screen readers only where needed — we add `aria-hidden="true"` on the separator span), and requires no layout primitives beyond plain inline text.
   - **Alternatives considered:**
     - CSS `::before` pseudo-element for the separator. Rejected because adding/removing the separator based on missing fields is simpler via React conditional rendering.
     - Using a `|` pipe. Rejected as visually heavier; ` · ` is softer and matches the tone of the existing design.

4. **Metadata footer absorbs study type and the FPFV milestone**
   - **Decision:** Extend the existing `.study-card-metadata` row to include `{study.studyType}` as a leading chip-free entry (plain text segment) alongside `participants`, `arms`, and `criteria count`. Append an optional `FPFV <date>` entry at the end of the row — rendered as the literal short label `FPFV` followed by the formatted `firstPatientFirstVisit` value — and omit the entry entirely when the field is empty (no `Not set` placeholder). Keep the flex-wrap behavior so narrow viewports still render all metadata.
   - **Rationale:** Study type (interventional vs. observational) is a high-value scanning attribute — users often want to distinguish it at a glance — and the metadata row is the natural home since it groups other non-title study facts. FPFV is the most actionable study-timing milestone for scanning (it communicates "is this study open/recruiting-ish yet?") and using the well-known acronym keeps the row compact. Omitting the entry when missing preserves density for draft studies that have not yet scheduled FPFV.
   - **Alternatives considered:**
     - Put study type on the identity line next to the phase pill. Rejected because it would compete visually with the phase pill and inflate the identity line; the metadata row is already the catch-all for secondary facts.
     - Spell out `First patient, first visit` instead of `FPFV`. Rejected because the label alone is nearly as wide as the value and would dominate the metadata row; users familiar with the domain recognize the acronym, and the full phrase remains available in `Study information` and the study's `Summary`.
     - Render FPFV on the identity or clinical line. Rejected because it is a secondary attribute (not every study has one) and belongs with the other optional counts/facts.

5. **Tighten vertical density without changing the card identity**
   - **Decision:** Reduce `.study-card` vertical padding from `1rem` to `0.75rem` and internal gap from `0.35rem` to `0.25rem`. Reduce the list gap between cards (`.study-card-list { gap }`) from `0.85rem` to `0.6rem`. Keep the border, border-radius, background, hover transform, and box-shadow unchanged.
   - **Rationale:** Small, proportional reductions cut the per-card height substantially (~35–40%) without making the list feel cramped. The existing hover affordance and rounded-rectangle identity are what make the list feel like "cards"; those stay.
   - **Alternatives considered:** Remove the card border and hover shadow to get a flatter list. Rejected because the hover affordance is how users perceive each row as clickable.

## Risks / Trade-offs

- **[Risk] Long therapeutic area + patient population strings could truncate unexpectedly on narrow viewports** → **Mitigation:** Use `text-overflow: ellipsis` with `title` attributes on both spans so the full text is available on hover, and verify with the longest seeded examples.
- **[Risk] Existing frontend tests that query the card by nested structure may break** → **Mitigation:** Update the All studies tests to assert on the identity line (ID + phase together), the clinical line (therapeutic area + population), and the metadata footer (participants, arms, criteria, study type); avoid brittle DOM-nesting assertions.
- **[Risk] Adding study type and FPFV to the metadata row slightly increases its width and may wrap on small viewports** → **Mitigation:** The row already uses `flex-wrap: wrap`, so wrapping is graceful; the card height grows by at most one extra line on very narrow viewports, which is acceptable. FPFV is omitted entirely when not set, so drafts do not pay the width cost.
- **[Risk] The `FPFV` acronym may be unfamiliar to first-time users** → **Mitigation:** Render the entry with a `title` attribute expanding the acronym (e.g., `First patient, first visit: 2026-05-14`) so the full phrase is discoverable on hover, and rely on the study's `Summary` and `Study information` screens to keep the unabbreviated label as the canonical source of truth.
- **[Trade-off] Middle-dot separator is purely visual** → Accepted: we mark it `aria-hidden="true"` and rely on the two surrounding spans to carry semantic content; screen readers read "Cardiovascular. Adults with type 2 diabetes." as adjacent text segments.
- **[Trade-off] Card remains a single-column list rather than a multi-column grid** → Accepted for this change; density is improved enough vertically to ship now, and a multi-column layout can be a separate iteration once filtering/sorting is added.

## Migration Plan

1. Adjust the `AllStudiesPage` card markup to the new identity line / clinical line / metadata footer structure, conditionally rendering the separator and truncating long values.
2. Update `App.css` for `.study-card`, `.study-card-phase`, `.study-card-metadata`, and add a new `.study-card-identity` and `.study-card-clinical` selector (or reuse existing classes if cleaner) to drive the new layout.
3. Update frontend tests (`App.test.tsx` and any other test that inspects the All studies list) to match the new card structure.
4. Run the frontend test suite and manually verify the list with the current seed studies at desktop, tablet, and narrow viewport widths.

No backend, API, or data migration is involved.
