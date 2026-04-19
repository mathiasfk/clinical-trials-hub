package service

import (
	"context"
	"testing"

	bootstrap "github.com/mathias/clinical-trials-hub/backend/internal/bootstrap"
	"github.com/mathias/clinical-trials-hub/backend/internal/domain"
	"github.com/mathias/clinical-trials-hub/backend/internal/repository/memory"
)

func TestRepositoryAwareIDGeneratorSkipsSeededSuffixes(t *testing.T) {
	t.Parallel()

	repo := memory.NewStudyRepository(bootstrap.SeedStudies())
	generator := NewRepositoryAwareIDGenerator("study", repo)

	id, err := generator(context.Background())
	if err != nil {
		t.Fatalf("generator should succeed: %v", err)
	}
	if id != "study-0003" {
		t.Fatalf("expected study-0003, got %s", id)
	}
}

func TestRepositoryAwareIDGeneratorContinuesPastHighestSuffix(t *testing.T) {
	t.Parallel()

	repo := memory.NewStudyRepository([]domain.Study{
		{ID: "study-0001"},
		{ID: "study-0005"},
		{ID: "study-0003"},
	})
	generator := NewRepositoryAwareIDGenerator("study", repo)

	id, err := generator(context.Background())
	if err != nil {
		t.Fatalf("generator should succeed: %v", err)
	}
	if id != "study-0006" {
		t.Fatalf("expected study-0006, got %s", id)
	}
}

func TestCreateStudyConsecutivelyIncrementsIDs(t *testing.T) {
	t.Parallel()

	repo := memory.NewStudyRepository(bootstrap.SeedStudies())
	svc := NewStudyService(repo, NewRepositoryAwareIDGenerator("study", repo))

	input := validCreateInput()

	first, err := svc.CreateStudy(context.Background(), input)
	if err != nil {
		t.Fatalf("first create should succeed: %v", err)
	}
	if first.ID != "study-0003" {
		t.Fatalf("expected study-0003, got %s", first.ID)
	}

	second, err := svc.CreateStudy(context.Background(), input)
	if err != nil {
		t.Fatalf("second create should succeed: %v", err)
	}
	if second.ID != "study-0004" {
		t.Fatalf("expected study-0004, got %s", second.ID)
	}

	third, err := svc.CreateStudy(context.Background(), input)
	if err != nil {
		t.Fatalf("third create should succeed: %v", err)
	}
	if third.ID != "study-0005" {
		t.Fatalf("expected study-0005, got %s", third.ID)
	}
}

func TestCreateStudyDoesNotCollideWithExistingSeededIDs(t *testing.T) {
	t.Parallel()

	repo := memory.NewStudyRepository(bootstrap.SeedStudies())
	svc := NewStudyService(repo, NewRepositoryAwareIDGenerator("study", repo))

	created, err := svc.CreateStudy(context.Background(), validCreateInput())
	if err != nil {
		t.Fatalf("create should succeed: %v", err)
	}
	if created.ID == "study-0001" || created.ID == "study-0002" {
		t.Fatalf("generated id must not collide with seeded ids, got %s", created.ID)
	}

	listed, err := repo.List(context.Background())
	if err != nil {
		t.Fatalf("list should succeed: %v", err)
	}
	seen := map[string]int{}
	for _, study := range listed {
		seen[study.ID]++
	}
	for id, count := range seen {
		if count > 1 {
			t.Fatalf("id %s appears %d times (collision)", id, count)
		}
	}
}

func validCreateInput() domain.StudyCreateInput {
	return domain.StudyCreateInput{
		Objectives: []string{"Primary objective"},
		Endpoints:  []string{"Endpoint A"},
		InclusionCriteria: []domain.EligibilityCriterion{
			testCriterion("Require hsCRP above 2 mg/L.", "hsCRP", ">", 2, "mg/L"),
		},
		ExclusionCriteria: []domain.EligibilityCriterion{
			testCriterion("Exclude SBP below 95 mmHg.", "SBP", "<", 95, "mmHg"),
		},
		Participants:      100,
		StudyType:         "parallel",
		NumberOfArms:      2,
		Phase:             "Phase 2",
		TherapeuticArea:   "Cardiovascular",
		PatientPopulation: "Adults",
	}
}
