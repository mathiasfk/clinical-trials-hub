## ADDED Requirements

### Requirement: Repository uses the mandated MVP technology stack
The system MUST provide a frontend application using React with Vite and pnpm, and a backend application using Go.

#### Scenario: Frontend stack is initialized
- **WHEN** a developer inspects the frontend application setup
- **THEN** the project SHALL be configured to run with React and Vite using pnpm-based workflows

#### Scenario: Backend stack is initialized
- **WHEN** a developer inspects the backend application setup
- **THEN** the backend SHALL be implemented as a Go application with a runnable local server entrypoint

### Requirement: MVP persistence is in-memory with pluggable storage boundary
The system MUST implement persistence through repository interfaces so that in-memory implementations can be replaced by Postgres-backed implementations in a future phase without changing core domain behavior.

#### Scenario: Services depend on repository contracts
- **WHEN** application services are implemented
- **THEN** they SHALL depend on repository interfaces rather than concrete in-memory storage types

#### Scenario: In-memory repositories satisfy repository contracts
- **WHEN** the MVP application runs
- **THEN** repository contracts SHALL be fulfilled by in-memory implementations

### Requirement: Repository language standard is English
All newly created repository artifacts in this change MUST use English, including code identifiers, comments, documentation, and specification text.

#### Scenario: Documentation and specs are reviewed
- **WHEN** maintainers review files created by this change
- **THEN** user-facing and developer-facing written content SHALL be in English
