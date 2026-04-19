package bootstrap

import (
	"regexp"
	"sort"
	"strconv"
	"strings"
	"testing"

	"github.com/mathias/clinical-trials-hub/backend/internal/domain"
)

var allowedStudyTypes = map[string]struct{}{
	"parallel":   {},
	"crossover":  {},
	"single-arm": {},
}

func TestSeedStudiesIntegrity(t *testing.T) {
	t.Parallel()

	studies := SeedStudies()
	if len(studies) == 0 {
		t.Fatal("expected seeded studies")
	}

	areaSeen := map[string]struct{}{}
	idPattern := regexp.MustCompile(`^study-[0-9]{4}$`)

	var suffixes []int
	seenIDs := map[string]int{}

	for _, study := range studies {
		if !idPattern.MatchString(study.ID) {
			t.Fatalf("study id %q must match %s", study.ID, idPattern.String())
		}
		seenIDs[study.ID]++
		if seenIDs[study.ID] > 1 {
			t.Fatalf("duplicate study id %s", study.ID)
		}
		suffix, err := strconv.Atoi(strings.TrimPrefix(study.ID, "study-"))
		if err != nil {
			t.Fatalf("parse suffix: %v", err)
		}
		suffixes = append(suffixes, suffix)

		if !domain.IsAllowedPhase(study.Phase) {
			t.Fatalf("study %s: invalid phase %q", study.ID, study.Phase)
		}
		if _, ok := allowedStudyTypes[study.StudyType]; !ok {
			t.Fatalf("study %s: invalid studyType %q", study.ID, study.StudyType)
		}
		if study.Participants < 1 {
			t.Fatalf("study %s: participants must be >= 1", study.ID)
		}
		if study.NumberOfArms < 1 {
			t.Fatalf("study %s: numberOfArms must be >= 1", study.ID)
		}
		if !domain.IsAllowedTherapeuticArea(study.TherapeuticArea) {
			t.Fatalf("study %s: invalid therapeutic area %q", study.ID, study.TherapeuticArea)
		}
		areaSeen[study.TherapeuticArea] = struct{}{}

		for _, criterion := range study.InclusionCriteria {
			assertCriterionValid(t, study.ID, criterion)
		}
		for _, criterion := range study.ExclusionCriteria {
			assertCriterionValid(t, study.ID, criterion)
		}
	}

	for _, area := range domain.AllowedTherapeuticAreas {
		if _, ok := areaSeen[area]; !ok {
			t.Fatalf("no seeded study for therapeutic area %q", area)
		}
	}

	sort.Ints(suffixes)
	if suffixes[0] != 1 {
		t.Fatalf("expected seed sequence to start at study-0001, got suffix %d", suffixes[0])
	}
	for i := 1; i < len(suffixes); i++ {
		if suffixes[i] != suffixes[i-1]+1 {
			t.Fatalf("gap in study id suffixes: %v", suffixes)
		}
	}
}

func assertCriterionValid(t *testing.T, studyID string, criterion domain.EligibilityCriterion) {
	t.Helper()

	rule := criterion.DeterministicRule
	dim, ok := domain.LookupEligibilityDimension(rule.DimensionID)
	if !ok {
		t.Fatalf("study %s: dimension %q not found", studyID, rule.DimensionID)
	}
	if len(dim.AllowedUnits) == 0 {
		if rule.Unit != "" {
			t.Fatalf("study %s: unit must be empty for unitless dimension %s", studyID, dim.ID)
		}
		return
	}
	if rule.Unit == "" {
		t.Fatalf("study %s: unit required for dimension %s", studyID, dim.ID)
	}
	for _, allowed := range dim.AllowedUnits {
		if strings.EqualFold(rule.Unit, allowed) {
			return
		}
	}
	t.Fatalf("study %s: unit %q not allowed for dimension %s (allowed: %v)", studyID, rule.Unit, dim.ID, dim.AllowedUnits)
}
