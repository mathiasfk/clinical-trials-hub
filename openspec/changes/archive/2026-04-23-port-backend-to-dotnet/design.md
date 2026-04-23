## Context

The Clinical Trials Hub MVP runs a React + Vite front-end against a Go HTTP server that uses an in-memory repository. The Go server (now archived under `backend-go-backup/`) implements five endpoints — `/health`, `GET/POST /api/studies`, `GET/PUT /api/studies/{id}`, `PUT /api/studies/{id}/eligibility`, and `GET /api/eligibility-dimensions` — and seeds a deterministic catalog at startup so the front-end always has data to display. The authoritative wire contract is the set of TypeScript types at `frontend/src/types.ts`; the existing `backend/docs/swagger.{json,yaml}` files were emitted by the Go server and are treated here as an initial reference only — the native .NET OpenAPI output may supersede them.

The team is standardizing on .NET as the long-term backend platform and wants the rebuild done before any feature work continues. The new server must:

- Be 100 % wire-compatible with the current front-end at `frontend/` (paths, JSON shape, status codes, error envelope, ID format, seed catalog, dimension registry).
- Stay deliberately small and idiomatic — a Minimal-API host with hexagonal layering, no premature MediatR/CQRS noise — while still routing persistence through EF Core from day one so the PostgreSQL migration is a provider swap.
- Keep persistence behind a repository interface declared in the Application layer; the EF Core `DbContext` and all EF-specific types MUST live in the Infrastructure layer so Domain and Application stay storage-agnostic.
- Use NUnit + NSubstitute for tests, structured logging via `ILogger<T>`, and describe the API with the native ASP.NET Core OpenAPI stack (`Microsoft.AspNetCore.OpenApi`) plus Scalar for the interactive UI.
- Be deployable as a container image to fly.io while the front-end deploys to Vercel.

Stakeholders: backend developers (own the server), front-end developers (consume the API), and ops (deploy to fly.io). The OpenSpec specs `platform-bootstrap`, `study-registration`, and `study-assistant` define the existing contract that must continue to hold.

## Goals / Non-Goals

**Goals:**

- Replace the Go backend with an idiomatic .NET 10 backend in a single solution at `backend/`.
- Preserve the HTTP contract and JSON shape exactly (camelCase, `{ data: ... }` envelope, `{ message, errors }` error envelope, `unknown JSON field` rejection).
- Apply a hexagonal layout with one project per layer (`Domain`, `Application`, `Infrastructure`, `Api`) plus a single test project, keeping dependencies pointing inward.
- Use Minimal APIs with endpoint groups, FluentValidation for request validation, and a global exception-handling middleware to map Application-layer failures to HTTP responses.
- Route persistence through EF Core (`Microsoft.EntityFrameworkCore` + `Microsoft.EntityFrameworkCore.InMemory` for the MVP) so switching to PostgreSQL later is a provider swap plus migrations, with no Domain or Application changes.
- Describe the API with the native ASP.NET Core OpenAPI stack (`Microsoft.AspNetCore.OpenApi` — `AddOpenApi`/`MapOpenApi`), export the OpenAPI document to `backend/docs/openapi.json` at build time, and render the interactive UI with Scalar (`Scalar.AspNetCore` — `MapScalarApiReference`).
- Provide centralized package and build settings (`Directory.Packages.props`, `Directory.Build.props`, `.editorconfig`) so every project shares warnings-as-errors, nullable enabled, and consistent style.
- Cover the domain rules, application services, validators, and HTTP endpoints with NUnit tests, including a `WebApplicationFactory<Program>`-based integration test set against the in-memory EF Core infrastructure.

**Non-Goals:**

- Adding new product features beyond what the current Go backend exposes.
- Implementing the AI assistant on the backend (the heuristic stays on the front-end per the existing spec).
- Persisting to PostgreSQL or Redis (only the EF Core contract for that future swap is established).
- Adding authentication, authorization, multi-tenancy, or rate limiting.
- Adopting MediatR, AutoMapper, CQRS pipelines, Swashbuckle, or Serilog. We deliberately stick with the BCL and the ASP.NET Core native stack where possible.
- Maintaining the legacy `backend/docs/swagger.{json,yaml}` Go-generated artifacts: they stay only while they are useful as reference and may be deleted once the native OpenAPI artifact is in place.
- Changing the front-end (`frontend/`) in any way; if the front-end needs an adjustment it is a separate change.

## Decisions

### Decision 1: Solution layout — four projects + tests, one solution at `backend/`

```
backend/
  ClinicalTrialsHub.sln
  Directory.Build.props
  Directory.Packages.props
  .editorconfig
  global.json                          # pin SDK to 10.0.x
  Dockerfile
  fly.toml
  src/
    ClinicalTrialsHub.Domain/          # entities, value objects, vocabularies, dimension registry
    ClinicalTrialsHub.Application/     # services (use cases), repository contracts, validators, errors
    ClinicalTrialsHub.Infrastructure/  # EF Core DbContext + InMemory provider, repository implementation,
                                       # sequential ID generator, seed data
    ClinicalTrialsHub.Api/             # Program.cs, endpoint groups, JSON/CORS/OpenAPI/Scalar/middleware
  tests/
    ClinicalTrialsHub.Tests/           # NUnit; mirrors the src tree by namespace
  docs/
    openapi.json                       # generated at build time by Microsoft.Extensions.ApiDescription.Server
    # (legacy Go-generated `swagger.json` / `swagger.yaml` live here only as initial reference and
    #  MAY be deleted once the native .NET OpenAPI artifact is in place)
```

Dependencies point strictly inward: `Api` → `Application` → `Domain`; `Infrastructure` → `Application` → `Domain`. The `Api` project also references `Infrastructure` only to register concrete implementations in `Program.cs` (the Composition Root). Domain has zero project or NuGet dependencies beyond the BCL. EF Core types (`DbContext`, `DbSet<T>`, `IEntityTypeConfiguration<T>`, `Microsoft.EntityFrameworkCore.*` packages) are confined to the `Infrastructure` project — they MUST NOT appear in `Domain` or `Application`.

**Why one project per layer instead of a single project with folders?** Project boundaries make the inward-dependency rule a compile-time invariant; nobody can accidentally import an EF Core type into the domain or application. The cost of four small projects is negligible with `Directory.Packages.props` centralizing versions.

**Why a single test project instead of one per layer?** The test surface is small (≤ ~40 tests for the MVP), shared test helpers (in-memory repo factory, seeded `WebApplicationFactory`) are easier to reuse, and a single `dotnet test` run is faster.

### Decision 2: Minimal APIs with endpoint groups, no controllers

`Program.cs` builds the host, configures services, and calls `MapStudiesEndpoints`, `MapEligibilityEndpoints`, and `MapHealthEndpoints` extension methods declared in `Api/Endpoints/*.cs`. Each endpoint is a small lambda that:

1. Accepts the request DTO (record) plus dependencies via parameter binding (Minimal API DI).
2. Calls a single Application service method.
3. Returns `Results.Ok(...)`, `Results.Created(...)`, `Results.NotFound(...)`, etc.

We do **not** use controllers, MediatR, or hand-rolled request/response pipelines. Cross-cutting concerns (exception mapping, JSON config, CORS, logging) live in middleware and host configuration.

**Why?** The endpoint surface is tiny (six routes), and Minimal APIs match the user's "simple and elegant, no excessive boilerplate" requirement while still giving us OpenAPI metadata (`WithName`, `WithSummary`, `Produces`, `ProducesProblem`).

### Decision 3: JSON contract — `System.Text.Json` configured globally for camelCase + reject unknown fields

Configure the global `JsonSerializerOptions` once in `Program.cs`:

```csharp
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow;
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
});
```

`UnmappedMemberHandling.Disallow` reproduces the Go server's `decoder.DisallowUnknownFields()` behavior: any extra JSON property triggers a `JsonException`, which the exception middleware maps to a `400` with the `{ message: "invalid JSON payload" }` envelope. DTOs are declared as immutable `record` types in the Application layer (e.g., `StudyCreateInputDto`), and **JSON attributes do not appear on Domain types** — the Domain stays pure.

**Why `record`?** Matches the user's request, gives value-equality for free (helpful in tests), keeps DTOs immutable so handlers can't mutate inbound payloads.

### Decision 4: Validation — FluentValidation in the Application layer, single shape mapped to `{ message, errors }`

Each input DTO has a `FluentValidation.AbstractValidator<T>` co-located with the service that consumes it. Validators encode every rule from the existing Go service (allow-listed phases/therapeutic areas/study types, ISO-8601 optional dates, deterministic-rule completeness, dimension lookup against the registry, unit allow-list per dimension). The Application service runs validation explicitly (`await _validator.ValidateAsync(input, ct)`) and throws a small `ValidationException` carrying a `Dictionary<string, string>` of field → message. The exception middleware maps it to a `400` with `{ message: "validation failed", errors: { ... } }`.

**Why FluentValidation over DataAnnotations?** Our rules are non-trivial (per-criterion field paths like `inclusionCriteria[2].deterministicRule.unit`, conditional rules based on the resolved dimension). DataAnnotations cannot express these without bespoke attributes; FluentValidation handles them naturally and keeps the rules out of the DTOs.

**Why a custom `ValidationException` instead of `ProblemDetails`?** The front-end expects `{ message, errors }` (see `ApiErrorResponse` in `frontend/src/types.ts`). RFC 7807 `ProblemDetails` would break the contract.

### Decision 5: Repository contract in Application, EF-Core-backed implementation in Infrastructure, ID generation behind the repository

```csharp
// Application/Abstractions/IStudyRepository.cs
public interface IStudyRepository
{
    Task<Study> AddAsync(StudyDraft draft, CancellationToken ct);
    Task<IReadOnlyList<Study>> ListAsync(CancellationToken ct);
    Task<Study?> GetByIdAsync(string id, CancellationToken ct);
    Task<Study?> ReplaceAsync(string id, StudyDraft draft, CancellationToken ct);
    Task<Study?> UpdateEligibilityAsync(string id, IReadOnlyList<EligibilityCriterion> inclusion,
                                        IReadOnlyList<EligibilityCriterion> exclusion, CancellationToken ct);
}
```

The contract is deliberately technology-agnostic — it returns plain Domain records and knows nothing about EF Core, `DbContext`, `IQueryable`, `SaveChangesAsync`, change tracking, or any storage provider. The Application layer depends only on this interface.

The Infrastructure project provides the implementation:

- `Infrastructure/Persistence/ClinicalTrialsDbContext.cs` — an EF Core `DbContext` exposing a `DbSet<Study>` plus the owned collections for eligibility criteria and deterministic rules. All mapping lives in `IEntityTypeConfiguration<T>` classes under `Infrastructure/Persistence/Configurations/` so no EF Core attribute or dependency leaks into the Domain records.
- `Infrastructure/Persistence/EfStudyRepository.cs` — implements `IStudyRepository` by delegating to `ClinicalTrialsDbContext`. `AddAsync` owns ID generation atomically: inside a single async critical section (a `SemaphoreSlim` guard around the `DbContext`, since the in-memory provider does not serialize writes for us and a future PostgreSQL port will replace this with `SELECT ... FOR UPDATE` / `UPDATE ... RETURNING`), it computes the next `study-NNNN` suffix via `await _db.Studies.Select(s => s.Id).MaxAsync(...)`, materializes the `Study` with that ID, and calls `SaveChangesAsync`.
- The `DbContext` is registered in `Program.cs` via `services.AddDbContext<ClinicalTrialsDbContext>(o => o.UseInMemoryDatabase("clinical-trials-hub"))`. The InMemory provider is the only concrete provider referenced for the MVP; swapping to PostgreSQL is a one-line change (`o.UseNpgsql(...)`) plus generating real migrations, with no Domain, Application, or API change.

**Why go through EF Core now instead of keeping a hand-rolled `ConcurrentDictionary`?** The user explicitly wants the persistence path to be "drop-in ready" for PostgreSQL. EF Core + `UseInMemoryDatabase` gives us the identical `DbContext`/`IQueryable` surface from day one, so the swap later is a provider-plus-migrations change rather than a rewrite of the repository. The cost is two extra NuGet packages and a small amount of mapping code — well worth avoiding the second migration.

**Why repository-owned IDs instead of a separate `IIdGenerator` injected into the service (as the Go code does)?** The Go layout had a race window between "compute next ID" and "persist", because the two calls were separate. Putting both inside the repository's `AddAsync` makes the sequence atomic per implementation. The Application service does not care _how_ the ID is produced; it only cares that the persisted `Study` carries one. With EF Core, the critical section is local to `EfStudyRepository`; the eventual PostgreSQL implementation can rely on database-level sequences and drop the lock.

**Why map Domain records to EF via `IEntityTypeConfiguration<T>` instead of a separate persistence model?** The Domain aggregates here are small and shape-stable (five records totalling ~20 properties). Configuring them via the fluent API keeps Domain dependency-free while avoiding the maintenance cost of a parallel `StudyEntity` type with hand-written mappers. If the Domain grows richer value objects or behaviors that EF Core cannot cleanly represent, we can introduce a persistence-model layer without changing the repository interface.

**Why `Task` everywhere?** EF Core is async-first; every repository operation returns `Task` or `Task<T>` and forwards a `CancellationToken` all the way to `DbContext`.

### Decision 6: Domain stays pure — entities + value objects + registry, no infrastructure types

The Domain project contains:

- `Study` (record) — full study aggregate, identical fields to `frontend/src/types.ts`.
- `StudyDraft` (record) — the same shape minus `Id`, used as the input to `IStudyRepository.AddAsync` and `ReplaceAsync`.
- `EligibilityCriterion`, `DeterministicRule` (records).
- `EligibilityDimension` (record) and `EligibilityDimensionRegistry` (sealed class with the static catalog from the Go code).
- `StudyType`, `Phase`, `TherapeuticArea` — represented as `string` plus static `AllowedValues` arrays on a `Vocabularies` static class (we do not introduce an `enum` or smart-enum type because the wire format is open-string and the vocabulary may grow). The arrays are the single source of truth for both validation and OpenAPI examples.

No JSON attributes, no FluentValidation references, no EF Core attributes (`[Key]`, `[Owned]`, etc.), no logging — the Domain compiles against `netstandard2.1`-compatible BCL only (target framework is `net10.0` for simplicity, but the dependency graph stays clean). EF Core mapping for these records is done entirely via `IEntityTypeConfiguration<T>` classes in the Infrastructure project (see Decision 5).

### Decision 7: Error model — three Application-level exceptions, mapped centrally

The Application layer defines exactly three exception types:

- `ValidationException(IDictionary<string, string> errors)` → HTTP 400 with `{ message: "validation failed", errors }`.
- `NotFoundException(string resource)` → HTTP 404 with `{ message: "<resource> not found" }`.
- `InvalidJsonException(string detail)` (thrown by the JSON middleware wrapper for `JsonException`) → HTTP 400 with `{ message: "invalid JSON payload" }`.

Anything else bubbles up to a fallback handler that logs at `Error` level and returns HTTP 500 with `{ message: "internal server error" }`. We use `IExceptionHandler` (the .NET 8+ first-class hook) registered with `UseExceptionHandler()` rather than a hand-rolled middleware. Exceptions are used for the Application → API boundary only; they are not used for control flow inside the Application or Domain layers.

**Why exceptions instead of `Result<T, Error>`?** Both work, but `Result<T, Error>` adds friction in Minimal-API endpoints (every handler has to pattern-match) for a backend with three failure modes. Exceptions plus a single `IExceptionHandler` keep the endpoints down to one or two lines each.

### Decision 8: Seeding via `IHostedService` that delegates to an Infrastructure-owned `IStudySeeder`

`Infrastructure/Seeding/StudySeeder.cs` exposes the deterministic catalog (one study per therapeutic area, contiguous `study-NNNN` IDs starting at `study-0001`). It is invoked by a tiny `SeedStartupHostedService` registered in `Program.cs`. The seeder uses the same `IStudyRepository` contract (or, for efficiency, a direct `ClinicalTrialsDbContext.Studies.AddRangeAsync` call — Infrastructure-internal either way), ensures the EF Core model is created (`await db.Database.EnsureCreatedAsync(ct)` against the InMemory provider), and is idempotent (skipped if the repository already contains studies). It runs before the host starts accepting traffic, so `/api/studies` returns the seeded set on the first request.

The seed data can be moved to a JSON resource file later, but for the MVP it stays as a C# `static readonly` catalog so we keep the Go behavior bit-for-bit and avoid an extra resource-loading step.

### Decision 9: OpenAPI via the native ASP.NET Core stack (`AddOpenApi`/`MapOpenApi`) + Scalar for the UI

Use the native ASP.NET Core OpenAPI support introduced in .NET 9 and stabilized in .NET 10, not Swashbuckle:

```csharp
// Program.cs (excerpt)
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((doc, ctx, _) =>
    {
        doc.Info = new OpenApiInfo
        {
            Title = "Clinical Trials Hub API",
            Version = "1.0",
            Description = "REST API backing the Clinical Trials Hub front-end."
        };
        return Task.CompletedTask;
    });
});

// ...
app.MapOpenApi();                   // serves /openapi/v1.json
app.MapScalarApiReference();        // serves /scalar/v1 (Scalar UI)
```

`Microsoft.AspNetCore.OpenApi` consumes the same Minimal-API metadata the endpoints already declare (`.WithName`, `.WithSummary`, `.WithDescription`, `.WithTags`, `.Produces<StudyResponseDto>(200)`, `.ProducesProblem(400)`), emits an OpenAPI 3.1 document, and requires no additional filter code for our shape (`{ data: ... }` envelope, error envelope) — we expose them as typed DTOs so the schema follows automatically.

The interactive UI is rendered by **Scalar** (`Scalar.AspNetCore` package) via `app.MapScalarApiReference()`, which hosts a single-page reference at `/scalar/v1` reading from the `/openapi/v1.json` document. Scalar replaces Swagger UI entirely; no Swashbuckle package is referenced.

For build-time export, we add the `Microsoft.Extensions.ApiDescription.Server` package to the API project, which integrates with `dotnet build` to emit the OpenAPI document to `backend/docs/openapi.json` on every build (target path set via MSBuild `<OpenApiDocumentsDirectory>` property). On demand, `dotnet run --project backend/src/ClinicalTrialsHub.Api --urls http://localhost:5000` followed by `curl http://localhost:5000/openapi/v1.json > backend/docs/openapi.json` also works and is documented in `backend/README.md`.

**Swagger.json / swagger.yaml legacy files**: The existing `backend/docs/swagger.{json,yaml}` files were generated by the Go server's `swaggo/swag` toolchain and are OpenAPI 2.0 (Swagger 2.0). The .NET native stack emits OpenAPI 3.1. We therefore treat the Go-generated files as reference-only during the port: if the regenerated `openapi.json` covers every endpoint with the correct DTOs, delete `swagger.json` and `swagger.yaml` rather than try to maintain both formats. The repository-level commit that finalizes this change removes them.

**Why native OpenAPI + Scalar over Swashbuckle + Swagger UI?** (a) Native OpenAPI is the direction ASP.NET Core is going — it emits OpenAPI 3.1, plays natively with `WithOpenApi()` metadata, and has no third-party dependency; (b) Scalar gives a nicer, modern reference UI than Swagger UI, with zero custom theming work; (c) the user explicitly requested both. Swashbuckle's only remaining advantage would be the `dotnet swagger tofile` CLI, which `Microsoft.Extensions.ApiDescription.Server` replaces.

### Decision 10: CORS — single named policy bound to a configuration list

`AppSettings.Cors.AllowedOrigins` (a `string[]` in `appsettings.json`) drives a named CORS policy applied to every endpoint. The local default lists `http://localhost:5173` (Vite dev server). Production overrides the list via environment variable `Cors__AllowedOrigins__0=https://...vercel.app`. Methods and headers are restricted to what the front-end actually uses (`GET`, `POST`, `PUT`, `OPTIONS`; `Content-Type`).

### Decision 11: Health check via `MapHealthChecks` with a custom response writer

We use `app.MapHealthChecks("/health", new HealthCheckOptions { ResponseWriter = WriteOkJson })` where `WriteOkJson` emits `{ "status": "ok" }`. This avoids a hand-rolled endpoint while still matching the existing JSON shape exactly.

### Decision 12: Logging — `ILogger<T>` with structured semantic placeholders

Every service and endpoint takes `ILogger<T>` via DI. Logs always use semantic placeholders (`_logger.LogInformation("Created study {StudyId}", study.Id)`) and never string interpolation. Default minimum level is `Information` in Production and `Debug` in Development. We rely on the built-in console logger; no Serilog or third-party sink is added for the MVP.

### Decision 13: Tests — NUnit + NSubstitute + `WebApplicationFactory<Program>`

`Program.cs` declares a `public partial class Program;` line at the bottom so tests can reference it. The test project includes:

- **Domain tests**: dimension-registry lookups, vocabulary `Contains` checks.
- **Application tests**: validators (one test class per validator) and services (using NSubstitute for `IStudyRepository`).
- **HTTP integration tests**: spin up `WebApplicationFactory<Program>` configured with the in-memory infrastructure; assert status codes, JSON shape, and that unknown fields are rejected, that PUT /eligibility leaves non-eligibility fields untouched, and that POST returns the next sequential ID after the seed catalog.

We avoid `xUnit` per the user's request; NUnit's `[TestFixture]` + `[Test]` style works fine alongside Minimal APIs.

### Decision 14: Centralized MSBuild via `Directory.Build.props` and `Directory.Packages.props`

`Directory.Build.props` at `backend/` sets:

```xml
<TargetFramework>net10.0</TargetFramework>
<Nullable>enable</Nullable>
<ImplicitUsings>enable</ImplicitUsings>
<TreatWarningsAsErrors>true</TreatWarningsAsErrors>
<EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
<LangVersion>latest</LangVersion>
```

`Directory.Packages.props` enables central package management and pins every NuGet version in one place. `.editorconfig` enforces file-scoped namespaces, `var` for obvious types, and the conventions called out in the .NET workspace rule.

### Decision 15: Containerization — multi-stage Dockerfile + minimal `fly.toml`

The Dockerfile uses `mcr.microsoft.com/dotnet/sdk:10.0` for build and `mcr.microsoft.com/dotnet/aspnet:10.0` for the runtime, restoring once and copying the published output. `fly.toml` exposes port `8080` (matching the Go default), wires the `/health` route as the fly health check, and reads `Cors__AllowedOrigins__0` from fly secrets. The Vercel front-end deploys independently and only needs `VITE_API_URL` pointing at the fly app's URL.

## Risks / Trade-offs

- **.NET 10 SDK availability** → Mitigation: pin the SDK version with `global.json`. If .NET 10 is not yet GA in CI, fall back to .NET 9 LTS for an interim period; the code uses no .NET-10-only APIs (native OpenAPI is already stable in .NET 9).
- **JSON shape drift between the generated OpenAPI document and the live serializer** → Mitigation: the integration tests assert the exact response shape (camelCase keys, `data` envelope, error envelope). The exported `openapi.json` is committed and code-reviewed on every change.
- **Unknown-field rejection only triggers when the request matches a typed binding** → Mitigation: bind every request body to a typed DTO record (no `JsonElement` shortcuts) so `UnmappedMemberHandling.Disallow` always applies.
- **EF Core InMemory loses data on every restart and has different semantics than a relational provider** → Accepted for the MVP (parity with the previous Go backend's in-memory store). The InMemory provider deliberately does not enforce referential integrity or transactional isolation; we rely on application-level invariants plus the repository's `SemaphoreSlim` for the ID-assignment critical section. The PostgreSQL migration covered as a follow-up will tighten this via database-level constraints.
- **EF Core owned-entity quirks with the InMemory provider** → Mitigation: configure eligibility collections as owned entities with explicit keys in the `IEntityTypeConfiguration<Study>` mapping, and assert via integration tests that a round-trip (`AddAsync` → `GetByIdAsync`) preserves every field of every criterion.
- **EF Core types leaking outside Infrastructure** → Mitigation: a compile-time invariant enforced by project references (Application has no reference to `Microsoft.EntityFrameworkCore.*`) plus a review checklist item. No repository method returns `IQueryable<T>`; all return materialized `Study` / `IReadOnlyList<Study>`.
- **FluentValidation adds a NuGet dependency for the Application layer** → Accepted. The expressive surface saves substantially more code than DataAnnotations + custom attributes; the Application layer has no other infrastructure dependencies, so it remains testable in isolation.
- **Repository-owned ID generation makes it harder to test ID conflicts in isolation** → Mitigation: the EF-Core repo's ID logic is covered by a focused test that pre-seeds high suffixes and asserts the next allocated ID; a separate test exercises concurrent `AddAsync` calls under the semaphore.
- **OpenAPI generation drift between dev and CI** → Mitigation: `Microsoft.Extensions.ApiDescription.Server` emits the document on every build; CI verifies `git diff --exit-code backend/docs/openapi.json` after building.
- **Scalar package churn (young package)** → Mitigation: `Scalar.AspNetCore` is a thin wrapper over a static asset bundle; if the package becomes problematic, the replacement (another UI consuming the same `/openapi/v1.json` document) is a drop-in swap that does not change any domain or endpoint code.
- **CORS misconfiguration in production** → Mitigation: configuration-driven origins with a startup log line that lists active origins; integration test that rejects an unlisted origin's preflight.

## Migration Plan

1. **Scaffold the .NET solution** at `backend/` (solution + four projects + test project + `Directory.*.props` + `.editorconfig` + `global.json`).
2. **Port the Domain** (entities, value objects, dimension registry, vocabularies). Add NUnit tests against the registry and vocabularies.
3. **Port the Application layer** (DTO records, validators, services, repository contract, exception types). NUnit tests against validators and services using NSubstitute repositories.
4. **Implement the Infrastructure layer**: add the EF Core `ClinicalTrialsDbContext` with `IEntityTypeConfiguration<T>` mappings (Domain records stay attribute-free), implement `EfStudyRepository` with the async ID-generation critical section, add the deterministic seed catalog and `SeedStartupHostedService` (which calls `EnsureCreatedAsync` and seeds idempotently). NUnit tests run against `UseInMemoryDatabase(...)` with a unique database name per test.
5. **Implement the API layer** (Program.cs composition root wiring `AddDbContext<ClinicalTrialsDbContext>(o => o.UseInMemoryDatabase(...))`, JSON/CORS/exception middleware, endpoint groups, health check, `AddOpenApi()` + `MapOpenApi()` + `MapScalarApiReference()`). Integration tests via `WebApplicationFactory<Program>` that swap in a fresh InMemory database name per test.
6. **Generate `backend/docs/openapi.json`** via the build-time OpenAPI generator (`Microsoft.Extensions.ApiDescription.Server`). Compare the result against the legacy `backend/docs/swagger.{json,yaml}` files to confirm every endpoint and DTO is covered; once confirmed, **delete the legacy Go-generated `swagger.json` and `swagger.yaml`** files from `backend/docs/`.
7. **Smoke-test against the front-end**: start the .NET server on `:8080` and the Vite dev server with `VITE_API_URL=http://localhost:8080`, exercise the All-Studies flow, the new-study wizard, and the eligibility editor. Also open `/scalar/v1` to confirm the API reference UI renders every endpoint.
8. **Add the Dockerfile + `fly.toml`**; build the image locally and run a CORS preflight from a placeholder Vercel origin.
9. **Update repo-level docs** (`README.md`, `docs/backend-architecture.md`) to point at the .NET layout, the EF Core / InMemory choice, the native OpenAPI + Scalar stack, and the new build/test commands.
10. **Decommission `backend-go-backup/`** in a follow-up change once the .NET backend has been live in deployment for one cycle. (Out of scope here.)

Rollback strategy: the Go backend remains intact under `backend-go-backup/` and its container image is already tagged in fly.io. Reverting is a single deploy of the previous image; the front-end requires no change because the contract is preserved.

## Open Questions

- **.NET 10 GA timing in CI**: do we want to allow .NET 9 as a fallback in CI workflows during the transition, or hard-pin 10? Defaulting to "pin 10 via `global.json`, allow `rollForward: latestFeature` so .NET 10 preview SDKs are accepted"; note that both the native OpenAPI stack and Scalar run fine on .NET 9 if we need to fall back.
- **OpenAPI export path**: `backend/docs/openapi.json` (single file, OpenAPI 3.1) is the default. Do we also want a YAML mirror at `backend/docs/openapi.yaml`? Default to "no" — JSON is the native format the generator emits, and consumers (NSwag, front-end typings) read JSON directly. Revisit if operations prefer YAML for diffs.
- **Where to place the seed catalog long-term**: stay in C# code or move to a versioned JSON file under `backend/src/ClinicalTrialsHub.Infrastructure/Seeding/seed.json`? Default to C# code for the MVP (parity with Go, no extra IO at startup); revisit if the catalog grows past ~20 entries.
- **EF Core mapping strategy**: map Domain records directly via `IEntityTypeConfiguration<T>` (Option A, chosen) vs introduce a parallel persistence model with hand-written mappers (Option B). We pick Option A for the MVP; if the Domain grows richer behavior (value objects with private state, domain events) we revisit Option B without breaking the repository contract.
