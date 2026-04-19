package domain

import (
	"encoding/json"
	"strings"
	"testing"
)

// TestEligibilityDimensionsAllowedUnitsJSON guards the wire contract that
// unitless dimensions serialize as an empty JSON array, not null. The
// frontend EligibilityEditor indexes into allowedUnits and assumes it is
// always an array.
func TestEligibilityDimensionsAllowedUnitsJSON(t *testing.T) {
	t.Parallel()

	dimensions := EligibilityDimensions()

	unitlessIDs := map[string]bool{
		"ECOG": false,
		"MMSE": false,
	}

	for _, dimension := range dimensions {
		payload, err := json.Marshal(dimension)
		if err != nil {
			t.Fatalf("marshal dimension %s: %v", dimension.ID, err)
		}

		encoded := string(payload)

		if strings.Contains(encoded, `"allowedUnits":null`) {
			t.Errorf("dimension %s serialized allowedUnits as null: %s", dimension.ID, encoded)
		}

		if _, tracked := unitlessIDs[dimension.ID]; tracked {
			unitlessIDs[dimension.ID] = true
			if !strings.Contains(encoded, `"allowedUnits":[]`) {
				t.Errorf("dimension %s: expected allowedUnits to serialize as [], got %s", dimension.ID, encoded)
			}
		}
	}

	for id, seen := range unitlessIDs {
		if !seen {
			t.Errorf("expected registry to include unitless dimension %q", id)
		}
	}
}

// TestLookupEligibilityDimensionAllowedUnitsNonNil ensures individual lookups
// also return a non-nil slice for unitless dimensions so any direct consumer
// (HTTP handler or service) gets the same [] wire shape.
func TestLookupEligibilityDimensionAllowedUnitsNonNil(t *testing.T) {
	t.Parallel()

	for _, id := range []string{"ECOG", "MMSE"} {
		dimension, ok := LookupEligibilityDimension(id)
		if !ok {
			t.Fatalf("expected to find dimension %q", id)
		}
		if dimension.AllowedUnits == nil {
			t.Errorf("dimension %s: AllowedUnits is nil, want non-nil empty slice", id)
		}
		if len(dimension.AllowedUnits) != 0 {
			t.Errorf("dimension %s: expected empty AllowedUnits, got %v", id, dimension.AllowedUnits)
		}
	}
}
