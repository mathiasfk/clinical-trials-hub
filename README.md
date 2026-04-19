# Clinical Trials Hub

This repository contains an MVP for a clinical study registration module.

## Stack

- Frontend: React + Vite + pnpm
- Backend: Go
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
├── backend/   # Go API and in-memory repository
├── frontend/  # React + Vite UI
├── docs/      # Product notes and outlines
└── openspec/  # Change proposal, specs, and implementation tasks
```

## Local Development

### Backend

```bash
cd backend
go test ./...
go run ./cmd/api
```

The API runs on `http://localhost:8080` by default.

### Frontend

```bash
cd frontend
pnpm install --no-frozen-lockfile
pnpm test
pnpm dev
```

The Vite dev server proxies `/api` requests to `http://localhost:8080`.

## API Endpoints

- `GET /health`
- `GET /api/studies`
- `GET /api/studies/:id`
- `POST /api/studies`

## Postgres Compatibility (Phase 2)

The backend service layer depends on `StudyRepository` interfaces only.  
To move from in-memory to Postgres:

1. Implement a Postgres adapter that satisfies `StudyRepository`.
2. Wire the new adapter in `cmd/api/main.go`.
3. Keep service and handler layers unchanged.

This boundary keeps the migration focused on infrastructure instead of domain logic.
