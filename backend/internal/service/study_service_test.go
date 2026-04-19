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
}

func TestCreateStudySuccess(t *testing.T) {
	t.Parallel()

	service := NewStudyService(memory.NewStudyRepository(nil), staticIDGenerator("study-9999"))
	input := domain.StudyCreateInput{
		Objectives:        []string{"Primary objective"},
		Endpoints:         []string{"Endpoint A"},
		InclusionCriteria: []string{"Inclusion A"},
		ExclusionCriteria: []string{"Exclusion A"},
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
}

func staticIDGenerator(id string) IDGenerator {
	return func() string {
		return id
	}
}
