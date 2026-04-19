package bootstrap

import "github.com/mathias/clinical-trials-hub/backend/internal/domain"

func SeedStudies() []domain.Study {
	return []domain.Study{
		{
			ID:         "study-0001",
			Objectives: []string{"Assess efficacy of treatment X in moderate rheumatoid arthritis"},
			Endpoints:  []string{"ACR20 response at Week 12", "Safety profile through Week 24"},
			InclusionCriteria: []domain.EligibilityCriterion{
				{
					Description: "Participants must be at least 18 years old.",
					DeterministicRule: domain.DeterministicRule{
						DimensionID: "age",
						Operator:    ">=",
						Value:       18,
						Unit:        "years old",
					},
				},
				{
					Description: "Participants must have hsCRP above 2 mg/L.",
					DeterministicRule: domain.DeterministicRule{
						DimensionID: "hsCRP",
						Operator:    ">",
						Value:       2,
						Unit:        "mg/L",
					},
				},
			},
			ExclusionCriteria: []domain.EligibilityCriterion{
				{
					Description: "Participants with systolic blood pressure below 95 mmHg are excluded.",
					DeterministicRule: domain.DeterministicRule{
						DimensionID: "SBP",
						Operator:    "<",
						Value:       95,
						Unit:        "mmHg",
					},
				},
			},
			Participants:           120,
			StudyType:              "parallel",
			NumberOfArms:           2,
			Phase:                  "Phase 2",
			TherapeuticArea:        "Cardiovascular",
			PatientPopulation:      "Adults with moderate rheumatoid arthritis",
			FirstPatientFirstVisit: "2025-03-15",
			LastPatientFirstVisit:  "2025-09-30",
			ProtocolApprovalDate:   "2025-01-10",
		},
		{
			ID:         "study-0002",
			Objectives: []string{"Evaluate dose-ranging effect of treatment Y in type 2 diabetes"},
			Endpoints:  []string{"HbA1c reduction at Week 16"},
			InclusionCriteria: []domain.EligibilityCriterion{
				{
					Description: "Participants must be older than 50 years.",
					DeterministicRule: domain.DeterministicRule{
						DimensionID: "age",
						Operator:    ">",
						Value:       50,
						Unit:        "years old",
					},
				},
				{
					Description: "Participants must have LVEF below 40%.",
					DeterministicRule: domain.DeterministicRule{
						DimensionID: "LVEF",
						Operator:    "<",
						Value:       40,
						Unit:        "%",
					},
				},
			},
			ExclusionCriteria: []domain.EligibilityCriterion{
				{
					Description: "Participants with systolic blood pressure below 95 mmHg are excluded.",
					DeterministicRule: domain.DeterministicRule{
						DimensionID: "SBP",
						Operator:    "<",
						Value:       95,
						Unit:        "mmHg",
					},
				},
			},
			Participants:           180,
			StudyType:              "parallel",
			NumberOfArms:           3,
			Phase:                  "Phase 2",
			TherapeuticArea:        "Diabetes",
			PatientPopulation:      "Adults with type 2 diabetes uncontrolled on oral therapy",
			FirstPatientFirstVisit: "",
			LastPatientFirstVisit:  "",
			ProtocolApprovalDate:   "",
		},
	}
}
