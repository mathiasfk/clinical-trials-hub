namespace ClinicalTrialsHub.Domain;

/// <summary>
/// Deterministic similarity score between two studies (same rules as the former frontend heuristic).
/// </summary>
public static class StudySimilarityScorer
{
    public static int Score(Study current, Study other)
    {
        var score = 0;
        if (EqualsCaseInsensitiveNonEmpty(current.TherapeuticArea, other.TherapeuticArea))
        {
            score += 3;
        }

        if (!string.IsNullOrEmpty(current.Phase) && current.Phase == other.Phase)
        {
            score += 2;
        }

        if (!string.IsNullOrEmpty(current.StudyType) && current.StudyType == other.StudyType)
        {
            score += 1;
        }

        var currentDimensions = CollectDimensionIds(current);
        var otherDimensions = CollectDimensionIds(other);
        foreach (var id in currentDimensions)
        {
            if (otherDimensions.Contains(id))
            {
                score += 1;
            }
        }

        return score;
    }

    private static bool EqualsCaseInsensitiveNonEmpty(string a, string b) =>
        string.Equals(a.Trim(), b.Trim(), StringComparison.OrdinalIgnoreCase) &&
        a.Trim().Length > 0;

    private static HashSet<string> CollectDimensionIds(Study study)
    {
        var ids = new HashSet<string>(StringComparer.Ordinal);
        foreach (var criterion in study.InclusionCriteria)
        {
            var dim = criterion.DeterministicRule.DimensionId;
            if (!string.IsNullOrEmpty(dim))
            {
                ids.Add(dim);
            }
        }

        foreach (var criterion in study.ExclusionCriteria)
        {
            var dim = criterion.DeterministicRule.DimensionId;
            if (!string.IsNullOrEmpty(dim))
            {
                ids.Add(dim);
            }
        }

        return ids;
    }
}
