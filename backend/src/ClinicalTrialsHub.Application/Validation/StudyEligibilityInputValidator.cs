using ClinicalTrialsHub.Application.Dtos;
using FluentValidation;

namespace ClinicalTrialsHub.Application.Validation;

public sealed class StudyEligibilityInputValidator : AbstractValidator<StudyEligibilityInputDto>
{
    public StudyEligibilityInputValidator()
    {
        RuleFor(x => x).Custom(ValidateEligibility);
    }

    private static void ValidateEligibility(StudyEligibilityInputDto input, ValidationContext<StudyEligibilityInputDto> context)
    {
        if (input.InclusionCriteria.Count + input.ExclusionCriteria.Count == 0)
        {
            context.AddFailure("eligibilityCriteria", "at least one inclusion or exclusion criterion is required");
        }

        EligibilityCriterionValidationRules.ValidateCollection(input.InclusionCriteria, "inclusionCriteria", context);
        EligibilityCriterionValidationRules.ValidateCollection(input.ExclusionCriteria, "exclusionCriteria", context);
    }
}
