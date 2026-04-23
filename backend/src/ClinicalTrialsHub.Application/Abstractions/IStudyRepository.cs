using ClinicalTrialsHub.Domain;

namespace ClinicalTrialsHub.Application.Abstractions;

public interface IStudyRepository
{
    Task<Study> AddAsync(StudyDraft draft, CancellationToken cancellationToken);

    Task<IReadOnlyList<Study>> ListAsync(CancellationToken cancellationToken);

    Task<Study?> GetByIdAsync(string id, CancellationToken cancellationToken);

    Task<Study?> ReplaceAsync(string id, StudyDraft draft, CancellationToken cancellationToken);

    Task<Study?> UpdateEligibilityAsync(
        string id,
        IReadOnlyList<EligibilityCriterion> inclusionCriteria,
        IReadOnlyList<EligibilityCriterion> exclusionCriteria,
        CancellationToken cancellationToken);
}
