package service

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

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

type IDGenerator func(ctx context.Context) (string, error)

func NewRepositoryAwareIDGenerator(prefix string, repo repository.StudyRepository) IDGenerator {
	return func(ctx context.Context) (string, error) {
		studies, err := repo.List(ctx)
		if err != nil {
			return "", err
		}
		highest := 0
		for _, study := range studies {
			suffix, ok := parseStudyIDSuffix(prefix, study.ID)
			if !ok {
				continue
			}
			if suffix > highest {
				highest = suffix
			}
		}
		return fmt.Sprintf("%s-%04d", prefix, highest+1), nil
	}
}

func parseStudyIDSuffix(prefix, id string) (int, bool) {
	expectedPrefix := prefix + "-"
	if !strings.HasPrefix(id, expectedPrefix) {
		return 0, false
	}
	suffix := id[len(expectedPrefix):]
	if suffix == "" {
		return 0, false
	}
	value := 0
	for _, r := range suffix {
		if r < '0' || r > '9' {
			return 0, false
		}
		value = value*10 + int(r-'0')
	}
	return value, true
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

	id, err := s.idGenerator(ctx)
	if err != nil {
		return domain.Study{}, err
	}

	study := domain.Study{
		ID:                     id,
		Objectives:             normalized.Objectives,
		Endpoints:              normalized.Endpoints,
		InclusionCriteria:      normalized.InclusionCriteria,
		ExclusionCriteria:      normalized.ExclusionCriteria,
		Participants:           normalized.Participants,
		StudyType:              normalized.StudyType,
		NumberOfArms:           normalized.NumberOfArms,
		Phase:                  normalized.Phase,
		TherapeuticArea:        normalized.TherapeuticArea,
		PatientPopulation:      normalized.PatientPopulation,
		FirstPatientFirstVisit: normalized.FirstPatientFirstVisit,
		LastPatientFirstVisit:  normalized.LastPatientFirstVisit,
		ProtocolApprovalDate:   normalized.ProtocolApprovalDate,
	}

	return s.repository.Create(ctx, study)
}

func (s *StudyService) ListStudies(ctx context.Context) ([]domain.Study, error) {
	return s.repository.List(ctx)
}

func (s *StudyService) GetStudyByID(ctx context.Context, id string) (domain.Study, bool, error) {
	return s.repository.GetByID(ctx, strings.TrimSpace(id))
}

func (s *StudyService) ReplaceStudy(
	ctx context.Context,
	id string,
	input domain.StudyCreateInput,
) (domain.Study, error) {
	normalizedID := strings.TrimSpace(id)
	if normalizedID == "" {
		return domain.Study{}, &NotFoundError{Resource: "study"}
	}

	normalized, err := normalizeAndValidateCreateInput(input)
	if err != nil {
		return domain.Study{}, err
	}

	study := domain.Study{
		ID:                     normalizedID,
		Objectives:             normalized.Objectives,
		Endpoints:              normalized.Endpoints,
		InclusionCriteria:      normalized.InclusionCriteria,
		ExclusionCriteria:      normalized.ExclusionCriteria,
		Participants:           normalized.Participants,
		StudyType:              normalized.StudyType,
		NumberOfArms:           normalized.NumberOfArms,
		Phase:                  normalized.Phase,
		TherapeuticArea:        normalized.TherapeuticArea,
		PatientPopulation:      normalized.PatientPopulation,
		FirstPatientFirstVisit: normalized.FirstPatientFirstVisit,
		LastPatientFirstVisit:  normalized.LastPatientFirstVisit,
		ProtocolApprovalDate:   normalized.ProtocolApprovalDate,
	}

	updated, found, err := s.repository.Replace(ctx, study)
	if err != nil {
		return domain.Study{}, err
	}
	if !found {
		return domain.Study{}, &NotFoundError{Resource: "study"}
	}

	return updated, nil
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
		Objectives:             normalizeTextList(input.Objectives),
		Endpoints:              normalizeTextList(input.Endpoints),
		Participants:           input.Participants,
		StudyType:              strings.ToLower(strings.TrimSpace(input.StudyType)),
		NumberOfArms:           input.NumberOfArms,
		Phase:                  strings.TrimSpace(input.Phase),
		TherapeuticArea:        strings.TrimSpace(input.TherapeuticArea),
		PatientPopulation:      strings.TrimSpace(input.PatientPopulation),
		FirstPatientFirstVisit: strings.TrimSpace(input.FirstPatientFirstVisit),
		LastPatientFirstVisit:  strings.TrimSpace(input.LastPatientFirstVisit),
		ProtocolApprovalDate:   strings.TrimSpace(input.ProtocolApprovalDate),
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
	if len(normalized.InclusionCriteria)+len(normalized.ExclusionCriteria) == 0 {
		validationErrors["eligibilityCriteria"] = "at least one inclusion or exclusion criterion is required"
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
	} else if !domain.IsAllowedPhase(normalized.Phase) {
		validationErrors["phase"] = "phase must be one of Phase 1, Phase 2, Phase 3, or Phase 4"
	}
	if normalized.TherapeuticArea == "" {
		validationErrors["therapeuticArea"] = "therapeutic area is required"
	} else if !domain.IsAllowedTherapeuticArea(normalized.TherapeuticArea) {
		validationErrors["therapeuticArea"] = "therapeutic area must be one of the supported values"
	}
	if normalized.PatientPopulation == "" {
		validationErrors["patientPopulation"] = "patient population is required"
	}
	validateOptionalDate("firstPatientFirstVisit", normalized.FirstPatientFirstVisit, validationErrors)
	validateOptionalDate("lastPatientFirstVisit", normalized.LastPatientFirstVisit, validationErrors)
	validateOptionalDate("protocolApprovalDate", normalized.ProtocolApprovalDate, validationErrors)

	if len(validationErrors) > 0 {
		return domain.StudyCreateInput{}, &ValidationError{Fields: validationErrors}
	}

	return normalized, nil
}

func validateOptionalDate(field, value string, errors map[string]string) {
	if value == "" {
		return
	}
	if _, err := time.Parse("2006-01-02", value); err != nil {
		errors[field] = field + " must be an ISO-8601 calendar date (YYYY-MM-DD)"
	}
}

func normalizeAndValidateEligibilityInput(input domain.StudyEligibilityInput) (domain.StudyEligibilityInput, error) {
	validationErrors := map[string]string{}
	normalized := domain.StudyEligibilityInput{
		InclusionCriteria: normalizeEligibilityCriteria(input.InclusionCriteria, "inclusionCriteria", validationErrors),
		ExclusionCriteria: normalizeEligibilityCriteria(input.ExclusionCriteria, "exclusionCriteria", validationErrors),
	}
	if len(normalized.InclusionCriteria)+len(normalized.ExclusionCriteria) == 0 {
		validationErrors["eligibilityCriteria"] = "at least one inclusion or exclusion criterion is required"
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

