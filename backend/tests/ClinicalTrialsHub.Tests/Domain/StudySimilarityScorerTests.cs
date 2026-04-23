using ClinicalTrialsHub.Domain;

namespace ClinicalTrialsHub.Tests.Domain;

[TestFixture]
public sealed class StudySimilarityScorerTests
{
    [Test]
    public void Score_adds_three_when_only_therapeutic_area_matches_case_insensitive()
    {
        var current = Study("a", therapeuticArea: "cardiovascular", phase: "", studyType: "");
        var other = Study("b", therapeuticArea: "Cardiovascular", phase: "Phase 3", studyType: "parallel");

        Assert.That(StudySimilarityScorer.Score(current, other), Is.EqualTo(3));
    }

    [Test]
    public void Score_matches_frontend_fixture_therapeutic_plus_two_shared_dimensions()
    {
        var current = Study(
            "current",
            therapeuticArea: "Oncology",
            phase: "",
            studyType: "",
            inclusion: [Criterion("A", "hsCRP"), Criterion("A2", "hsCRP")],
            exclusion: [Criterion("B", "age")]);
        var other = Study(
            "other",
            therapeuticArea: "Oncology",
            phase: "Phase 3",
            studyType: "parallel",
            inclusion: [Criterion("X", "age")],
            exclusion: [Criterion("Y", "hsCRP")]);

        Assert.That(StudySimilarityScorer.Score(current, other), Is.EqualTo(3 + 1 + 1));
    }

    [Test]
    public void Score_counts_each_shared_dimension_once_even_when_repeated_in_lists()
    {
        var current = Study(
            "c",
            therapeuticArea: "",
            phase: "",
            studyType: "",
            inclusion: [Criterion("a", "dim1"), Criterion("b", "dim1")],
            exclusion: []);
        var other = Study(
            "o",
            therapeuticArea: "",
            phase: "",
            studyType: "",
            inclusion: [Criterion("x", "dim1")],
            exclusion: []);

        Assert.That(StudySimilarityScorer.Score(current, other), Is.EqualTo(1));
    }

    [Test]
    public void Score_treats_empty_phase_and_study_type_as_non_matching()
    {
        var current = Study("c", therapeuticArea: "", phase: "", studyType: "", inclusion: [], exclusion: []);
        var other = Study("o", therapeuticArea: "", phase: "Phase 2", studyType: "parallel", inclusion: [], exclusion: []);

        Assert.That(StudySimilarityScorer.Score(current, other), Is.EqualTo(0));
    }

    [Test]
    public void CriterionEquality_matches_trimmed_case_insensitive_description_and_rule_fields()
    {
        var a = new EligibilityCriterion
        {
            Description = "  hsCRP above 2 mg/L  ",
            DeterministicRule = new DeterministicRule
            {
                DimensionId = "hsCRP",
                Operator = ">",
                Value = 2,
                Unit = "mg/L",
            },
        };
        var b = new EligibilityCriterion
        {
            Description = "hsCRP ABOVE 2 mg/L",
            DeterministicRule = new DeterministicRule
            {
                DimensionId = "hsCRP",
                Operator = ">",
                Value = 2,
                Unit = "mg/L",
            },
        };

        Assert.That(CriterionEquality.Equals(a, b), Is.True);
    }

    [Test]
    public void CriterionEquality_normalizes_null_and_empty_unit()
    {
        var a = Criterion("Age", "age", unit: null);
        var b = Criterion("Age", "age", unit: string.Empty);

        Assert.That(CriterionEquality.Equals(a, b), Is.True);
    }

    [Test]
    public void CriterionEquality_false_when_value_differs()
    {
        var a = Criterion("Age above 18", "age", value: 18);
        var b = Criterion("Age above 18", "age", value: 21);

        Assert.That(CriterionEquality.Equals(a, b), Is.False);
    }

    private static Study Study(
        string id,
        string therapeuticArea = "",
        string phase = "",
        string studyType = "",
        List<EligibilityCriterion>? inclusion = null,
        List<EligibilityCriterion>? exclusion = null) =>
        new()
        {
            Id = id,
            TherapeuticArea = therapeuticArea,
            Phase = phase,
            StudyType = studyType,
            InclusionCriteria = inclusion ?? [],
            ExclusionCriteria = exclusion ?? [],
        };

    private static EligibilityCriterion Criterion(
        string description,
        string dimensionId,
        double value = 1,
        string op = ">",
        string? unit = "u")
    {
        var c = new EligibilityCriterion
        {
            Description = description,
            DeterministicRule = new DeterministicRule
            {
                DimensionId = dimensionId,
                Operator = op,
                Value = value,
                Unit = unit,
            },
        };
        return c;
    }
}
