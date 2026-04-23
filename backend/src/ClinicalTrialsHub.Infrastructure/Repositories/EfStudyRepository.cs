using ClinicalTrialsHub.Application.Abstractions;
using ClinicalTrialsHub.Domain;
using ClinicalTrialsHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ClinicalTrialsHub.Infrastructure.Repositories;

public sealed class EfStudyRepository(ClinicalTrialsDbContext db) : IStudyRepository
{
    private const string IdPrefix = "study";
    private static readonly SemaphoreSlim Gate = new(1, 1);
    private readonly ClinicalTrialsDbContext _db = db;

    public async Task<Study> AddAsync(StudyDraft draft, CancellationToken cancellationToken)
    {
        await Gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            var studies = await _db.Studies.AsNoTracking().Select(s => s.Id).ToListAsync(cancellationToken).ConfigureAwait(false);
            var nextSuffix = NextSuffix(studies);
            var id = $"{IdPrefix}-{nextSuffix:D4}";
            var study = ToStudy(id, draft);
            _db.Studies.Add(study);
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            return study;
        }
        finally
        {
            Gate.Release();
        }
    }

    public async Task<IReadOnlyList<Study>> ListAsync(CancellationToken cancellationToken)
    {
        var list = await _db.Studies.AsNoTracking().ToListAsync(cancellationToken).ConfigureAwait(false);
        return list
            .OrderBy(s => ParseSuffixOrMax(s.Id))
            .ToArray();
    }

    public async Task<Study?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        return await _db.Studies.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, cancellationToken)
            .ConfigureAwait(false);
    }

    public async Task<Study?> ReplaceAsync(string id, StudyDraft draft, CancellationToken cancellationToken)
    {
        var existing = await _db.Studies.FirstOrDefaultAsync(s => s.Id == id, cancellationToken).ConfigureAwait(false);
        if (existing is null)
        {
            return null;
        }

        _db.Studies.Remove(existing);
        var replacement = ToStudy(id, draft);
        _db.Studies.Add(replacement);
        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return replacement;
    }

    public async Task<Study?> UpdateEligibilityAsync(
        string id,
        IReadOnlyList<EligibilityCriterion> inclusionCriteria,
        IReadOnlyList<EligibilityCriterion> exclusionCriteria,
        CancellationToken cancellationToken)
    {
        var existing = await _db.Studies.FirstOrDefaultAsync(s => s.Id == id, cancellationToken).ConfigureAwait(false);
        if (existing is null)
        {
            return null;
        }

        existing.InclusionCriteria.Clear();
        existing.InclusionCriteria.AddRange(inclusionCriteria);

        existing.ExclusionCriteria.Clear();
        existing.ExclusionCriteria.AddRange(exclusionCriteria);

        await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
        return existing;
    }

    private static int NextSuffix(IReadOnlyCollection<string> ids)
    {
        var highest = 0;
        foreach (var id in ids)
        {
            if (TryParseSuffix(id, out var suffix) && suffix > highest)
            {
                highest = suffix;
            }
        }

        return highest + 1;
    }

    private static bool TryParseSuffix(string id, out int suffix)
    {
        suffix = 0;
        var expected = $"{IdPrefix}-";
        if (!id.StartsWith(expected, StringComparison.Ordinal))
        {
            return false;
        }

        var tail = id[expected.Length..];
        if (tail.Length == 0)
        {
            return false;
        }

        foreach (var ch in tail)
        {
            if (ch is < '0' or > '9')
            {
                return false;
            }

            suffix = suffix * 10 + (ch - '0');
        }

        return true;
    }

    private static int ParseSuffixOrMax(string id) => TryParseSuffix(id, out var n) ? n : int.MaxValue;

    private static Study ToStudy(string id, StudyDraft draft) =>
        new()
        {
            Id = id,
            Objectives = [.. draft.Objectives],
            Endpoints = [.. draft.Endpoints],
            InclusionCriteria = [.. draft.InclusionCriteria],
            ExclusionCriteria = [.. draft.ExclusionCriteria],
            Participants = draft.Participants,
            StudyType = draft.StudyType,
            NumberOfArms = draft.NumberOfArms,
            Phase = draft.Phase,
            TherapeuticArea = draft.TherapeuticArea,
            PatientPopulation = draft.PatientPopulation,
            FirstPatientFirstVisit = draft.FirstPatientFirstVisit,
            LastPatientFirstVisit = draft.LastPatientFirstVisit,
            ProtocolApprovalDate = draft.ProtocolApprovalDate,
        };
}
