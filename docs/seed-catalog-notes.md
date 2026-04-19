# Seed study catalog

The studies returned by `bootstrap.SeedStudies()` in the Go backend are **hand-written** registration fixtures. They are **not** loaded from the CSV exports under `docs/clinical-trials-gov-examples/` at runtime; those files are inspiration-only references for titles, phases, and clinical tone.

`Oncology` and `Neurology` seeds follow common trial-protocol patterns (performance status, cognition, renal safety) because no CSV was provided for those therapeutic areas in this repository.
