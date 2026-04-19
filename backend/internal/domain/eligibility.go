package domain

import "strings"

type DeterministicRule struct {
	DimensionID string  `json:"dimensionId"`
	Operator    string  `json:"operator"`
	Value       float64 `json:"value"`
	Unit        string  `json:"unit,omitempty"`
}

type EligibilityCriterion struct {
	Description       string            `json:"description"`
	DeterministicRule DeterministicRule `json:"deterministicRule"`
}

type DimensionDefinition struct {
	ID           string   `json:"id"`
	DisplayName  string   `json:"displayName"`
	Description  string   `json:"description"`
	AllowedUnits []string `json:"allowedUnits"`
}

var eligibilityDimensions = []DimensionDefinition{
	{
		ID:           "hsCRP",
		DisplayName:  "hsCRP",
		Description:  "high-sensitivity C-reactive protein",
		AllowedUnits: []string{"mg/L"},
	},
	{
		ID:           "LVEF",
		DisplayName:  "LVEF",
		Description:  "left ventricular ejection fraction",
		AllowedUnits: []string{"%"},
	},
	{
		ID:           "SBP",
		DisplayName:  "SBP",
		Description:  "systolic blood pressure",
		AllowedUnits: []string{"mmHg"},
	},
	{
		ID:           "age",
		DisplayName:  "Age",
		Description:  "participant age",
		AllowedUnits: []string{"years old"},
	},
}

func EligibilityDimensions() []DimensionDefinition {
	result := make([]DimensionDefinition, 0, len(eligibilityDimensions))
	for _, dimension := range eligibilityDimensions {
		result = append(result, cloneDimensionDefinition(dimension))
	}

	return result
}

func LookupEligibilityDimension(id string) (DimensionDefinition, bool) {
	normalizedID := strings.ToLower(strings.TrimSpace(id))
	for _, dimension := range eligibilityDimensions {
		if strings.ToLower(dimension.ID) == normalizedID {
			return cloneDimensionDefinition(dimension), true
		}
	}

	return DimensionDefinition{}, false
}

func cloneDimensionDefinition(dimension DimensionDefinition) DimensionDefinition {
	return DimensionDefinition{
		ID:           dimension.ID,
		DisplayName:  dimension.DisplayName,
		Description:  dimension.Description,
		AllowedUnits: append([]string(nil), dimension.AllowedUnits...),
	}
}
