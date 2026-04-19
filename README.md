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
- Phase
- Therapeutic area
- Patient population

It also includes:

- Study list API and UI
- Study detail API and UI
- Deterministic startup seed data
- Validation for required registration fields

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
