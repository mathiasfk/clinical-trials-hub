namespace ClinicalTrialsHub.Domain;

/// <summary>
/// Machine-checkable rule attached to an eligibility criterion (wire shape matches the front-end contract).
/// </summary>
public sealed class DeterministicRule
{
    public string DimensionId { get; set; } = string.Empty;

    public string Operator { get; set; } = string.Empty;

    public double Value { get; set; }

    public string? Unit { get; set; }
}
