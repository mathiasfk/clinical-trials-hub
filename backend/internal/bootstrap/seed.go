package bootstrap

import "github.com/mathias/clinical-trials-hub/backend/internal/domain"

func SeedStudies() []domain.Study {
	return []domain.Study{
		{
			ID:                "study-0001",
			Objectives:        []string{"Assess efficacy of treatment X in moderate rheumatoid arthritis"},
			Endpoints:         []string{"ACR20 response at Week 12", "Safety profile through Week 24"},
			InclusionCriteria: []string{"Age between 18 and 70", "Diagnosed rheumatoid arthritis for at least 6 months"},
			ExclusionCriteria: []string{"Previous biologic treatment in the last 3 months", "Active severe infection"},
			Participants:      120,
			StudyType:         "parallel",
			NumberOfArms:      2,
			Phase:             "Phase II",
			TherapeuticArea:   "Rheumatology",
			PatientPopulation: "Adults with moderate rheumatoid arthritis",
		},
		{
			ID:                "study-0002",
			Objectives:        []string{"Evaluate dose-ranging effect of treatment Y in type 2 diabetes"},
			Endpoints:         []string{"HbA1c reduction at Week 16"},
			InclusionCriteria: []string{"Age between 30 and 75", "HbA1c between 7.5% and 10.5%"},
			ExclusionCriteria: []string{"Current insulin therapy", "Recent cardiovascular event"},
			Participants:      180,
			StudyType:         "parallel",
			NumberOfArms:      3,
			Phase:             "Phase IIb",
			TherapeuticArea:   "Endocrinology",
			PatientPopulation: "Adults with type 2 diabetes uncontrolled on oral therapy",
		},
	}
}
