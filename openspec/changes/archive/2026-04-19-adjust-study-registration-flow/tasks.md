## 1. OpenSpec and Contract Updates

- [x] 1.1 Write the proposal, design, and study-registration delta spec for the adjusted study workflow.
- [x] 1.2 Update the OpenSpec task list to reflect implementation progress as code changes land.

## 2. Backend Eligibility Model and API

- [x] 2.1 Replace free-form eligibility strings with structured criteria and a declarative dimension registry in the study domain.
- [x] 2.2 Add backend validation and persistence support for reading supported dimensions and updating eligibility criteria.
- [x] 2.3 Extend HTTP handlers and tests for the new study read and eligibility update flows.

## 3. Frontend Study Workspace

- [x] 3.1 Refactor the frontend into an `All studies` home plus a study workspace with sidebar navigation.
- [x] 3.2 Implement the read-only `Summary` section with edit navigation into `Eligibility criteria`.
- [x] 3.3 Implement the structured eligibility criteria editor backed by dimension metadata and update APIs.

## 4. Seeds and Verification

- [x] 4.1 Update seed data and shared types to use structured eligibility criteria.
- [x] 4.2 Update automated tests to cover the new navigation, summary, and eligibility flows.
- [x] 4.3 Run focused backend and frontend verification for the adjusted registration flow.
