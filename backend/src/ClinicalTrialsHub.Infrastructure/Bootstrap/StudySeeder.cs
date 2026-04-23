using System.Text.Json;
using ClinicalTrialsHub.Domain;
using ClinicalTrialsHub.Infrastructure.Persistence;

namespace ClinicalTrialsHub.Infrastructure.Bootstrap;

/// <summary>
/// Loads the seed catalog from embedded <c>seed-studies.json</c> (parity with repository root
/// <c>seed.go</c> / <c>SeedStudies()</c>).
/// </summary>
public static class StudySeeder
{
    private static readonly Lazy<IReadOnlyList<Study>> CatalogLazy = new(LoadCatalog);

    public static IReadOnlyList<Study> Catalog => CatalogLazy.Value;

    public static async Task SeedAsync(ClinicalTrialsDbContext db, CancellationToken cancellationToken)
    {
        foreach (var study in Catalog)
        {
            db.Studies.Add(study);
        }

        await db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
    }

    private static IReadOnlyList<Study> LoadCatalog()
    {
        var assembly = typeof(StudySeeder).Assembly;
        var name = assembly.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith("seed-studies.json", StringComparison.Ordinal));
        if (name is null)
        {
            throw new InvalidOperationException("Embedded resource seed-studies.json was not found.");
        }

        using var stream = assembly.GetManifestResourceStream(name);
        if (stream is null)
        {
            throw new InvalidOperationException($"Failed to open embedded resource '{name}'.");
        }

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
        };

        var list = JsonSerializer.Deserialize<List<Study>>(stream, options);
        if (list is null or { Count: 0 })
        {
            throw new InvalidOperationException("seed-studies.json is missing or has no study entries.");
        }

        foreach (var study in list)
        {
            foreach (var c in study.InclusionCriteria.Concat(study.ExclusionCriteria))
            {
                c.DeterministicRule.Unit ??= string.Empty;
            }
        }

        return list;
    }
}
