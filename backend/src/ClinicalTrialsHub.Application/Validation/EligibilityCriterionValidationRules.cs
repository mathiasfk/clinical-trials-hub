using ClinicalTrialsHub.Application.Dtos;
using ClinicalTrialsHub.Domain;
using FluentValidation;

namespace ClinicalTrialsHub.Application.Validation;

public static class EligibilityCriterionValidationRules
{
    private static readonly HashSet<string> AllowedOperators =
    [
        ">", ">=", "<", "<=", "=", "!=",
    ];

    /// <summary>
    /// Validates every criterion in a collection and records failures using FluentValidation paths.
    /// </summary>
    public static void ValidateCollection<T>(
        IReadOnlyList<EligibilityCriterionDto> criteria,
        string collectionFieldName,
        ValidationContext<T> context)
    {
        for (var i = 0; i < criteria.Count; i++)
        {
            ValidateSingle(criteria[i], $"{collectionFieldName}[{i}]", context);
        }
    }

    private static void ValidateSingle<T>(
        EligibilityCriterionDto criterion,
        string prefix,
        ValidationContext<T> context)
    {
        var rule = criterion.DeterministicRule;
        if (string.IsNullOrEmpty(criterion.Description))
        {
            context.AddFailure($"{prefix}.description", "description is required");
        }

        if (string.IsNullOrEmpty(rule.Operator))
        {
            context.AddFailure($"{prefix}.deterministicRule.operator", "operator is required");
        }
        else if (!AllowedOperators.Contains(rule.Operator))
        {
            context.AddFailure($"{prefix}.deterministicRule.operator", "operator must be one of >, >=, <, <=, =, !=");
        }

        if (!double.IsFinite(rule.Value))
        {
            context.AddFailure($"{prefix}.deterministicRule.value", "value must be a finite number");
        }

        if (string.IsNullOrWhiteSpace(rule.DimensionId))
        {
            context.AddFailure($"{prefix}.deterministicRule.dimensionId", "dimensionId must reference a supported dimension");
            return;
        }

        if (!EligibilityDimensionRegistry.TryGetDefinition(rule.DimensionId, out var definition))
        {
            context.AddFailure($"{prefix}.deterministicRule.dimensionId", "dimensionId must reference a supported dimension");
            return;
        }

        if (definition.AllowedUnits.Count == 0)
        {
            if (!string.IsNullOrEmpty(rule.Unit))
            {
                context.AddFailure($"{prefix}.deterministicRule.unit", "unit is not supported for this dimension");
            }

            return;
        }

        if (string.IsNullOrWhiteSpace(rule.Unit))
        {
            context.AddFailure($"{prefix}.deterministicRule.unit", "unit is required for this dimension");
            return;
        }

        var matched = definition.AllowedUnits.Any(u => string.Equals(u, rule.Unit, StringComparison.OrdinalIgnoreCase));
        if (!matched)
        {
            context.AddFailure($"{prefix}.deterministicRule.unit", "unit must match one of the supported units for this dimension");
        }
    }
}
