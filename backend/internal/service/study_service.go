package service

import (
	"context"
	"fmt"
	"math"
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

var allowedEligibilityOperators = map[string]struct{}{
	">":  {},
	">=": {},
	"<":  {},
	"<=": {},
	"=":  {},
	"!=": {},
}

type ValidationError struct {
	Fields map[string]string `json:"fields"`
}

func (e *ValidationError) Error() string {
	return "invalid study registration payload"
}

type NotFoundError struct {
	Resource string
}

func (e *NotFoundError) Error() string {
	return fmt.Sprintf("%s not found", e.Resource)
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
	normalized, err := normalizeAndValidateCreateInput(input)
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

func (s *StudyService) UpdateStudyEligibility(
	ctx context.Context,
	id string,
	input domain.StudyEligibilityInput,
) (domain.Study, error) {
	normalizedID := strings.TrimSpace(id)
	normalizedInput, err := normalizeAndValidateEligibilityInput(input)
	if err != nil {
		return domain.Study{}, err
	}

	updatedStudy, found, err := s.repository.UpdateEligibility(
		ctx,
		normalizedID,
		normalizedInput.InclusionCriteria,
		normalizedInput.ExclusionCriteria,
	)
	if err != nil {
		return domain.Study{}, err
	}
	if !found {
		return domain.Study{}, &NotFoundError{Resource: "study"}
	}

	return updatedStudy, nil
}

func (s *StudyService) GetEligibilityDimensions() []domain.DimensionDefinition {
	return domain.EligibilityDimensions()
}

func normalizeAndValidateCreateInput(input domain.StudyCreateInput) (domain.StudyCreateInput, error) {
	normalized := domain.StudyCreateInput{
		Objectives:        normalizeTextList(input.Objectives),
		Endpoints:         normalizeTextList(input.Endpoints),
		Participants:      input.Participants,
		StudyType:         strings.ToLower(strings.TrimSpace(input.StudyType)),
		NumberOfArms:      input.NumberOfArms,
		Phase:             strings.TrimSpace(input.Phase),
		TherapeuticArea:   strings.TrimSpace(input.TherapeuticArea),
		PatientPopulation: strings.TrimSpace(input.PatientPopulation),
	}

	validationErrors := map[string]string{}
	normalized.InclusionCriteria = normalizeEligibilityCriteria(input.InclusionCriteria, "inclusionCriteria", validationErrors)
	normalized.ExclusionCriteria = normalizeEligibilityCriteria(input.ExclusionCriteria, "exclusionCriteria", validationErrors)
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

func normalizeAndValidateEligibilityInput(input domain.StudyEligibilityInput) (domain.StudyEligibilityInput, error) {
	validationErrors := map[string]string{}
	normalized := domain.StudyEligibilityInput{
		InclusionCriteria: normalizeEligibilityCriteria(input.InclusionCriteria, "inclusionCriteria", validationErrors),
		ExclusionCriteria: normalizeEligibilityCriteria(input.ExclusionCriteria, "exclusionCriteria", validationErrors),
	}

	if len(validationErrors) > 0 {
		return domain.StudyEligibilityInput{}, &ValidationError{Fields: validationErrors}
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

func normalizeEligibilityCriteria(
	list []domain.EligibilityCriterion,
	field string,
	validationErrors map[string]string,
) []domain.EligibilityCriterion {
	normalized := make([]domain.EligibilityCriterion, 0, len(list))

	for index, criterion := range list {
		description := strings.TrimSpace(criterion.Description)
		rule := domain.DeterministicRule{
			DimensionID: strings.TrimSpace(criterion.DeterministicRule.DimensionID),
			Operator:    strings.TrimSpace(criterion.DeterministicRule.Operator),
			Value:       criterion.DeterministicRule.Value,
			Unit:        strings.TrimSpace(criterion.DeterministicRule.Unit),
		}

		fieldPrefix := fmt.Sprintf("%s[%d]", field, index)
		if description == "" {
			validationErrors[fieldPrefix+".description"] = "description is required"
		}
		if rule.Operator == "" {
			validationErrors[fieldPrefix+".deterministicRule.operator"] = "operator is required"
		} else if _, ok := allowedEligibilityOperators[rule.Operator]; !ok {
			validationErrors[fieldPrefix+".deterministicRule.operator"] = "operator must be one of >, >=, <, <=, =, !="
		}
		if math.IsNaN(rule.Value) || math.IsInf(rule.Value, 0) {
			validationErrors[fieldPrefix+".deterministicRule.value"] = "value must be a finite number"
		}

		dimension, found := domain.LookupEligibilityDimension(rule.DimensionID)
		if !found {
			validationErrors[fieldPrefix+".deterministicRule.dimensionId"] = "dimensionId must reference a supported dimension"
		} else {
			rule.DimensionID = dimension.ID
			if len(dimension.AllowedUnits) == 0 {
				if rule.Unit != "" {
					validationErrors[fieldPrefix+".deterministicRule.unit"] = "unit is not supported for this dimension"
				}
			} else if rule.Unit == "" {
				validationErrors[fieldPrefix+".deterministicRule.unit"] = "unit is required for this dimension"
			} else {
				matchedUnit, ok := normalizeUnit(rule.Unit, dimension.AllowedUnits)
				if !ok {
					validationErrors[fieldPrefix+".deterministicRule.unit"] = "unit must match one of the supported units for this dimension"
				} else {
					rule.Unit = matchedUnit
				}
			}
		}

		normalized = append(normalized, domain.EligibilityCriterion{
			Description:       description,
			DeterministicRule: rule,
		})
	}

	if len(normalized) == 0 {
		validationErrors[field] = fmt.Sprintf("at least one %s is required", humanizeCriterionField(field))
	}

	return normalized
}

func normalizeUnit(unit string, allowedUnits []string) (string, bool) {
	for _, allowedUnit := range allowedUnits {
		if strings.EqualFold(unit, allowedUnit) {
			return allowedUnit, true
		}
	}

	return "", false
}

func humanizeCriterionField(field string) string {
	switch field {
	case "inclusionCriteria":
		return "inclusion criterion"
	case "exclusionCriteria":
		return "exclusion criterion"
	default:
		return field
	}
}
