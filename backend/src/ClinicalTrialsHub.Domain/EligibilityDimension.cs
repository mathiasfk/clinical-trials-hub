namespace ClinicalTrialsHub.Domain;

/// <summary>
/// Describes a measurable clinical dimension and which units are valid for deterministic rules.
/// </summary>
public sealed record EligibilityDimension(
    string Id,
    string DisplayName,
    string Description,
    IReadOnlyList<string> AllowedUnits);
