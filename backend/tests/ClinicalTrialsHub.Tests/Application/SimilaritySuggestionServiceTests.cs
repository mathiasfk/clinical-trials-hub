using ClinicalTrialsHub.Application.Abstractions;
using ClinicalTrialsHub.Application.Exceptions;
using ClinicalTrialsHub.Application.Services;
using ClinicalTrialsHub.Domain;
using NSubstitute;

namespace ClinicalTrialsHub.Tests.Application;

[TestFixture]
public sealed class SimilaritySuggestionServiceTests
{
    [Test]
    public void GetSimilarSuggestions_throws_when_study_missing()
    {
        var repo = Substitute.For<IStudyRepository>();
        repo.GetByIdAsync("missing", Arg.Any<CancellationToken>()).Returns((Study?)null);
        var sut = new SimilaritySuggestionService(repo);

        Assert.ThrowsAsync<NotFoundException>(() =>
            sut.GetSimilarSuggestionsAsync("missing", 3, CancellationToken.None));
    }

    [Test]
    public async Task GetSimilarSuggestions_returns_empty_when_no_other_studies()
    {
        var target = TargetStudy();
        var repo = Substitute.For<IStudyRepository>();
        repo.GetByIdAsync("study-0001", Arg.Any<CancellationToken>()).Returns(target);
        repo.ListAsync(Arg.Any<CancellationToken>()).Returns(new[] { target });
        var sut = new SimilaritySuggestionService(repo);

        var result = await sut.GetSimilarSuggestionsAsync("study-0001", 3, CancellationToken.None);

        Assert.That(result.Data, Is.Empty);
    }

    [Test]
    public async Task GetSimilarSuggestions_orders_inclusion_before_exclusion_at_same_index()
    {
        var target = TargetStudy();
        var other = new Study
        {
            Id = "study-b",
            TherapeuticArea = "X",
            Phase = "P1",
            StudyType = "parallel",
            InclusionCriteria =
            [
                Crit("in-first", "age", 18, "years old"),
            ],
            ExclusionCriteria =
            [
                Crit("ex-first", "BMI", 30, "kg/m²"),
            ],
        };
        var repo = Substitute.For<IStudyRepository>();
        repo.GetByIdAsync("study-a", Arg.Any<CancellationToken>()).Returns(target);
        repo.ListAsync(Arg.Any<CancellationToken>()).Returns(new[] { target, other });
        var sut = new SimilaritySuggestionService(repo);

        var result = await sut.GetSimilarSuggestionsAsync("study-a", 2, CancellationToken.None);

        Assert.That(result.Data, Has.Count.EqualTo(2));
        Assert.That(result.Data[0].Group, Is.EqualTo("inclusion"));
        Assert.That(result.Data[0].Criterion.Description, Is.EqualTo("in-first"));
        Assert.That(result.Data[1].Group, Is.EqualTo("exclusion"));
        Assert.That(result.Data[1].Criterion.Description, Is.EqualTo("ex-first"));
    }

    [Test]
    public async Task GetSimilarSuggestions_breaks_score_ties_by_ascending_study_id()
    {
        var target = TargetStudy();
        var highZ = Candidate("study-z", scoreBoost: "z");
        var highA = Candidate("study-a", scoreBoost: "a");
        var repo = Substitute.For<IStudyRepository>();
        repo.GetByIdAsync("target", Arg.Any<CancellationToken>()).Returns(target);
        repo.ListAsync(Arg.Any<CancellationToken>()).Returns(new[] { target, highZ, highA });
        var sut = new SimilaritySuggestionService(repo);

        var result = await sut.GetSimilarSuggestionsAsync("target", 2, CancellationToken.None);

        Assert.That(result.Data[0].SourceStudyId, Is.EqualTo("study-a"));
        Assert.That(result.Data[1].SourceStudyId, Is.EqualTo("study-z"));
    }

    [Test]
    public async Task GetSimilarSuggestions_skips_criteria_equal_to_target()
    {
        var dup = Crit("dup", "age", 18, ">=", "years old");
        var target = TargetStudy(inclusion: [dup]);
        var other = new Study
        {
            Id = "study-b",
            TherapeuticArea = "X",
            Phase = "P1",
            StudyType = "parallel",
            InclusionCriteria = [dup, Crit("next", "weight", 100, "<=", "kg")],
            ExclusionCriteria = [],
        };
        var repo = Substitute.For<IStudyRepository>();
        repo.GetByIdAsync("study-a", Arg.Any<CancellationToken>()).Returns(target);
        repo.ListAsync(Arg.Any<CancellationToken>()).Returns(new[] { target, other });
        var sut = new SimilaritySuggestionService(repo);

        var result = await sut.GetSimilarSuggestionsAsync("study-a", 3, CancellationToken.None);

        Assert.That(result.Data, Has.Count.EqualTo(1));
        Assert.That(result.Data[0].Criterion.Description, Is.EqualTo("next"));
    }

    [Test]
    public async Task GetSimilarSuggestions_skips_duplicate_across_two_studies_in_same_response()
    {
        var target = TargetStudy();
        var shared = Crit("shared", "LVEF", 40, ">=", "%");
        var first = new Study
        {
            Id = "study-m",
            TherapeuticArea = "X",
            Phase = "P1",
            StudyType = "parallel",
            InclusionCriteria = [shared],
            ExclusionCriteria = [],
        };
        var second = new Study
        {
            Id = "study-n",
            TherapeuticArea = "X",
            Phase = "P1",
            StudyType = "parallel",
            InclusionCriteria = [shared],
            ExclusionCriteria = [],
        };
        var repo = Substitute.For<IStudyRepository>();
        repo.GetByIdAsync("study-a", Arg.Any<CancellationToken>()).Returns(target);
        repo.ListAsync(Arg.Any<CancellationToken>()).Returns(new[] { target, first, second });
        var sut = new SimilaritySuggestionService(repo);

        var result = await sut.GetSimilarSuggestionsAsync("study-a", 3, CancellationToken.None);

        Assert.That(result.Data, Has.Count.EqualTo(1));
        Assert.That(result.Data[0].SourceStudyId, Is.EqualTo("study-m"));
    }

    private static Study TargetStudy(
        List<EligibilityCriterion>? inclusion = null,
        List<EligibilityCriterion>? exclusion = null) =>
        new()
        {
            Id = "study-a",
            TherapeuticArea = "Cardiovascular",
            Phase = "Phase 2",
            StudyType = "parallel",
            InclusionCriteria = inclusion ?? [],
            ExclusionCriteria = exclusion ?? [],
        };

    private static Study Candidate(string id, string scoreBoost)
    {
        var unique = scoreBoost == "a"
            ? Crit("crit-a", "hsCRP", 2, ">", "mg/L")
            : Crit("crit-z", "BMI", 28, "<", "kg/m²");
        return new Study
        {
            Id = id,
            TherapeuticArea = "Cardiovascular",
            Phase = "Phase 2",
            StudyType = "parallel",
            InclusionCriteria = [unique],
            ExclusionCriteria = [],
        };
    }

    private static EligibilityCriterion Crit(
        string description,
        string dimensionId,
        double value = 1,
        string op = ">=",
        string? unit = null)
    {
        unit ??= dimensionId switch
        {
            "age" => "years old",
            "BMI" => "kg/m²",
            "weight" => "kg",
            "hsCRP" => "mg/L",
            _ => "kg",
        };
        return new EligibilityCriterion
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
    }
}
