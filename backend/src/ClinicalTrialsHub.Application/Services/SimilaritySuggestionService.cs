using ClinicalTrialsHub.Application.Abstractions;
using ClinicalTrialsHub.Application.Dtos;
using ClinicalTrialsHub.Application.Exceptions;
using ClinicalTrialsHub.Application.Mapping;
using ClinicalTrialsHub.Domain;

namespace ClinicalTrialsHub.Application.Services;

public sealed class SimilaritySuggestionService(IStudyRepository repository)
{
    private readonly IStudyRepository _repository = repository;

    public async Task<SimilarSuggestionsResponseDto> GetSimilarSuggestionsAsync(
        string studyId,
        int limit,
        CancellationToken cancellationToken)
    {
        var trimmedId = studyId.Trim();
        var target = await _repository.GetByIdAsync(trimmedId, cancellationToken).ConfigureAwait(false);
        if (target is null)
        {
            throw new NotFoundException("study");
        }

        var all = await _repository.ListAsync(cancellationToken).ConfigureAwait(false);
        var candidates = all
            .Where(s => s.Id != trimmedId)
            .OrderByDescending(s => StudySimilarityScorer.Score(target, s))
            .ThenBy(s => s.Id, StringComparer.Ordinal)
            .ToArray();

        var suggestions = new List<SuggestedCriterionDto>();
        var acceptedDomain = new List<EligibilityCriterion>();
        foreach (var study in candidates)
        {
            if (suggestions.Count >= limit)
            {
                break;
            }

            var maxLen = Math.Max(study.InclusionCriteria.Count, study.ExclusionCriteria.Count);
            for (var i = 0; i < maxLen && suggestions.Count < limit; i++)
            {
                if (i < study.InclusionCriteria.Count)
                {
                    var inclusion = study.InclusionCriteria[i];
                    if (TryAddSuggestion(target, acceptedDomain, suggestions, study.Id, "inclusion", i, inclusion, limit))
                    {
                        if (suggestions.Count >= limit)
                        {
                            break;
                        }
                    }
                }

                if (i < study.ExclusionCriteria.Count)
                {
                    var exclusion = study.ExclusionCriteria[i];
                    TryAddSuggestion(target, acceptedDomain, suggestions, study.Id, "exclusion", i, exclusion, limit);
                }
            }
        }

        return new SimilarSuggestionsResponseDto(suggestions);
    }

    private static bool TryAddSuggestion(
        Study target,
        List<EligibilityCriterion> acceptedDomain,
        List<SuggestedCriterionDto> collected,
        string sourceStudyId,
        string group,
        int criterionIndex,
        EligibilityCriterion criterion,
        int limit)
    {
        if (collected.Count >= limit)
        {
            return false;
        }

        if (IsOnTargetStudy(target, criterion))
        {
            return false;
        }

        if (acceptedDomain.Any(c => CriterionEquality.Equals(c, criterion)))
        {
            return false;
        }

        acceptedDomain.Add(criterion);
        collected.Add(
            new SuggestedCriterionDto(
                sourceStudyId,
                group,
                criterionIndex,
                StudyMapper.ToDtoCriterion(criterion)));
        return true;
    }

    private static bool IsOnTargetStudy(Study target, EligibilityCriterion candidate) =>
        target.InclusionCriteria.Any(c => CriterionEquality.Equals(c, candidate)) ||
        target.ExclusionCriteria.Any(c => CriterionEquality.Equals(c, candidate));
}
