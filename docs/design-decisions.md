# Design Decisions Document

This document records the main decisions taken while building the Clinical
Trials Hub POC and the reasoning behind them. The goal is to make the
trade-offs explicit so reviewers can evaluate the implementation against the
constraints of a short-lived prototype.

## 1. Why the "Study Design" module was chosen

In the materials I had access to, I could have a basic idea of how several modules work (Study Design, Country Allocation, Site Selection, Study Start-up, Study Execution, Resource Management and Cost Management).
Among them, the
**Study Design** was the one with the richest amount of information visible: objectives, endpoints, I/E criteria, number of participants, study type, number of arms, phase, therapeutic area and patient
population.

That made it possible to infer product behaviour end-to-end:
vocabulary for input fields,
validation rules, and
meaningful interactions (for example, the StudyHub assistant operating on top of the
registered catalog).

Other modules had interesting visual
hooks but not enough detail for me to reconstruct their behaviour with
confidence. Picking Study Design allowed the POC to go deep on a single
coherent flow instead of going shallow across many.

## 2. Why React + Vite + pnpm on the frontend

This combination is optimised for the kind of work a POC demands: fast
iteration and short feedback loops.

- **Vite** gives near-instant cold starts and reliable hot reload, which matters
  when quickly iterating over a new project.
- **pnpm** keeps installs way faster in comparison with npm.
- **React** is the frontend framework I am most fluent in, which keeps the focus on the product rather than on syntax.

## 3. Why in-memory storage

I chose not to introduce a real database for the POC. A real database would
pull in operational complexity (host, connection string, migrations,
lifecycle) that does not exercise any product decision — it only exercises
infrastructure.

To keep that decision reversible, the backend service layer depends on a repository **interface**, not on the in-memory implementation. Using EF Core also makes swapping the
storage engine (to PostgreSQL, for example) pretty easy.

## 4. Why a deterministic chat assistant instead of an LLM

The StudyHub assistant on the "Eligibility criteria" screen looks like a
chat agent, but it is intentionally **not** AI in this POC. Given the tight timebox, a
deterministic service was the better way to demonstrate the capability
without absorbing the cost of an LLM integration: picking a provider,
managing API keys, designing prompts, building an embeddings/retrieval
pipeline, and mitigating hallucinations.

Instead, the assistant uses a scored heuristic: therapeutic area, phase,
study type, shared eligibility dimensions.

This is sufficient to showcase the UX ("copy criteria from another study" and
"suggest criteria from similar studies")
with reproducible outputs. Replacing the heuristic with an LLM later would be a localised
change behind the existing assistant state machine.
