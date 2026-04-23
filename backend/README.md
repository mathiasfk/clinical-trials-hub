# Clinical Trials Hub — Backend

.NET 10 solution with a **hexagonal layout**: Domain (pure model), Application (use cases, validation, repository port), Infrastructure (EF Core InMemory + seeding), and Api (Minimal API host, CORS, native OpenAPI + Scalar). See [ClinicalTrialsHub.sln](ClinicalTrialsHub.sln).

## Prerequisites

- [.NET SDK 10](https://dotnet.microsoft.com/download) — version is pinned in [`global.json`](global.json).

## Run the API

The default launch profile listens on **`http://localhost:8080`**, matching the Vite dev proxy for `/api` ([`frontend/vite.config.ts`](../frontend/vite.config.ts)).

```bash
cd backend
dotnet run --project src/ClinicalTrialsHub.Api/ClinicalTrialsHub.Api.csproj
```

To use another URL or port, override at startup (for example `ASPNETCORE_URLS=http://localhost:5135 dotnet run ...`) or edit [`launchSettings.json`](src/ClinicalTrialsHub.Api/Properties/launchSettings.json).

## Tests

```bash
cd backend
dotnet test ClinicalTrialsHub.sln
```

Integration tests use `WebApplicationFactory` with an isolated in-memory database per run (`Persistence:InMemoryDatabaseName`).

## OpenAPI (runtime + build-time)

While the API is running:

- OpenAPI JSON: `http://localhost:8080/openapi/v1.json`
- Scalar UI: `http://localhost:8080/scalar/v1`

On every **build** of the Api project, `Microsoft.Extensions.ApiDescription.Server` writes `docs/ClinicalTrialsHub.Api.json`; a post-build step copies it to [`docs/openapi.json`](docs/openapi.json).

To refresh the committed snapshot without a full build, you can also:

```bash
cd backend
dotnet run --project src/ClinicalTrialsHub.Api/ClinicalTrialsHub.Api.csproj --no-build &
curl -sS http://localhost:8080/openapi/v1.json -o docs/openapi.json
```

## CORS

[`appsettings.Development.json`](src/ClinicalTrialsHub.Api/appsettings.Development.json) allows `http://localhost:5173`. Production-style overrides use `Cors:AllowedOrigins` (see [`fly.toml`](fly.toml)).

## Docker

Multi-stage image ([`Dockerfile`](Dockerfile)): SDK `mcr.microsoft.com/dotnet/sdk:10.0` to publish, runtime `mcr.microsoft.com/dotnet/aspnet:10.0`, port **8080**, `ASPNETCORE_URLS=http://+:8080`.

```bash
cd backend
docker build -t clinical-trials-hub-api:local .
docker run --rm -p 8080:8080 clinical-trials-hub-api:local
```

Then verify:

```bash
curl -sS http://localhost:8080/health
curl -sS http://localhost:8080/api/studies | head
```

## Fly.io

See [`fly.toml`](fly.toml). Set CORS origins with indexed configuration keys, for example:

```bash
fly secrets set Cors__AllowedOrigins__0="https://your-app.example"
```
