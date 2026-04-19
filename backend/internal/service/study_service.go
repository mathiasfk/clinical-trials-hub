package service

import (
	"context"
	"fmt"
	"strings"
	"sync/atomic"

	"github.com/mathias/clinical-trials-hub/backend/internal/domain"
	"github.com/mathias/clinical-trials-hub/backend/internal/repository"
)

var allowedStudyTypes = map[string]struct{}{
	"parallel":   {},
	"crossover":  {},
	"single-arm": {},
}

type ValidationError struct {
	Fields map[string]string `json:"fields"`
}

func (e *ValidationError) Error() string {
	return "invalid study registration payload"
}

type IDGenerator func() string

func NewSequentialIDGenerator(prefix string) IDGenerator {
	var counter uint64

	return func() string {
		next := atomic.AddUint64(&counter, 1)
		return fmt.Sprintf("%s-%04d", prefix, next)
	}
}

type StudyService struct {
	repository  repository.StudyRepository
	idGenerator IDGenerator
}

func NewStudyService(repo repository.StudyRepository, idGenerator IDGenerator) *StudyService {
	return &StudyService{
		repository:  repo,
		idGenerator: idGenerator,
	}
}

func (s *StudyService) CreateStudy(ctx context.Context, input domain.StudyCreateInput) (domain.Study, error) {
	normalized, err := normalizeAndValidate(input)
	if err != nil {
		return domain.Study{}, err
	}

	study := domain.Study{
		ID:                s.idGenerator(),
		Objectives:        normalized.Objectives,
		Endpoints:         normalized.Endpoints,
		InclusionCriteria: normalized.InclusionCriteria,
		ExclusionCriteria: normalized.ExclusionCriteria,
		Participants:      normalized.Participants,
		StudyType:         normalized.StudyType,
		NumberOfArms:      normalized.NumberOfArms,
		Phase:             normalized.Phase,
		TherapeuticArea:   normalized.TherapeuticArea,
		PatientPopulation: normalized.PatientPopulation,
	}

	return s.repository.Create(ctx, study)
}

func (s *StudyService) ListStudies(ctx context.Context) ([]domain.Study, error) {
	return s.repository.List(ctx)
}

func (s *StudyService) GetStudyByID(ctx context.Context, id string) (domain.Study, bool, error) {
	return s.repository.GetByID(ctx, strings.TrimSpace(id))
}

func normalizeAndValidate(input domain.StudyCreateInput) (domain.StudyCreateInput, error) {
	normalized := domain.StudyCreateInput{
		Objectives:        normalizeTextList(input.Objectives),
		Endpoints:         normalizeTextList(input.Endpoints),
		InclusionCriteria: normalizeTextList(input.InclusionCriteria),
		ExclusionCriteria: normalizeTextList(input.ExclusionCriteria),
		Participants:      input.Participants,
		StudyType:         strings.ToLower(strings.TrimSpace(input.StudyType)),
		NumberOfArms:      input.NumberOfArms,
		Phase:             strings.TrimSpace(input.Phase),
		TherapeuticArea:   strings.TrimSpace(input.TherapeuticArea),
		PatientPopulation: strings.TrimSpace(input.PatientPopulation),
	}

	validationErrors := map[string]string{}
	if len(normalized.Objectives) == 0 {
		validationErrors["objectives"] = "at least one objective is required"
	}
	if len(normalized.Endpoints) == 0 {
		validationErrors["endpoints"] = "at least one endpoint is required"
	}
	if len(normalized.InclusionCriteria) == 0 {
		validationErrors["inclusionCriteria"] = "at least one inclusion criterion is required"
	}
	if len(normalized.ExclusionCriteria) == 0 {
		validationErrors["exclusionCriteria"] = "at least one exclusion criterion is required"
	}
	if normalized.Participants <= 0 {
		validationErrors["participants"] = "participants must be greater than zero"
	}
	if normalized.NumberOfArms <= 0 {
		validationErrors["numberOfArms"] = "number of arms must be greater than zero"
	}
	if normalized.StudyType == "" {
		validationErrors["studyType"] = "study type is required"
	} else if _, ok := allowedStudyTypes[normalized.StudyType]; !ok {
		validationErrors["studyType"] = "study type must be one of parallel, crossover, or single-arm"
	}
	if normalized.Phase == "" {
		validationErrors["phase"] = "phase is required"
	}
	if normalized.TherapeuticArea == "" {
		validationErrors["therapeuticArea"] = "therapeutic area is required"
	}
	if normalized.PatientPopulation == "" {
		validationErrors["patientPopulation"] = "patient population is required"
	}

	if len(validationErrors) > 0 {
		return domain.StudyCreateInput{}, &ValidationError{Fields: validationErrors}
	}

	return normalized, nil
}

func normalizeTextList(list []string) []string {
	normalized := make([]string, 0, len(list))
	for _, item := range list {
		trimmed := strings.TrimSpace(item)
		if trimmed == "" {
			continue
		}

		normalized = append(normalized, trimmed)
	}

	return normalized
}
