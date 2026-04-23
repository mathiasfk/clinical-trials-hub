using ClinicalTrialsHub.Application.Dtos;
using ClinicalTrialsHub.Domain;

namespace ClinicalTrialsHub.Application.Mapping;

public static class StudyMapper
{
    public static StudyCreateInputDto NormalizeIncoming(StudyCreateInputDto input) =>
        input with
        {
            Objectives = NormalizeTextList(input.Objectives),
            Endpoints = NormalizeTextList(input.Endpoints),
            InclusionCriteria = input.InclusionCriteria.Select(NormalizeCriterionDto).ToArray(),
            ExclusionCriteria = input.ExclusionCriteria.Select(NormalizeCriterionDto).ToArray(),
            StudyType = input.StudyType.Trim().ToLowerInvariant(),
            Phase = input.Phase.Trim(),
            TherapeuticArea = input.TherapeuticArea.Trim(),
            PatientPopulation = input.PatientPopulation.Trim(),
            FirstPatientFirstVisit = input.FirstPatientFirstVisit.Trim(),
            LastPatientFirstVisit = input.LastPatientFirstVisit.Trim(),
            ProtocolApprovalDate = input.ProtocolApprovalDate.Trim(),
        };

    public static StudyEligibilityInputDto NormalizeIncoming(StudyEligibilityInputDto input) =>
        input with
        {
            InclusionCriteria = input.InclusionCriteria.Select(NormalizeCriterionDto).ToArray(),
            ExclusionCriteria = input.ExclusionCriteria.Select(NormalizeCriterionDto).ToArray(),
        };

    public static StudyDraft ToDraft(StudyCreateInputDto normalized)
    {
        var inclusion = normalized.InclusionCriteria.Select(ToDomainCriterion).ToArray();
        var exclusion = normalized.ExclusionCriteria.Select(ToDomainCriterion).ToArray();
        return new StudyDraft(
            normalized.Objectives.ToList(),
            normalized.Endpoints.ToList(),
            inclusion.ToList(),
            exclusion.ToList(),
            normalized.Participants,
            normalized.StudyType,
            normalized.NumberOfArms,
            normalized.Phase,
            normalized.TherapeuticArea,
            normalized.PatientPopulation,
            normalized.FirstPatientFirstVisit,
            normalized.LastPatientFirstVisit,
            normalized.ProtocolApprovalDate);
    }

    public static StudyDto ToStudyDto(Study study) =>
        new(
            study.Id,
            study.Objectives.ToArray(),
            study.Endpoints.ToArray(),
            study.InclusionCriteria.Select(ToDtoCriterion).ToArray(),
            study.ExclusionCriteria.Select(ToDtoCriterion).ToArray(),
            study.Participants,
            study.StudyType,
            study.NumberOfArms,
            study.Phase,
            study.TherapeuticArea,
            study.PatientPopulation,
            study.FirstPatientFirstVisit,
            study.LastPatientFirstVisit,
            study.ProtocolApprovalDate);

    private static EligibilityCriterionDto NormalizeCriterionDto(EligibilityCriterionDto criterion) =>
        criterion with
        {
            Description = criterion.Description.Trim(),
            DeterministicRule = criterion.DeterministicRule with
            {
                DimensionId = criterion.DeterministicRule.DimensionId.Trim(),
                Operator = criterion.DeterministicRule.Operator.Trim(),
                Unit = string.IsNullOrWhiteSpace(criterion.DeterministicRule.Unit)
                    ? null
                    : criterion.DeterministicRule.Unit.Trim(),
            },
        };

    public static EligibilityCriterion ToDomainCriterion(EligibilityCriterionDto dto)
    {
        var dim = dto.DeterministicRule;
        if (!EligibilityDimensionRegistry.TryResolveCanonicalId(dim.DimensionId, out var canonicalId))
        {
            throw new InvalidOperationException("Validated criterion must resolve to a canonical dimension.");
        }

        var definition = EligibilityDimensionRegistry.FindById(canonicalId!)
                     ?? throw new InvalidOperationException("Validated dimension missing from registry.");

        string? unit = dim.Unit;
        if (definition.AllowedUnits.Count == 0)
        {
            unit = string.Empty;
        }
        else if (!string.IsNullOrEmpty(dim.Unit))
        {
            unit = NormalizeUnitAgainstAllowed(dim.Unit!, definition.AllowedUnits);
        }

        var rule = new DeterministicRule
        {
            DimensionId = canonicalId!,
            Operator = dim.Operator,
            Value = dim.Value,
            Unit = string.IsNullOrEmpty(unit) ? null : unit,
        };
        return new EligibilityCriterion { Description = dto.Description, DeterministicRule = rule };
    }

    private static string NormalizeUnitAgainstAllowed(string unit, IReadOnlyList<string> allowed)
    {
        foreach (var candidate in allowed)
        {
            if (string.Equals(candidate, unit, StringComparison.OrdinalIgnoreCase))
            {
                return candidate;
            }
        }

        return unit;
    }

    private static EligibilityCriterionDto ToDtoCriterion(EligibilityCriterion criterion)
    {
        var r = criterion.DeterministicRule;
        var dtoRule = new DeterministicRuleDto(r.DimensionId, r.Operator, r.Value, r.Unit);
        return new EligibilityCriterionDto(criterion.Description, dtoRule);
    }

    private static IReadOnlyList<string> NormalizeTextList(IReadOnlyList<string> list)
    {
        var result = new List<string>(list.Count);
        foreach (var item in list)
        {
            var trimmed = item.Trim();
            if (trimmed.Length > 0)
            {
                result.Add(trimmed);
            }
        }

        return result;
    }
}
