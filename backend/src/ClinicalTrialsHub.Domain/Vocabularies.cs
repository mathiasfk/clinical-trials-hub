namespace ClinicalTrialsHub.Domain;

/// <summary>
/// Allow-lists aligned with <c>frontend/src/sections/constants.ts</c> (order preserved).
/// </summary>
public static class Vocabularies
{
    public static readonly string[] AllowedPhases =
    [
        "Phase 1",
        "Phase 2",
        "Phase 3",
        "Phase 4",
    ];

    public static readonly string[] AllowedTherapeuticAreas =
    [
        "Cardiovascular",
        "Diabetes",
        "Hematology",
        "Sickle Cell Disease",
        "Obesity",
        "Rare Diseases",
        "Oncology",
        "Neurology",
    ];

    public static readonly string[] AllowedStudyTypes =
    [
        "parallel",
        "crossover",
        "single-arm",
    ];

    public static bool IsAllowedPhase(string value) => AllowedPhases.Contains(value);

    public static bool IsAllowedTherapeuticArea(string value) => AllowedTherapeuticAreas.Contains(value);

    public static bool IsAllowedStudyType(string value) => AllowedStudyTypes.Contains(value);
}
