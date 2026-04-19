package domain

type Study struct {
	ID                string                 `json:"id"`
	Objectives        []string               `json:"objectives"`
	Endpoints         []string               `json:"endpoints"`
	InclusionCriteria []EligibilityCriterion `json:"inclusionCriteria"`
	ExclusionCriteria []EligibilityCriterion `json:"exclusionCriteria"`
	Participants      int                    `json:"participants"`
	StudyType         string                 `json:"studyType"`
	NumberOfArms      int                    `json:"numberOfArms"`
	Phase             string                 `json:"phase"`
	TherapeuticArea   string                 `json:"therapeuticArea"`
	PatientPopulation string                 `json:"patientPopulation"`
}

type StudyCreateInput struct {
	Objectives        []string               `json:"objectives"`
	Endpoints         []string               `json:"endpoints"`
	InclusionCriteria []EligibilityCriterion `json:"inclusionCriteria"`
	ExclusionCriteria []EligibilityCriterion `json:"exclusionCriteria"`
	Participants      int                    `json:"participants"`
	StudyType         string                 `json:"studyType"`
	NumberOfArms      int                    `json:"numberOfArms"`
	Phase             string                 `json:"phase"`
	TherapeuticArea   string                 `json:"therapeuticArea"`
	PatientPopulation string                 `json:"patientPopulation"`
}

type StudyEligibilityInput struct {
	InclusionCriteria []EligibilityCriterion `json:"inclusionCriteria"`
	ExclusionCriteria []EligibilityCriterion `json:"exclusionCriteria"`
}
