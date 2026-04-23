# platform-bootstrap Specification

## Purpose

Covers the MVP repository platform: React with Vite and pnpm for the front-end, .NET 10 with ASP.NET Core Minimal APIs and hexagonal layering for the back-end, EF Core InMemory persistence behind Application-layer repository contracts, and shared conventions for API contracts, OpenAPI, CORS, and deployment.

## Requirements

### Requirement: Repository uses the mandated MVP technology stack

The system MUST provide a frontend application using React with Vite and pnpm, and a backend application using .NET 10 with ASP.NET Core Minimal APIs organized as a hexagonal solution with one project per layer.

#### Scenario: Frontend stack is initialized

- **WHEN** a developer inspects the frontend application setup
- **THEN** the project SHALL be configured to run with React and Vite using pnpm-based workflows

#### Scenario: Backend stack is initialized

- **WHEN** a developer inspects the backend application setup
- **THEN** the backend SHALL be implemented as a .NET 10 ASP.NET Core application using Minimal APIs with a runnable local server entrypoint, organized into separate `Domain`, `Application`, `Infrastructure`, and `Api` projects whose project references point strictly inward (the `Domain` project SHALL declare no project or third-party dependencies)

#### Scenario: Backend solution centralizes build and package settings

- **WHEN** a developer inspects the backend solution
- **THEN** the solution SHALL include a `Directory.Build.props` enabling nullable reference types, implicit usings, warnings-as-errors, and the latest C# language version, and a `Directory.Packages.props` (or equivalent central package management file) pinning every NuGet package version in one place

### Requirement: MVP persistence is in-memory via EF Core with a pluggable storage boundary

The system MUST implement persistence through repository interfaces declared in the Application layer so that the MVP Infrastructure implementation (backed by `Microsoft.EntityFrameworkCore` with the `Microsoft.EntityFrameworkCore.InMemory` provider) can be replaced by a PostgreSQL-backed implementation in a future phase without changing the Domain or Application layers. Repository interfaces declared in the Application layer SHALL be storage-agnostic: they SHALL NOT return, accept, or otherwise expose EF Core types (`DbContext`, `DbSet<T>`, `IQueryable<T>`, `EntityEntry<T>`, `ChangeTracker`, migration types, etc.).

#### Scenario: Services depend on repository contracts

- **WHEN** application services are implemented
- **THEN** they SHALL depend on repository interfaces declared in the Application layer rather than concrete storage types declared in the Infrastructure layer, and the interface signatures SHALL use only Domain types, BCL types, and `CancellationToken`

#### Scenario: In-memory repositories satisfy repository contracts

- **WHEN** the MVP application runs
- **THEN** the repository contracts declared in the Application layer SHALL be fulfilled by Infrastructure-layer implementations that go through EF Core with the InMemory provider, registered in the API layer's composition root (`Program.cs`) via `AddDbContext<T>(o => o.UseInMemoryDatabase(...))`

#### Scenario: EF Core types are confined to the Infrastructure project

- **WHEN** a developer inspects the Domain and Application projects' `.csproj` files and source code
- **THEN** neither project SHALL reference `Microsoft.EntityFrameworkCore.*` packages and no source file in either project SHALL import (`using`) any `Microsoft.EntityFrameworkCore.*` namespace

#### Scenario: Domain records are EF-attribute-free

- **WHEN** a developer inspects the Domain records persisted via EF Core (e.g., `Study`, `EligibilityCriterion`, `DeterministicRule`)
- **THEN** none of these types SHALL declare EF Core attributes (`[Key]`, `[Owned]`, `[Table]`, `[Column]`, etc.) or any other EF-specific metadata; all EF mapping SHALL live in `IEntityTypeConfiguration<T>` classes (or equivalent fluent-API configuration) under the Infrastructure project

#### Scenario: Repository owns identifier generation

- **WHEN** a study is created through the create-study use case
- **THEN** the repository implementation SHALL assign the new study's identifier atomically with persistence (no separate "compute id then persist" sequence in the application service), preserving the existing `study-NNNN` format and the strictly-greater-than-current-maximum suffix invariant

#### Scenario: Storage swap does not require Domain or Application changes

- **WHEN** a future change replaces the EF Core InMemory provider with a PostgreSQL provider (for example `Npgsql.EntityFrameworkCore.PostgreSQL`)
- **THEN** the swap SHALL be limited to the Infrastructure project (provider registration, migrations, connection-string configuration) and SHALL require zero source changes in the Domain or Application projects

### Requirement: Repository language standard is English

All newly created repository artifacts in this change MUST use English, including code identifiers, comments, documentation, specification text, and log message templates.

#### Scenario: Documentation and specs are reviewed

- **WHEN** maintainers review files created by this change
- **THEN** user-facing and developer-facing written content SHALL be in English

#### Scenario: Backend log statements use English

- **WHEN** maintainers review the .NET backend's log message templates
- **THEN** every `ILogger` call SHALL use an English message template with semantic placeholders (no string interpolation), so structured-log consumers receive a consistent, English vocabulary

### Requirement: Backend HTTP contract matches the front-end

The system SHALL expose an HTTP request/response contract that is byte-compatible from the front-end's perspective under the **`/api/v1`** REST path prefix (for example `/api/v1/studies`). The backend SHALL preserve every method, status code, request body shape, response body shape, and JSON casing currently exercised by the front-end (`frontend/src/api.ts` and `frontend/src/types.ts`). JSON SHALL be serialized in `camelCase`, responses SHALL wrap successful payloads in a `{ "data": ... }` envelope, and error responses SHALL use the `{ "message": <string>, "errors"?: { <field>: <message> } }` envelope. Unknown JSON fields on any request body SHALL be rejected with HTTP `400` and a `"message": "invalid JSON payload"` error envelope. The committed OpenAPI export at `backend/docs/openapi.json` SHALL describe this same surface for tooling.

#### Scenario: Front-end calls succeed against the versioned REST surface

- **WHEN** the front-end (`frontend/src/api.ts` plus the typed shapes in `frontend/src/types.ts`) issues calls against the .NET backend using the `/api/v1/...` routes
- **THEN** every call SHALL succeed with the same status codes, response shapes, and field names documented in the committed OpenAPI artifact

#### Scenario: Backend rejects unknown JSON fields

- **WHEN** a client sends a `POST /api/v1/studies`, `PUT /api/v1/studies/{id}`, or `PUT /api/v1/studies/{id}/eligibility` request whose body contains a property not declared on the corresponding input type
- **THEN** the backend SHALL respond with HTTP `400` and a body of `{ "message": "invalid JSON payload" }` and SHALL NOT mutate any persisted study

#### Scenario: Health endpoint returns the documented shape

- **WHEN** any client issues `GET /health`
- **THEN** the backend SHALL respond with HTTP `200` and a body of `{ "status": "ok" }` regardless of front-end usage

### Requirement: Backend exposes interactive and machine-readable OpenAPI documentation via the native ASP.NET Core stack

The system SHALL document the API surface using the native ASP.NET Core OpenAPI stack (`Microsoft.AspNetCore.OpenApi`): the API layer SHALL call `builder.Services.AddOpenApi()` during service registration and `app.MapOpenApi()` during pipeline configuration, making the current OpenAPI document available at `/openapi/v1.json` on the running server. The system SHALL NOT use `Swashbuckle.AspNetCore`. For the interactive UI, the system SHALL host a Scalar API reference (`Scalar.AspNetCore` via `app.MapScalarApiReference()`). At build time, the system SHALL export the OpenAPI document to `backend/docs/openapi.json` via a build-time OpenAPI generator (for example `Microsoft.Extensions.ApiDescription.Server`), so that downstream tooling (front-end developers, NSwag/OpenAPI client generators) can read the contract from a known path.

#### Scenario: Developer opens the Scalar API reference

- **WHEN** a developer navigates to the Scalar API reference route on the running backend (for example `/scalar/v1`, as mounted by `MapScalarApiReference`)
- **THEN** the system SHALL render the Scalar API reference listing every documented endpoint with its summary, request body schema, and possible responses

#### Scenario: OpenAPI document is served at runtime

- **WHEN** a client requests `GET /openapi/v1.json`
- **THEN** the system SHALL respond with HTTP `200` and a valid OpenAPI document describing every public endpoint exposed by the API

#### Scenario: OpenAPI artifact is produced at build time

- **WHEN** a developer runs `dotnet build` on the API project
- **THEN** the build SHALL emit the current OpenAPI document to `backend/docs/openapi.json`, and the emitted document SHALL be consistent with the document served at `/openapi/v1.json` on the running server

#### Scenario: Swashbuckle is not a dependency

- **WHEN** a developer inspects the backend solution's `Directory.Packages.props` and every project's `.csproj`
- **THEN** no project SHALL declare a `<PackageReference>` to `Swashbuckle.AspNetCore` or any `Swashbuckle.*` sub-package

#### Scenario: Committed OpenAPI artifact is canonical for tooling

- **WHEN** the .NET OpenAPI artifact at `backend/docs/openapi.json` is produced by `dotnet build` and covers every public endpoint
- **THEN** that file SHALL remain the machine-readable contract checked into the repository for downstream tooling, and the backend build, test, and deployment pipeline SHALL NOT depend on any duplicate OpenAPI document in another format or path

### Requirement: Backend uses Minimal APIs with layered hexagonal organization

The backend SHALL implement its HTTP surface using ASP.NET Core Minimal APIs organized into endpoint group extension methods (one extension per top-level resource: studies, eligibility dimensions, health). Endpoint handlers SHALL contain only request/response wiring and SHALL delegate all business logic to Application-layer services. The Application layer SHALL depend on the Domain layer only; the Infrastructure layer SHALL depend on the Application and Domain layers only; the API layer SHALL be the only project that references all other layers and SHALL act as the composition root.

#### Scenario: Endpoint groups are wired in Program.cs

- **WHEN** a developer inspects the API project's `Program.cs`
- **THEN** the routing setup SHALL invoke separate `MapStudiesEndpoints`, `MapEligibilityEndpoints`, and `MapHealthEndpoints` extension methods declared in the API layer rather than registering routes inline one at a time

#### Scenario: Domain has no external dependencies

- **WHEN** a developer inspects the Domain project's `.csproj`
- **THEN** the project SHALL declare no `<ProjectReference>` entries and SHALL declare no NuGet `<PackageReference>` entries beyond what the BCL provides via the .NET 10 target framework

#### Scenario: API layer is the composition root

- **WHEN** a developer inspects the dependency wiring in `Program.cs`
- **THEN** the API project SHALL be the only place that registers Infrastructure implementations against Application interfaces in the dependency injection container

### Requirement: Backend uses async-first I/O and propagates cancellation tokens

The backend SHALL use the asynchronous Task-returning style for every I/O-shaped operation (HTTP handlers, repository operations, validators, hosted services) and SHALL accept and forward a `CancellationToken` through the entire call chain from the HTTP endpoint down to the repository.

#### Scenario: Repository contracts are async and accept a cancellation token

- **WHEN** a developer inspects the repository interfaces declared in the Application layer
- **THEN** every method SHALL return `Task` or `Task<T>` and SHALL accept a `CancellationToken` parameter

#### Scenario: Endpoints forward the request cancellation token

- **WHEN** a developer inspects any endpoint handler
- **THEN** the handler SHALL accept the request `CancellationToken` (via Minimal-API parameter binding) and SHALL pass it to the Application service it invokes

### Requirement: Backend exception model maps Application failures to consistent HTTP responses

The Application layer SHALL surface failures via three exception types only — `ValidationException` (carrying a `field → message` dictionary), `NotFoundException` (carrying a resource name), and `InvalidJsonException` (used by the JSON deserialization wrapper). The API layer SHALL register a single global exception handler that maps these to `400` with `{ message: "validation failed", errors }`, `404` with `{ message: "<resource> not found" }`, and `400` with `{ message: "invalid JSON payload" }` respectively. Any other unhandled exception SHALL be mapped to `500` with `{ message: "internal server error" }` and SHALL be logged at `Error` level with the original exception attached.

#### Scenario: Validation failure produces the documented envelope

- **WHEN** the Application layer throws a `ValidationException` while handling a request
- **THEN** the API layer SHALL respond with HTTP `400` and a body of `{ "message": "validation failed", "errors": { ... } }` whose `errors` map mirrors the dictionary carried by the exception

#### Scenario: Not-found failure produces the documented envelope

- **WHEN** the Application layer throws a `NotFoundException` while handling a request
- **THEN** the API layer SHALL respond with HTTP `404` and a body of `{ "message": "<resource> not found" }`

#### Scenario: Unhandled exception is logged and returns 500

- **WHEN** the Application or Infrastructure layers throw any exception other than `ValidationException`, `NotFoundException`, or `InvalidJsonException`
- **THEN** the API layer SHALL log the exception at `Error` level with the original exception attached and SHALL respond with HTTP `500` and a body of `{ "message": "internal server error" }`

### Requirement: Backend CORS policy is configuration-driven

The backend SHALL configure a single named CORS policy whose allowed origins are read from configuration (e.g., `Cors:AllowedOrigins` in `appsettings.json` or the equivalent environment-variable key) and applied globally to every endpoint. Allowed methods SHALL be restricted to `GET`, `POST`, `PUT`, and `OPTIONS`, and allowed headers SHALL include at minimum `Content-Type`. The default development configuration SHALL list the local Vite origin (`http://localhost:5173`) so the front-end works out of the box, and the production deployment SHALL be able to add the Vercel front-end origin without code changes.

#### Scenario: Production origin can be configured without code changes

- **WHEN** an operator sets the CORS allowed-origins configuration to include the production front-end URL (for example `https://clinical-trials-hub.vercel.app`)
- **THEN** the backend SHALL accept cross-origin requests from that URL after a restart, with no source change required

#### Scenario: Local development front-end works out of the box

- **WHEN** a developer starts the backend with the default configuration and runs the Vite dev server on `http://localhost:5173`
- **THEN** the front-end SHALL be able to call every documented endpoint without CORS errors

### Requirement: Backend ships with a container image and fly.io configuration

The backend SHALL ship with a multi-stage `Dockerfile` (using the official .NET SDK image for build and the official ASP.NET Core runtime image for the final stage) and a `fly.toml` at `backend/` that exposes the API on port `8080`, registers `/health` as the platform health check, and reads CORS allowed origins from fly secrets so the same image runs locally and on fly.io.

#### Scenario: Backend image runs the API on port 8080

- **WHEN** an operator builds the `Dockerfile` and runs the resulting image with the default configuration
- **THEN** the container SHALL serve the API on port `8080` and the `/health` endpoint SHALL return HTTP `200`

#### Scenario: fly.io health check uses /health

- **WHEN** a developer inspects `backend/fly.toml`
- **THEN** the file SHALL declare an HTTP health check pointing at `/health` on the application's listening port
