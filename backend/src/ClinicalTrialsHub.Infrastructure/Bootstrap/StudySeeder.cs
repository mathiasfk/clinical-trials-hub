using ClinicalTrialsHub.Domain;
using ClinicalTrialsHub.Infrastructure.Persistence;

namespace ClinicalTrialsHub.Infrastructure.Bootstrap;

/// <summary>
/// Seeds the in-memory catalog with deterministic contiguous IDs (mirrors legacy study count and therapeutic-area ordering).
/// </summary>
public static class StudySeeder
{
    /// <summary>
    /// Therapeutic areas in the same order as <c>SeedStudies()</c> in <c>backend-go-backup/internal/bootstrap/seed.go</c>.
    /// </summary>
    private static readonly string[] TherapeuticAreasInSeedOrder =
    [
        "Cardiovascular",
        "Diabetes",
        "Cardiovascular",
        "Diabetes",
        "Diabetes",
        "Hematology",
        "Hematology",
        "Sickle Cell Disease",
        "Sickle Cell Disease",
        "Obesity",
        "Obesity",
        "Rare Diseases",
        "Rare Diseases",
        "Oncology",
        "Oncology",
        "Neurology",
        "Neurology",
    ];

    public static IReadOnlyList<Study> Catalog => Enumerable.Range(1, TherapeuticAreasInSeedOrder.Length)
        .Select(BuildSyntheticStudy)
        .ToArray();

    public static async Task SeedAsync(ClinicalTrialsDbContext db, CancellationToken cancellationToken)
    {
        foreach (var study in Catalog)
        {
            db.Studies.Add(study);
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private static Study BuildSyntheticStudy(int index)
    {
        var id = $"study-{index:D4}";
        var therapeuticArea = TherapeuticAreasInSeedOrder[index - 1];
        var criterion = new EligibilityCriterion
        {
            Description = "Participants must meet registrable age criteria.",
            DeterministicRule = new DeterministicRule
            {
                DimensionId = "age",
                Operator = ">=",
                Value = 18,
                Unit = "years old",
            },
        };

        return new Study
        {
            Id = id,
            Objectives = new List<string> { $"{id}: primary objective (seed)." },
            Endpoints = new List<string> { $"{id}: primary endpoint (seed)." },
            InclusionCriteria = new List<EligibilityCriterion> { criterion },
            ExclusionCriteria = new List<EligibilityCriterion>(),
            Participants = 120,
            StudyType = "parallel",
            NumberOfArms = 2,
            Phase = "Phase 2",
            TherapeuticArea = therapeuticArea,
            PatientPopulation = $"Patients eligible for studies in {therapeuticArea}",
            FirstPatientFirstVisit = "",
            LastPatientFirstVisit = "",
            ProtocolApprovalDate = "",
        };
    }
}
