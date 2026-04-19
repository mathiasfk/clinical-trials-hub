package domain

var AllowedPhases = []string{
	"Phase 1",
	"Phase 2",
	"Phase 3",
	"Phase 4",
}

var AllowedTherapeuticAreas = []string{
	"Cardiovascular",
	"Diabetes",
	"Hematology",
	"Sickle Cell Disease",
	"Obesity",
	"Rare Diseases",
	"Oncology",
	"Neurology",
}

func IsAllowedPhase(value string) bool {
	for _, allowed := range AllowedPhases {
		if allowed == value {
			return true
		}
	}
	return false
}

func IsAllowedTherapeuticArea(value string) bool {
	for _, allowed := range AllowedTherapeuticAreas {
		if allowed == value {
			return true
		}
	}
	return false
}

type Study struct {
	ID                       string                 `json:"id"`
	Objectives               []string               `json:"objectives"`
	Endpoints                []string               `json:"endpoints"`
	InclusionCriteria        []EligibilityCriterion `json:"inclusionCriteria"`
	ExclusionCriteria        []EligibilityCriterion `json:"exclusionCriteria"`
	Participants             int                    `json:"participants"`
	StudyType                string                 `json:"studyType"`
	NumberOfArms             int                    `json:"numberOfArms"`
	Phase                    string                 `json:"phase"`
	TherapeuticArea          string                 `json:"therapeuticArea"`
	PatientPopulation        string                 `json:"patientPopulation"`
	FirstPatientFirstVisit   string                 `json:"firstPatientFirstVisit"`
	LastPatientFirstVisit    string                 `json:"lastPatientFirstVisit"`
	ProtocolApprovalDate     string                 `json:"protocolApprovalDate"`
}

type StudyCreateInput struct {
	Objectives               []string               `json:"objectives"`
	Endpoints                []string               `json:"endpoints"`
	InclusionCriteria        []EligibilityCriterion `json:"inclusionCriteria"`
	ExclusionCriteria        []EligibilityCriterion `json:"exclusionCriteria"`
	Participants             int                    `json:"participants"`
	StudyType                string                 `json:"studyType"`
	NumberOfArms             int                    `json:"numberOfArms"`
	Phase                    string                 `json:"phase"`
	TherapeuticArea          string                 `json:"therapeuticArea"`
	PatientPopulation        string                 `json:"patientPopulation"`
	FirstPatientFirstVisit   string                 `json:"firstPatientFirstVisit"`
	LastPatientFirstVisit    string                 `json:"lastPatientFirstVisit"`
	ProtocolApprovalDate     string                 `json:"protocolApprovalDate"`
}

type StudyEligibilityInput struct {
	InclusionCriteria []EligibilityCriterion `json:"inclusionCriteria"`
	ExclusionCriteria []EligibilityCriterion `json:"exclusionCriteria"`
}
