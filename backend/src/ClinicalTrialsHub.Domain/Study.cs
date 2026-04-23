namespace ClinicalTrialsHub.Domain;

/// <summary>
/// Persisted study aggregate (JSON shape matches <c>Study</c> in <c>frontend/src/types.ts</c>).
/// Mutable collection references support EF Core materialization and in-place eligibility updates.
/// </summary>
public sealed class Study
{
    public string Id { get; set; } = string.Empty;

    public List<string> Objectives { get; set; } = [];

    public List<string> Endpoints { get; set; } = [];

    public List<EligibilityCriterion> InclusionCriteria { get; set; } = [];

    public List<EligibilityCriterion> ExclusionCriteria { get; set; } = [];

    public int Participants { get; set; }

    public string StudyType { get; set; } = string.Empty;

    public int NumberOfArms { get; set; }

    public string Phase { get; set; } = string.Empty;

    public string TherapeuticArea { get; set; } = string.Empty;

    public string PatientPopulation { get; set; } = string.Empty;

    public string FirstPatientFirstVisit { get; set; } = string.Empty;

    public string LastPatientFirstVisit { get; set; } = string.Empty;

    public string ProtocolApprovalDate { get; set; } = string.Empty;
}
