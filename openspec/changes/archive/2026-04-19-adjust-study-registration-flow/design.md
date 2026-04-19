## Context

The MVP currently renders study creation, study list, and study detail inside `frontend/src/App.tsx` without client-side routing. Eligibility criteria are stored end-to-end as `string[]`, which prevents the application from capturing deterministic rule parts such as dimension, operator, value, and unit.

This change introduces a study workspace that starts at `All studies`, then drills into study-specific sections through a sidebar. It also upgrades eligibility criteria to a structured data model with a shared dimension registry that can be expanded declaratively.

## Goals / Non-Goals

**Goals:**
- Make `All studies` the default entry point for reviewing available studies.
- Add a reusable study layout with sidebar navigation and `Summary` as the default study section.
- Support read-only summary presentation with an edit affordance for eligibility criteria.
- Represent eligibility criteria as ordered structured objects with both readable text and deterministic rule parts.
- Centralize dimension metadata so frontend rendering and backend validation share the same rule vocabulary.

**Non-Goals:**
- Add administrative CRUD for managing dimensions at runtime.
- Implement advanced rule composition such as AND/OR groups or nested expressions.
- Expand the scope to other outline areas such as insights, similar studies, AI assistant, or decision log.
- Introduce durable persistence beyond the existing in-memory repository abstraction.

## Decisions

1. **Keep study creation but move it under `All studies`**
   - **Decision:** Retain the existing create-study capability, but place it inside the `All studies` home instead of making it the primary page.
   - **Rationale:** This preserves MVP functionality while shifting the mental model toward browsing and editing study workspaces.
   - **Alternatives considered:** Remove study creation from the current iteration. Rejected because it would regress existing MVP behavior.

2. **Use client-side routing for study sections**
   - **Decision:** Introduce `react-router-dom` and model navigation with routes for `All studies`, `Summary`, and `Eligibility criteria`.
   - **Rationale:** Sidebar navigation and deep-linkable study sections are simpler and more maintainable with explicit routes than with local component state alone.
   - **Alternatives considered:** Keep a single component with local tab state. Rejected because it makes direct navigation from summary edits awkward and keeps the current monolith in place.

3. **Represent eligibility criteria as structured objects**
   - **Decision:** Replace `[]string` criteria collections with ordered arrays of `EligibilityCriterion`, each containing `description` and `deterministicRule`.
   - **Rationale:** The UI must capture both a readable explanation and a deterministic expression, and the backend must validate each part independently.
   - **Alternatives considered:** Store only the structured rule and derive the readable text. Rejected because the user explicitly requires a separate readable description.

4. **Use a declarative dimension registry inside the backend domain layer**
   - **Decision:** Define a single registry for supported dimensions, including identifier, label, description, and supported units, and expose that metadata through the API.
   - **Rationale:** A shared declarative source keeps validation and UI options aligned and makes dimension expansion a data-entry task rather than a logic change.
   - **Alternatives considered:** Duplicate lists in frontend and backend. Rejected because drift would make validation and rendering inconsistent.

5. **Add focused eligibility update endpoints**
   - **Decision:** Add a study-level eligibility update endpoint and repository update method rather than a broad generic patch API.
   - **Rationale:** The requested edit flow only targets eligibility criteria, so a focused endpoint keeps validation rules clear and the change smaller.
   - **Alternatives considered:** Full-study PUT/PATCH. Rejected because it increases contract surface area without immediate product value.

## Risks / Trade-offs

- **[Risk] Structured criteria break existing seeded data and tests** -> **Mitigation:** Update seeds and automated tests in the same change so the new contract is exercised end-to-end.
- **[Risk] Adding routing increases frontend complexity** -> **Mitigation:** Keep route count small and extract only the components needed for `All studies`, `Summary`, and `Eligibility criteria`.
- **[Risk] A shared backend registry still requires frontend fetching before rendering forms** -> **Mitigation:** Expose a lightweight dimensions endpoint and reuse its payload for dropdowns and hover text.
- **[Risk] Focused eligibility update endpoint may need to widen later** -> **Mitigation:** Keep repository and service code organized around reusable study update helpers to preserve an upgrade path.
