namespace ClinicalTrialsHub.Domain;

/// <summary>
/// Structural equality for eligibility criteria (mirrors frontend <c>isSameCriterion</c>).
/// </summary>
public static class CriterionEquality
{
    public static bool Equals(EligibilityCriterion? a, EligibilityCriterion? b)
    {
        if (ReferenceEquals(a, b))
        {
            return true;
        }

        if (a is null || b is null)
        {
            return false;
        }

        var sameDescription = string.Equals(
            a.Description.Trim(),
            b.Description.Trim(),
            StringComparison.OrdinalIgnoreCase);

        var ra = a.DeterministicRule;
        var rb = b.DeterministicRule;
        var unitA = ra.Unit ?? string.Empty;
        var unitB = rb.Unit ?? string.Empty;
        var sameRule =
            ra.DimensionId == rb.DimensionId &&
            ra.Operator == rb.Operator &&
            ra.Value == rb.Value &&
            unitA == unitB;

        return sameDescription && sameRule;
    }
}
