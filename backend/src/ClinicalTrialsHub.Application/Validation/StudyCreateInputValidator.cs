using System.Globalization;
using ClinicalTrialsHub.Application.Dtos;
using ClinicalTrialsHub.Domain;
using FluentValidation;

namespace ClinicalTrialsHub.Application.Validation;

public sealed class StudyCreateInputValidator : AbstractValidator<StudyCreateInputDto>
{
    public StudyCreateInputValidator()
    {
        RuleFor(x => x).Custom(ValidateCreate);
    }

    private static void ValidateCreate(StudyCreateInputDto input, ValidationContext<StudyCreateInputDto> context)
    {
        if (input.Objectives.Count == 0)
        {
            context.AddFailure("objectives", "at least one objective is required");
        }

        if (input.Endpoints.Count == 0)
        {
            context.AddFailure("endpoints", "at least one endpoint is required");
        }

        if (input.InclusionCriteria.Count + input.ExclusionCriteria.Count == 0)
        {
            context.AddFailure("eligibilityCriteria", "at least one inclusion or exclusion criterion is required");
        }

        if (input.Participants <= 0)
        {
            context.AddFailure("participants", "participants must be greater than zero");
        }

        if (input.NumberOfArms <= 0)
        {
            context.AddFailure("numberOfArms", "number of arms must be greater than zero");
        }

        if (string.IsNullOrEmpty(input.StudyType))
        {
            context.AddFailure("studyType", "study type is required");
        }
        else if (!Vocabularies.IsAllowedStudyType(input.StudyType))
        {
            context.AddFailure("studyType", "study type must be one of parallel, crossover, or single-arm");
        }

        if (string.IsNullOrEmpty(input.Phase))
        {
            context.AddFailure("phase", "phase is required");
        }
        else if (!Vocabularies.IsAllowedPhase(input.Phase))
        {
            context.AddFailure("phase", "phase must be one of Phase 1, Phase 2, Phase 3, or Phase 4");
        }

        if (string.IsNullOrEmpty(input.TherapeuticArea))
        {
            context.AddFailure("therapeuticArea", "therapeutic area is required");
        }
        else if (!Vocabularies.IsAllowedTherapeuticArea(input.TherapeuticArea))
        {
            context.AddFailure("therapeuticArea", "therapeutic area must be one of the supported values");
        }

        if (string.IsNullOrEmpty(input.PatientPopulation))
        {
            context.AddFailure("patientPopulation", "patient population is required");
        }

        ValidateOptionalIsoDate(input.FirstPatientFirstVisit, "firstPatientFirstVisit", context);
        ValidateOptionalIsoDate(input.LastPatientFirstVisit, "lastPatientFirstVisit", context);
        ValidateOptionalIsoDate(input.ProtocolApprovalDate, "protocolApprovalDate", context);

        EligibilityCriterionValidationRules.ValidateCollection(input.InclusionCriteria, "inclusionCriteria", context);
        EligibilityCriterionValidationRules.ValidateCollection(input.ExclusionCriteria, "exclusionCriteria", context);
    }

    private static void ValidateOptionalIsoDate<T>(
        string value,
        string fieldName,
        ValidationContext<T> context)
    {
        if (string.IsNullOrEmpty(value))
        {
            return;
        }

        if (!DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
        {
            context.AddFailure(fieldName, $"{fieldName} must be an ISO-8601 calendar date (YYYY-MM-DD)");
        }
    }
}
