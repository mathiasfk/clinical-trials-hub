## Why

The project needs a fast, reliable MVP foundation that can be delivered within a single working day while still leaving a clean path for future production hardening. A clear first slice focused on clinical study registration enables immediate product validation without overbuilding.

## What Changes

- Initialize a green-field monorepo structure with a React + Vite + pnpm frontend and a Go backend.
- Define an in-memory persistence strategy for MVP speed, with explicit repository boundaries to support a second-phase Postgres implementation.
- Deliver a first functional vertical slice for clinical study registration.
- Include all fields listed under "Study registration" in `docs/features-outline.md` as part of the MVP registration flow.
- Add initial mock study data seeding for local testing and demos.
- Ensure all repository artifacts (code, docs, specs, and README content) are written in English.

## Capabilities

### New Capabilities
- `platform-bootstrap`: Establishes the initial project architecture, runtime boundaries, and persistence abstraction for a fast MVP with planned Postgres compatibility.
- `study-registration`: Enables users to create and manage clinical study registration data with the full field set defined for the MVP.

### Modified Capabilities
- None.

## Impact

- Adds new frontend and backend application surfaces in a green-field repository.
- Introduces core domain models and API contracts for study registration.
- Introduces repository interfaces and in-memory implementations designed to be replaceable by Postgres adapters.
- Sets the baseline for future capabilities (SOA validation, similarity, insights, AI assistant) without implementing them in this change.
