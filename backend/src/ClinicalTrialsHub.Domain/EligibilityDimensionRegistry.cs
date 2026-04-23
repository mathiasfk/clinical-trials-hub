using System.Diagnostics.CodeAnalysis;

namespace ClinicalTrialsHub.Domain;

/// <summary>
/// Canonical eligibility dimension definitions (ported from <c>backend-go-backup/internal/domain/eligibility.go</c>).
/// </summary>
public static class EligibilityDimensionRegistry
{
    private static readonly EligibilityDimension[] Dimensions =
    [
        new("hsCRP", "hsCRP", "high-sensitivity C-reactive protein", ["mg/L"]),
        new("LVEF", "LVEF", "left ventricular ejection fraction", ["%"]),
        new("SBP", "SBP", "systolic blood pressure", ["mmHg"]),
        new("age", "Age", "participant age", ["years old"]),
        new("BMI", "BMI", "body mass index", ["kg/m²"]),
        new("weight", "Weight", "participant body weight", ["kg"]),
        new("DBP", "DBP", "diastolic blood pressure", ["mmHg"]),
        new("heartRate", "Heart rate", "resting heart rate", ["bpm"]),
        new("QTc", "QTc", "corrected QT interval", ["ms"]),
        new("HbA1c", "HbA1c", "glycated hemoglobin", ["%"]),
        new("fastingPlasmaGlucose", "Fasting plasma glucose", "fasting plasma glucose", ["mg/dL"]),
        new("eGFR", "eGFR", "estimated glomerular filtration rate", ["mL/min/1.73m²"]),
        new("creatinine", "Creatinine", "serum creatinine", ["mg/dL"]),
        new("ALT", "ALT", "alanine aminotransferase", ["U/L"]),
        new("totalBilirubin", "Total bilirubin", "total serum bilirubin", ["mg/dL"]),
        new("hemoglobin", "Hemoglobin", "blood hemoglobin concentration", ["g/dL"]),
        new("HbF", "HbF", "fetal hemoglobin fraction", ["%"]),
        new("platelets", "Platelets", "platelet count", ["×10⁹/L"]),
        new("ANC", "ANC", "absolute neutrophil count", ["×10⁹/L"]),
        new("NTproBNP", "NT-proBNP", "N-terminal pro B-type natriuretic peptide", ["pg/mL"]),
        new("ECOG", "ECOG", "Eastern Cooperative Oncology Group performance status (0–4)", []),
        new("MMSE", "MMSE", "Mini-Mental State Examination score (0–30)", []),
    ];

    /// <summary>Immutable snapshot of every registered dimension (defensive copy of each row).</summary>
    public static IReadOnlyList<EligibilityDimension> All =>
        Dimensions.Select(static d => new EligibilityDimension(d.Id, d.DisplayName, d.Description, d.AllowedUnits.ToArray())).ToArray();

    /// <summary>
    /// Resolves a dimension id using case-insensitive comparison and returns the canonical id string
    /// stored in the registry (e.g. <c>hsCRP</c>).
    /// </summary>
    public static bool TryResolveCanonicalId(string dimensionId, [NotNullWhen(true)] out string? canonicalId)
    {
        canonicalId = null;
        var needle = dimensionId.Trim().ToLowerInvariant();
        if (needle.Length == 0)
        {
            return false;
        }

        foreach (var d in Dimensions)
        {
            if (string.Equals(d.Id, needle, StringComparison.OrdinalIgnoreCase))
            {
                canonicalId = d.Id;
                return true;
            }
        }

        return false;
    }

    /// <summary>Looks up a dimension by id (case-insensitive). Returns <c>null</c> when unknown.</summary>
    public static EligibilityDimension? FindById(string dimensionId)
    {
        if (!TryResolveCanonicalId(dimensionId, out var canonicalId))
        {
            return null;
        }

        var match = Dimensions.First(d => d.Id == canonicalId);
        return new EligibilityDimension(match.Id, match.DisplayName, match.Description, match.AllowedUnits.ToArray());
    }
}
