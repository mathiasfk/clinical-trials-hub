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
	{
		ID:           "BMI",
		DisplayName:  "BMI",
		Description:  "body mass index",
		AllowedUnits: []string{"kg/m²"},
	},
	{
		ID:           "weight",
		DisplayName:  "Weight",
		Description:  "participant body weight",
		AllowedUnits: []string{"kg"},
	},
	{
		ID:           "DBP",
		DisplayName:  "DBP",
		Description:  "diastolic blood pressure",
		AllowedUnits: []string{"mmHg"},
	},
	{
		ID:           "heartRate",
		DisplayName:  "Heart rate",
		Description:  "resting heart rate",
		AllowedUnits: []string{"bpm"},
	},
	{
		ID:           "QTc",
		DisplayName:  "QTc",
		Description:  "corrected QT interval",
		AllowedUnits: []string{"ms"},
	},
	{
		ID:           "HbA1c",
		DisplayName:  "HbA1c",
		Description:  "glycated hemoglobin",
		AllowedUnits: []string{"%"},
	},
	{
		ID:           "fastingPlasmaGlucose",
		DisplayName:  "Fasting plasma glucose",
		Description:  "fasting plasma glucose",
		AllowedUnits: []string{"mg/dL"},
	},
	{
		ID:           "eGFR",
		DisplayName:  "eGFR",
		Description:  "estimated glomerular filtration rate",
		AllowedUnits: []string{"mL/min/1.73m²"},
	},
	{
		ID:           "creatinine",
		DisplayName:  "Creatinine",
		Description:  "serum creatinine",
		AllowedUnits: []string{"mg/dL"},
	},
	{
		ID:           "ALT",
		DisplayName:  "ALT",
		Description:  "alanine aminotransferase",
		AllowedUnits: []string{"U/L"},
	},
	{
		ID:           "totalBilirubin",
		DisplayName:  "Total bilirubin",
		Description:  "total serum bilirubin",
		AllowedUnits: []string{"mg/dL"},
	},
	{
		ID:           "hemoglobin",
		DisplayName:  "Hemoglobin",
		Description:  "blood hemoglobin concentration",
		AllowedUnits: []string{"g/dL"},
	},
	{
		ID:           "HbF",
		DisplayName:  "HbF",
		Description:  "fetal hemoglobin fraction",
		AllowedUnits: []string{"%"},
	},
	{
		ID:           "platelets",
		DisplayName:  "Platelets",
		Description:  "platelet count",
		AllowedUnits: []string{"×10⁹/L"},
	},
	{
		ID:           "ANC",
		DisplayName:  "ANC",
		Description:  "absolute neutrophil count",
		AllowedUnits: []string{"×10⁹/L"},
	},
	{
		ID:           "NTproBNP",
		DisplayName:  "NT-proBNP",
		Description:  "N-terminal pro B-type natriuretic peptide",
		AllowedUnits: []string{"pg/mL"},
	},
	{
		ID:           "ECOG",
		DisplayName:  "ECOG",
		Description:  "Eastern Cooperative Oncology Group performance status (0–4)",
		AllowedUnits: []string{},
	},
	{
		ID:           "MMSE",
		DisplayName:  "MMSE",
		Description:  "Mini-Mental State Examination score (0–30)",
		AllowedUnits: []string{},
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
	clonedUnits := make([]string, len(dimension.AllowedUnits))
	copy(clonedUnits, dimension.AllowedUnits)
	return DimensionDefinition{
		ID:           dimension.ID,
		DisplayName:  dimension.DisplayName,
		Description:  dimension.Description,
		AllowedUnits: clonedUnits,
	}
}
