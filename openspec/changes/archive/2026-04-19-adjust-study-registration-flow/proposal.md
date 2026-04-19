## Why

The current MVP concentrates study creation, list, and detail inspection in a single screen and treats eligibility criteria as free-form text. The next slice needs a study-centered workflow that better matches the product direction, while making eligibility rules structured, readable, and extensible.

## What Changes

- Make `All studies` the frontend home view, showing all registered studies with basic summary information for navigation.
- Introduce a study workspace layout with a sidebar and `Summary` as the default section for each study.
- Add a dedicated `Eligibility criteria` screen reachable both from the sidebar and from an edit action in `Summary`.
- Replace free-form inclusion and exclusion criteria strings with structured criteria that include a human-readable description and a deterministic rule.
- Add a declarative dimension registry so new rule dimensions can be introduced by adding metadata rather than changing rule handling logic.
- Add backend support for updating study eligibility criteria after study creation.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `study-registration`: Expand study registration from a single create/list/detail flow into an `All studies` workspace experience with structured eligibility criteria editing and declarative dimension metadata.

## Impact

- Changes frontend navigation, layout, and form interactions for study registration.
- Changes backend domain models and API contracts for eligibility criteria.
- Adds update behavior to the in-memory repository and HTTP layer.
- Updates seed data and automated tests to use structured eligibility criteria.
