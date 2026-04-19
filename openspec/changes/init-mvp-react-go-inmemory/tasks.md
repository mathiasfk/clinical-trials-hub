## 1. Repository and Project Bootstrap

- [ ] 1.1 Create the frontend application scaffold with React, Vite, and pnpm.
- [ ] 1.2 Create the Go backend application scaffold with a runnable local HTTP server.
- [ ] 1.3 Define a repository-level structure and baseline README updates in English.

## 2. Domain and Persistence Foundation

- [ ] 2.1 Define study registration domain models covering all MVP fields from the outline.
- [ ] 2.2 Define repository interfaces for study creation and retrieval use cases.
- [ ] 2.3 Implement in-memory repository adapters that satisfy the repository interfaces.
- [ ] 2.4 Implement deterministic mock data seeding at backend startup.

## 3. Backend API for Study Registration

- [ ] 3.1 Implement request validation for required study registration fields.
- [ ] 3.2 Implement API endpoint for creating a clinical study registration record.
- [ ] 3.3 Implement API endpoint for listing registered studies.
- [ ] 3.4 Implement API endpoint for retrieving a study by identifier.

## 4. Frontend MVP Experience

- [ ] 4.1 Implement a study registration form with all required MVP registration fields.
- [ ] 4.2 Integrate frontend submission flow with backend create-study API.
- [ ] 4.3 Implement a study list and detail view backed by backend read APIs.
- [ ] 4.4 Add basic UI feedback for loading, validation errors, and successful creation.

## 5. Postgres Compatibility Readiness

- [ ] 5.1 Ensure service layer depends only on repository interfaces, not in-memory implementations.
- [ ] 5.2 Document the expected Postgres adapter boundary and replacement approach.
- [ ] 5.3 Add backend tests that validate repository contract behavior independent of storage implementation.

## 6. Quality and Verification

- [ ] 6.1 Add backend tests for study registration validation and API behavior.
- [ ] 6.2 Add frontend checks for form field coverage and core submission flow.
- [ ] 6.3 Perform an end-to-end local smoke test for create/list/get study flows.
- [ ] 6.4 Confirm all new code and documentation content is written in English.
