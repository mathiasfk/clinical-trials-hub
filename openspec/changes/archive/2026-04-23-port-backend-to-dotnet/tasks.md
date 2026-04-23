## 1. Solution scaffolding

- [x] 1.1 Confirm the .NET 10 SDK is installed locally and committed via `backend/global.json` (`rollForward: latestFeature`).
- [x] 1.2 Create `backend/ClinicalTrialsHub.sln` and the four source projects: `src/ClinicalTrialsHub.Domain`, `src/ClinicalTrialsHub.Application`, `src/ClinicalTrialsHub.Infrastructure`, `src/ClinicalTrialsHub.Api`, plus the test project `tests/ClinicalTrialsHub.Tests`. Wire project references so dependencies point inward only.
- [x] 1.3 Add `backend/Directory.Build.props` enabling `Nullable`, `ImplicitUsings`, `TreatWarningsAsErrors`, `EnforceCodeStyleInBuild`, `LangVersion=latest`, and `TargetFramework=net10.0`.
- [x] 1.4 Add `backend/Directory.Packages.props` with `<ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>` and pin every package version: `FluentValidation` (+ `FluentValidation.DependencyInjectionExtensions`), `Microsoft.AspNetCore.OpenApi`, `Microsoft.Extensions.ApiDescription.Server`, `Scalar.AspNetCore`, `Microsoft.EntityFrameworkCore`, `Microsoft.EntityFrameworkCore.InMemory`, `NUnit`, `NSubstitute`, `Microsoft.NET.Test.Sdk`, `NUnit3TestAdapter`, `Microsoft.AspNetCore.Mvc.Testing`. Explicitly do NOT add `Swashbuckle.AspNetCore`.
- [x] 1.5 Add `backend/.editorconfig` enforcing file-scoped namespaces, `var` for obvious types, and the conventions called out in the .NET workspace rule.
- [x] 1.6 Verify the solution builds with `dotnet build` and the empty test project runs with `dotnet test`.

## 2. Domain layer

- [x] 2.1 Add `Study` and `StudyDraft` records mirroring the field set in `frontend/src/types.ts` (authoritative) and cross-checked against the initial reference at `backend/docs/swagger.yaml`: objectives, endpoints, inclusion/exclusion criteria, participants, studyType, numberOfArms, phase, therapeuticArea, patientPopulation, three SOA dates. Records SHALL carry no EF Core / JSON / FluentValidation attributes.
- [x] 2.2 Add `EligibilityCriterion` and `DeterministicRule` records with the documented field names and types (string `dimensionId`, string `operator`, `double value`, optional `unit`).
- [x] 2.3 Add `EligibilityDimension` record and a `EligibilityDimensionRegistry` static class that exposes the deterministic catalog from `backend-go-backup/internal/domain/eligibility.go` (one definition per ID, allowed-units array, lookup helper that normalizes by lowercase comparison and returns the canonical ID).
- [x] 2.4 Add a `Vocabularies` static class exposing `AllowedPhases`, `AllowedTherapeuticAreas`, and `AllowedStudyTypes` arrays (in the exact order used by the front-end constants) plus `IsAllowedPhase`/`IsAllowedTherapeuticArea`/`IsAllowedStudyType` helpers.
- [x] 2.5 Confirm the Domain project's `.csproj` declares zero `<ProjectReference>` and zero `<PackageReference>` entries (in particular no `Microsoft.EntityFrameworkCore.*` packages).
- [x] 2.6 Add NUnit tests covering: dimension lookup is case-insensitive and returns the canonical ID, unit-less dimensions report empty `AllowedUnits`, every vocabulary helper accepts each documented value and rejects unknown ones.

## 3. Application layer

- [x] 3.1 Add immutable DTO records: `StudyCreateInputDto`, `StudyEligibilityInputDto`, `StudyResponseDto`, `StudyListResponseDto`, `DimensionsResponseDto`, `HealthResponseDto`, `ErrorResponseDto`, plus mappers (`StudyMapper.ToResponse`, `StudyMapper.ToDraft`).
- [x] 3.2 Add `IStudyRepository` interface with `AddAsync`, `ListAsync`, `GetByIdAsync`, `ReplaceAsync`, `UpdateEligibilityAsync` (all `Task`-returning, accepting `CancellationToken`); the repository contract owns ID generation. Confirm the Application project's `.csproj` declares no `Microsoft.EntityFrameworkCore.*` package references and the interface signatures use only Domain types, BCL types, and `CancellationToken` (no `IQueryable<T>`, no `DbContext`, no `DbSet<T>`).
- [x] 3.3 Add the three exception types: `ValidationException(IDictionary<string, string> errors)`, `NotFoundException(string resource)`, `InvalidJsonException(string detail)`.
- [x] 3.4 Add `StudyCreateInputValidator` (FluentValidation) covering: at least one objective, at least one endpoint, at least one eligibility criterion in total, participants ≥ 1, numberOfArms ≥ 1, allow-listed phase/therapeuticArea/studyType, optional ISO-8601 dates, and per-criterion completeness with field paths like `inclusionCriteria[2].deterministicRule.unit`.
- [x] 3.5 Add `StudyEligibilityInputValidator` covering: at least one criterion in total plus the same per-criterion completeness rules used in 3.4.
- [x] 3.6 Add a shared `EligibilityCriterionValidationRules` helper used by both validators so dimension lookup, operator allow-list, finite-number check, and per-dimension unit allow-list logic exists in one place.
- [x] 3.7 Add `StudyService` (or one service per use case if it grows) implementing: `CreateStudyAsync`, `ListStudiesAsync`, `GetStudyByIdAsync`, `ReplaceStudyAsync`, `UpdateStudyEligibilityAsync`, plus `GetEligibilityDimensions` (sync, no I/O). Each method validates input, throws `ValidationException`/`NotFoundException` as appropriate, and forwards to the repository.
- [x] 3.8 Add NUnit tests for every validator (happy path + at least one rejection per rule) and every service method, using NSubstitute to stand in for `IStudyRepository`.

## 4. Infrastructure layer

- [x] 4.1 Add the EF Core `ClinicalTrialsDbContext` under `Infrastructure/Persistence/` exposing a `DbSet<Study>`. Register the context in the API composition root via `services.AddDbContext<ClinicalTrialsDbContext>(o => o.UseInMemoryDatabase("clinical-trials-hub"))`.
- [x] 4.2 Add `IEntityTypeConfiguration<Study>` (plus any nested configurations for `EligibilityCriterion`, `DeterministicRule`) under `Infrastructure/Persistence/Configurations/`. Configure eligibility collections as owned entities, map `Study.Id` as the primary key (string, no auto-generation — the repository supplies it), and keep all EF mapping code inside this folder. Apply configurations with `modelBuilder.ApplyConfigurationsFromAssembly(...)` in `OnModelCreating`.
- [x] 4.3 Add `EfStudyRepository` implementing `IStudyRepository`. `AddAsync` SHALL guard the "scan max suffix → assign next → SaveChanges" sequence with a `SemaphoreSlim` (async critical section) so concurrent requests cannot allocate duplicate IDs against the InMemory provider; `ListAsync` returns studies ordered by ascending numeric suffix via `OrderBy` on the parsed suffix; `GetByIdAsync` uses `FindAsync`/`SingleOrDefaultAsync`; `ReplaceAsync` and `UpdateEligibilityAsync` return `null` when no row matches.
- [x] 4.4 Add `StudySeeder` exposing the deterministic catalog (one study per therapeutic area, contiguous `study-NNNN` IDs starting at `study-0001`, every criterion using a registered dimension and a valid unit).
- [x] 4.5 Add `SeedStartupHostedService` (`IHostedService`) that scopes a `ClinicalTrialsDbContext`, calls `db.Database.EnsureCreatedAsync(ct)` (to initialize the InMemory store), and then invokes `StudySeeder.SeedAsync` exactly once — idempotent (skipped when `db.Studies.AnyAsync()` returns `true`).
- [x] 4.6 Add NUnit tests for the repository using `UseInMemoryDatabase(Guid.NewGuid().ToString())` per test to guarantee isolation: `AddAsync` assigns the next sequential suffix when the store already contains studies, concurrent `AddAsync` calls produce distinct IDs (spin up N parallel tasks and assert the ID set size == N), `ReplaceAsync`/`UpdateEligibilityAsync` return `null` for missing IDs, and a round-trip (`AddAsync` → `GetByIdAsync`) preserves every field of every eligibility criterion (including the owned-entity fields).
- [x] 4.7 Add an NUnit test for `StudySeeder` verifying the catalog satisfies every Domain-level invariant (every criterion's dimension resolves, every unit matches the dimension's allow-list or is empty when the dimension declares none, IDs are contiguous and start at `study-0001`).
- [x] 4.8 Confirm EF Core types do not leak: the Application project has zero `Microsoft.EntityFrameworkCore.*` `PackageReference` entries, and no `.cs` file outside the Infrastructure project imports a `Microsoft.EntityFrameworkCore.*` namespace (spot-check via `rg "Microsoft\.EntityFrameworkCore" backend/src/ClinicalTrialsHub.Domain backend/src/ClinicalTrialsHub.Application`).

## 5. API layer (Minimal API host)

- [x] 5.1 Add `Program.cs` as the composition root: configure logging, add Application + Infrastructure services, wire `services.AddDbContext<ClinicalTrialsDbContext>(o => o.UseInMemoryDatabase("clinical-trials-hub"))`, register `IStudyRepository → EfStudyRepository` (scoped, matching the DbContext lifetime), and register `SeedStartupHostedService`.
- [x] 5.2 Configure global `JsonSerializerOptions` (`PropertyNamingPolicy = CamelCase`, `UnmappedMemberHandling = Disallow`, add `JsonStringEnumConverter` if any enums leak through).
- [x] 5.3 Add a global exception handler (`IExceptionHandler` registered with `UseExceptionHandler`) that maps `ValidationException`/`NotFoundException`/`InvalidJsonException` to the documented JSON envelopes and `500` for everything else (logging at `Error`).
- [x] 5.4 Add a JSON-input wrapper helper that catches `JsonException` from Minimal-API model binding and rethrows as `InvalidJsonException` so the same handler emits the `{ "message": "invalid JSON payload" }` body.
- [x] 5.5 Add a CORS named policy bound to `Cors:AllowedOrigins` configuration; allow only `GET`, `POST`, `PUT`, `OPTIONS`; allow `Content-Type`. Default development config lists `http://localhost:5173`.
- [x] 5.6 Add `MapHealthEndpoints` extension wiring `/health` via `MapHealthChecks` with a custom response writer that emits `{ "status": "ok" }`.
- [x] 5.7 Add `MapEligibilityEndpoints` extension exposing `GET /api/eligibility-dimensions` and returning `DimensionsResponseDto`. Reject non-GET methods with HTTP `405`.
- [x] 5.8 Add `MapStudiesEndpoints` extension exposing `GET /api/studies`, `POST /api/studies`, `GET /api/studies/{id}`, `PUT /api/studies/{id}`, `PUT /api/studies/{id}/eligibility`. Each handler delegates to `StudyService` and returns the documented status codes.
- [x] 5.9 Annotate every endpoint with OpenAPI metadata (`WithName`, `WithSummary`, `WithDescription`, `WithTags`, `Produces`, `ProducesProblem(400)`, `ProducesProblem(404)` where applicable). Add `.WithOpenApi()` on each route so the native OpenAPI generator picks up the metadata.
- [x] 5.10 Register the native OpenAPI stack: `builder.Services.AddOpenApi(options => { /* set Info.Title = "Clinical Trials Hub API", Version = "1.0", Description = "..." via an IOpenApiDocumentTransformer */ })` and `app.MapOpenApi()` (serves `/openapi/v1.json`). Do NOT reference `Swashbuckle.AspNetCore`.
- [x] 5.11 Register Scalar for the interactive UI: reference `Scalar.AspNetCore`, call `app.MapScalarApiReference()` (default route `/scalar/v1`, backed by `/openapi/v1.json`). Document both routes in `backend/README.md`.
- [x] 5.12 Add the build-time OpenAPI document generator by referencing `Microsoft.Extensions.ApiDescription.Server` in the API project and setting the MSBuild `<OpenApiDocumentsDirectory>` property to emit `backend/docs/openapi.json` on every build. Document the regeneration command (and a runtime fallback such as `curl http://localhost:5000/openapi/v1.json > backend/docs/openapi.json`) in `backend/README.md`.
- [x] 5.13 Remove the legacy Go-generated `backend/docs/swagger.json` and `backend/docs/swagger.yaml` once the newly generated `backend/docs/openapi.json` covers every endpoint and DTO; include the deletions in the same commit that adds the new artifact.
- [x] 5.14 Declare `public partial class Program;` at the bottom of `Program.cs` so integration tests can reference it.

## 6. Integration tests (HTTP layer)

- [x] 6.1 Add a `WebApplicationFactory<Program>`-based test fixture that rewires `ClinicalTrialsDbContext` to use a fresh InMemory database per test (e.g., `services.AddDbContext<ClinicalTrialsDbContext>(o => o.UseInMemoryDatabase(Guid.NewGuid().ToString()))` inside `ConfigureTestServices`, after removing the production registration) and exposes an `HttpClient`. Provide helpers to either run the seed or skip it depending on the test.
- [x] 6.2 Test `GET /health` returns HTTP `200` with `{ "status": "ok" }`.
- [x] 6.3 Test `GET /api/eligibility-dimensions` returns the registry under the `data` envelope and rejects non-GET methods with HTTP `405`.
- [x] 6.4 Test `GET /api/studies` returns the seeded catalog under the `data` envelope after startup, with IDs `study-0001`..`study-NNNN` in ascending order.
- [x] 6.5 Test `POST /api/studies` happy path returns HTTP `201` with `data.id` set to the next sequential suffix; assert the created study is then visible via `GET /api/studies/{id}`.
- [x] 6.6 Test `POST /api/studies` validation failure returns HTTP `400` with `{ message: "validation failed", errors: { ... } }` and assert at least one nested per-criterion field path appears in `errors` (e.g., `inclusionCriteria[0].deterministicRule.unit`).
- [x] 6.7 Test that any of the body-accepting endpoints returns HTTP `400` with `{ "message": "invalid JSON payload" }` when the body contains an unknown field.
- [x] 6.8 Test `GET /api/studies/{id}` returns HTTP `404` with the documented envelope for an unknown ID.
- [x] 6.9 Test `PUT /api/studies/{id}` happy path replaces the study and returns HTTP `200`; assert eligibility is overwritten by the new payload.
- [x] 6.10 Test `PUT /api/studies/{id}/eligibility` happy path updates only the eligibility fields and leaves every other field intact; assert HTTP `200` and that a follow-up `GET` confirms unchanged non-eligibility fields.
- [x] 6.11 Test that an unlisted CORS origin's preflight is rejected and a listed origin's preflight succeeds.
- [x] 6.12 Test `GET /openapi/v1.json` returns HTTP `200` with a JSON body whose `info.title` equals `"Clinical Trials Hub API"`, whose `openapi` version starts with `"3."`, and whose `paths` includes `/api/studies`, `/api/studies/{id}`, `/api/studies/{id}/eligibility`, `/api/eligibility-dimensions`, and `/health`.
- [x] 6.13 Test `GET /scalar/v1` returns HTTP `200` with a `text/html` body (smoke-check that the Scalar route is wired; we do not assert the full HTML).

## 7. Containerization and deployment

- [x] 7.1 Add a multi-stage `backend/Dockerfile` (build with `mcr.microsoft.com/dotnet/sdk:10.0`, run with `mcr.microsoft.com/dotnet/aspnet:10.0`); expose port `8080` and set `ASPNETCORE_URLS=http://+:8080`.
- [x] 7.2 Add `backend/fly.toml` exposing port `8080`, declaring an HTTP health check at `/health`, and documenting how to set `Cors__AllowedOrigins__0` via fly secrets.
- [x] 7.3 Build the Docker image locally and verify `/health` and `/api/studies` respond from a running container.

## 8. Repository-wide cleanup and documentation

- [x] 8.1 Update root `README.md` to describe the `backend/` structure, the four projects, the EF Core (InMemory) persistence boundary, the native OpenAPI + Scalar UI, and how to run/test the .NET backend (`dotnet run --project backend/src/ClinicalTrialsHub.Api`, `dotnet test backend/`, `/openapi/v1.json`, `/scalar/v1`).
- [x] 8.2 Update `docs/backend-architecture.md` to reflect the .NET 10 hexagonal layout (replace Go-specific references), the EF Core boundary (Infrastructure-only), and the native OpenAPI + Scalar stack; link to the spec capabilities.
- [x] 8.3 Smoke-test against the front-end: start the .NET backend on `:8080`, run `pnpm dev` in `frontend/` with `VITE_API_URL=http://localhost:8080`, exercise All Studies, the new-study wizard end-to-end (Publish), the Eligibility editor (Save), and confirm the AI assistant resolves a study by ID via `GET /api/studies/{id}`. Open `/scalar/v1` in the browser and confirm every endpoint is listed.
- [x] 8.4 Note in the change log that `backend-go-backup/` is the legacy reference and will be removed in a follow-up change once the .NET backend has shipped to production.
