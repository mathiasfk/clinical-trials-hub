# Clinical Trials Hub — Frontend

React + TypeScript + Vite UI for study registration. Package manager: **pnpm**.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [pnpm](https://pnpm.io/installation)

## Install dependencies

```bash
cd frontend
pnpm install
```

## Scripts

| Command        | Description                                      |
|----------------|--------------------------------------------------|
| `pnpm dev`     | Start Vite dev server (HMR)                      |
| `pnpm build`   | Typecheck and production build to `dist/`        |
| `pnpm preview` | Serve the production build locally               |
| `pnpm test`    | Run Vitest                                       |
| `pnpm lint`    | Run ESLint                                       |

## Local development

The dev server listens on **`http://localhost:5173`** by default.

Requests to **`/api`** are proxied to **`http://localhost:8080`** ([`vite.config.ts`](vite.config.ts)). Start the [.NET backend](../backend/README.md) (default profile uses that port), or change the proxy target if your API runs elsewhere.

## Tooling notes

This project started from the official Vite React + TS template. For ESLint setup and React Compiler options, see the [Vite React documentation](https://vite.dev/guide/).
