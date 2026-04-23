# Clinical Trials Hub

This repository contains an MVP for a clinical study registration module.

## Stack

- Frontend: React + Vite + pnpm
- Backend: ASP.NET Core (.NET 10)
- Database: In-memory repository with deterministic seed data

## MVP Scope

The current MVP implements the **Study registration** slice from `docs/features-outline.md`:

- Objectives
- Endpoints
- Inclusion and exclusion criteria
- Number of participants
- Study type (`parallel`, `crossover`, `single-arm`)
- Number of arms
- Phase (closed vocabulary: `Phase 1`, `Phase 2`, `Phase 3`, `Phase 4`)
- Therapeutic area (closed vocabulary: `Cardiovascular`, `Diabetes`, `Hematology`, `Sickle Cell Disease`, `Obesity`, `Rare Diseases`, `Oncology`, `Neurology`)
- Patient population
- Schedule-of-activities milestones (optional ISO-8601 dates): first patient first visit, last patient first visit, protocol approval date

It also includes:

- Study list API and UI
- Study detail API and UI
- Deterministic startup seed data (hand-curated catalog with at least one study per therapeutic area so similarity ranking in the assistant is meaningful)
- Validation for required registration fields
- Repository-aware study ID generation (IDs skip seeded/persisted suffixes and continue the `study-NNNN` sequence without collisions)
- Eligibility minimum-validity requires **at least one criterion in total** across inclusion and exclusion (inclusion-only or exclusion-only studies are allowed)
- **StudyHub assistant** on the `Eligibility criteria` screen: a menu-driven chat dock that can copy criteria from another registered study or suggest up to three criteria from similar studies. The assistant uses a deterministic heuristic (no AI, no embeddings) documented in [`docs/assistant-heuristic.md`](docs/assistant-heuristic.md).

## Project Structure

```text
clinical-trials-hub/
├── backend/   # .NET 10 solution: Domain, Application, Infrastructure, Api + tests (see backend/README.md)
├── frontend/  # React + Vite UI
├── docs/      # Product notes, backend architecture, outlines
└── openspec/  # Change proposal, specs, and implementation tasks
```

## Local Development

More detail: [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md).

### Backend

The backend is a **four-project** solution (`ClinicalTrialsHub.Domain`, `ClinicalTrialsHub.Application`, `ClinicalTrialsHub.Infrastructure`, `ClinicalTrialsHub.Api`) plus `ClinicalTrialsHub.Tests`. Persistence is **EF Core InMemory** behind `IStudyRepository` (Infrastructure only). API docs are **native OpenAPI** at `/openapi/v1.json` and **Scalar** at `/scalar/v1`.

```bash
cd backend
dotnet run --project src/ClinicalTrialsHub.Api/ClinicalTrialsHub.Api.csproj
```

The API listens on **`http://localhost:8080`** by default (same port the Vite proxy targets). See [backend/README.md](backend/README.md).

```bash
cd backend
dotnet test ClinicalTrialsHub.sln
```

### Manual smoke (frontend + backend)

With the API on **8080** and the UI on **5173**:

1. Start the API: `cd backend && dotnet run --project src/ClinicalTrialsHub.Api/ClinicalTrialsHub.Api.csproj`
2. Start the UI with the API URL: `cd frontend && VITE_API_URL=http://localhost:8080 pnpm dev`
3. In the browser: open **All Studies**, complete the new-study wizard through **Publish**, edit eligibility and **Save**, and confirm the assistant can load another study by id (`GET /api/v1/studies/{id}`).
4. Open `http://localhost:8080/scalar/v1` and confirm every HTTP operation is listed.

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

The Vite dev server is at **`http://localhost:5173`** and proxies `/api` to **`http://localhost:8080`**.

### API contract and docs

When the API is running, OpenAPI JSON is served at `/openapi/v1.json` (OpenAPI **document** name) and the Scalar reference UI at `/scalar/v1` (same host and port as the API). Versioned REST resources live under `/api/v1/...`, not under `/openapi/...`.

Committed OpenAPI snapshots (optional handoff for tooling) live under [`backend/docs/`](backend/docs/):

- [`backend/docs/openapi.json`](backend/docs/openapi.json)
- [`backend/docs/ClinicalTrialsHub.Api.json`](backend/docs/ClinicalTrialsHub.Api.json)

## API Endpoints

- `GET /health`
- `GET /api/v1/eligibility-dimensions`
- `GET /api/v1/studies`
- `POST /api/v1/studies`
- `GET /api/v1/studies/:id`
- `PUT /api/v1/studies/:id`
- `PUT /api/v1/studies/:id/eligibility`
- `GET /api/v1/studies/:id/similar-suggestions`

For request and response schemas, use the running API (`/openapi/v1.json`) or the files under `backend/docs/` above.

## Postgres compatibility (phase 2)

The application layer depends on **`IStudyRepository`** only. To move from EF InMemory to PostgreSQL, swap the Infrastructure implementation (provider + migrations) and keep Domain/Application contracts unchanged.
