package service

import (
	"context"
	"testing"

	"github.com/mathias/clinical-trials-hub/backend/internal/domain"
	"github.com/mathias/clinical-trials-hub/backend/internal/repository/memory"
)

func TestCreateStudyValidation(t *testing.T) {
	t.Parallel()

	service := NewStudyService(memory.NewStudyRepository(nil), staticIDGenerator("study-9999"))

	_, err := service.CreateStudy(context.Background(), domain.StudyCreateInput{})
	if err == nil {
		t.Fatal("expected validation error")
	}

	validationErr, ok := err.(*ValidationError)
	if !ok {
		t.Fatalf("expected ValidationError, got %T", err)
	}

	if validationErr.Fields["objectives"] == "" {
		t.Fatal("expected validation error for objectives")
	}
	if validationErr.Fields["participants"] == "" {
		t.Fatal("expected validation error for participants")
	}
	if validationErr.Fields["inclusionCriteria"] == "" {
		t.Fatal("expected validation error for inclusion criteria")
	}
}

func TestCreateStudySuccess(t *testing.T) {
	t.Parallel()

	service := NewStudyService(memory.NewStudyRepository(nil), staticIDGenerator("study-9999"))
	input := domain.StudyCreateInput{
		Objectives: []string{"Primary objective"},
		Endpoints:  []string{"Endpoint A"},
		InclusionCriteria: []domain.EligibilityCriterion{
			testCriterion("Require hsCRP above 2 mg/L.", "hsCRP", ">", 2, "mg/L"),
		},
		ExclusionCriteria: []domain.EligibilityCriterion{
			testCriterion("Exclude participants with SBP below 95 mmHg.", "SBP", "<", 95, "mmHg"),
		},
		Participants:      100,
		StudyType:         "parallel",
		NumberOfArms:      2,
		Phase:             "Phase II",
		TherapeuticArea:   "Oncology",
		PatientPopulation: "Adults with recurrent disease",
	}

	study, err := service.CreateStudy(context.Background(), input)
	if err != nil {
		t.Fatalf("expected create study to succeed, got %v", err)
	}
	if study.ID != "study-9999" {
		t.Fatalf("expected generated id study-9999, got %s", study.ID)
	}
	if study.InclusionCriteria[0].DeterministicRule.DimensionID != "hsCRP" {
		t.Fatalf("expected normalized inclusion criteria, got %#v", study.InclusionCriteria)
	}
}

func TestUpdateStudyEligibilityValidation(t *testing.T) {
	t.Parallel()

	service := NewStudyService(memory.NewStudyRepository(nil), staticIDGenerator("study-9999"))
	_, err := service.UpdateStudyEligibility(context.Background(), "study-9999", domain.StudyEligibilityInput{
		InclusionCriteria: []domain.EligibilityCriterion{
			testCriterion("", "hsCRP", ">", 2, ""),
		},
	})
	if err == nil {
		t.Fatal("expected validation error")
	}

	validationErr, ok := err.(*ValidationError)
	if !ok {
		t.Fatalf("expected ValidationError, got %T", err)
	}
	if validationErr.Fields["inclusionCriteria[0].description"] == "" {
		t.Fatal("expected description validation error")
	}
	if validationErr.Fields["inclusionCriteria[0].deterministicRule.unit"] == "" {
		t.Fatal("expected unit validation error")
	}
}

func TestUpdateStudyEligibilitySuccess(t *testing.T) {
	t.Parallel()

	repo := memory.NewStudyRepository([]domain.Study{
		{
			ID:         "study-9999",
			Objectives: []string{"Primary objective"},
			Endpoints:  []string{"Endpoint A"},
			InclusionCriteria: []domain.EligibilityCriterion{
				testCriterion("Require age above 18.", "age", ">", 18, ""),
			},
			ExclusionCriteria: []domain.EligibilityCriterion{
				testCriterion("Exclude SBP below 95 mmHg.", "SBP", "<", 95, "mmHg"),
			},
			Participants:      100,
			StudyType:         "parallel",
			NumberOfArms:      2,
			Phase:             "Phase II",
			TherapeuticArea:   "Oncology",
			PatientPopulation: "Adults with recurrent disease",
		},
	})
	service := NewStudyService(repo, staticIDGenerator("study-0001"))

	study, err := service.UpdateStudyEligibility(context.Background(), "study-9999", domain.StudyEligibilityInput{
		InclusionCriteria: []domain.EligibilityCriterion{
			testCriterion("Require hsCRP above 2 mg/L.", "hscrp", ">", 2, "mg/l"),
		},
		ExclusionCriteria: []domain.EligibilityCriterion{
			testCriterion("Exclude LVEF below 40%.", "LVEF", "<", 40, "%"),
		},
	})
	if err != nil {
		t.Fatalf("expected update study eligibility to succeed, got %v", err)
	}
	if study.InclusionCriteria[0].DeterministicRule.DimensionID != "hsCRP" {
		t.Fatalf("expected canonical dimension id, got %#v", study.InclusionCriteria)
	}
	if study.InclusionCriteria[0].DeterministicRule.Unit != "mg/L" {
		t.Fatalf("expected canonical unit, got %#v", study.InclusionCriteria)
	}
}

func staticIDGenerator(id string) IDGenerator {
	return func() string {
		return id
	}
}

func testCriterion(description, dimensionID, operator string, value float64, unit string) domain.EligibilityCriterion {
	return domain.EligibilityCriterion{
		Description: description,
		DeterministicRule: domain.DeterministicRule{
			DimensionID: dimensionID,
			Operator:    operator,
			Value:       value,
			Unit:        unit,
		},
	}
}
