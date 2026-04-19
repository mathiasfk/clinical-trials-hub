package repository_test

import (
	"context"
	"testing"

	"github.com/mathias/clinical-trials-hub/backend/internal/domain"
	"github.com/mathias/clinical-trials-hub/backend/internal/repository"
	"github.com/mathias/clinical-trials-hub/backend/internal/repository/memory"
)

func TestStudyRepositoryContract(t *testing.T) {
	t.Parallel()

	contract := func(t *testing.T, createRepository func() repository.StudyRepository) {
		t.Helper()

		repo := createRepository()
		ctx := context.Background()

		first := domain.Study{
			ID:         "study-1000",
			Objectives: []string{"Primary objective"},
			Endpoints:  []string{"Endpoint A"},
			InclusionCriteria: []domain.EligibilityCriterion{
				testCriterion("Eligible adults must be older than 18.", "age", ">", 18, ""),
			},
			ExclusionCriteria: []domain.EligibilityCriterion{
				testCriterion("Exclude participants with SBP below 95 mmHg.", "SBP", "<", 95, "mmHg"),
			},
			Participants:      50,
			StudyType:         "parallel",
			NumberOfArms:      2,
			Phase:             "Phase I",
			TherapeuticArea:   "Oncology",
			PatientPopulation: "Adults",
		}

		_, err := repo.Create(ctx, first)
		if err != nil {
			t.Fatalf("create should succeed: %v", err)
		}

		list, err := repo.List(ctx)
		if err != nil {
			t.Fatalf("list should succeed: %v", err)
		}
		if len(list) != 1 {
			t.Fatalf("expected one study in list, got %d", len(list))
		}
		if list[0].ID != first.ID {
			t.Fatalf("expected study id %s, got %s", first.ID, list[0].ID)
		}

		read, found, err := repo.GetByID(ctx, first.ID)
		if err != nil {
			t.Fatalf("get by id should succeed: %v", err)
		}
		if !found {
			t.Fatal("expected study to be found")
		}
		if read.Objectives[0] != first.Objectives[0] {
			t.Fatalf("expected objectives to match, got %#v", read.Objectives)
		}
		if read.InclusionCriteria[0].DeterministicRule.DimensionID != "age" {
			t.Fatalf("expected inclusion criteria to be cloned, got %#v", read.InclusionCriteria)
		}

		updated, found, err := repo.UpdateEligibility(ctx, first.ID, []domain.EligibilityCriterion{
			testCriterion("Require hsCRP above 2 mg/L.", "hsCRP", ">", 2, "mg/L"),
		}, []domain.EligibilityCriterion{
			testCriterion("Exclude LVEF below 40%.", "LVEF", "<", 40, "%"),
		})
		if err != nil {
			t.Fatalf("update eligibility should succeed: %v", err)
		}
		if !found {
			t.Fatal("expected update eligibility to find study")
		}
		if updated.InclusionCriteria[0].DeterministicRule.DimensionID != "hsCRP" {
			t.Fatalf("expected updated inclusion criteria, got %#v", updated.InclusionCriteria)
		}
	}

	t.Run("in-memory", func(t *testing.T) {
		contract(t, func() repository.StudyRepository {
			return memory.NewStudyRepository(nil)
		})
	})
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
