namespace ClinicalTrialsHub.Domain;

/// <summary>
/// Human-readable criterion plus its deterministic rule.
/// </summary>
public sealed class EligibilityCriterion
{
    public string Description { get; set; } = string.Empty;

    public DeterministicRule DeterministicRule { get; set; } = new();
}
