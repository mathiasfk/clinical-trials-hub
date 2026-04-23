using ClinicalTrialsHub.Application.Abstractions;
using ClinicalTrialsHub.Application.Exceptions;
using ClinicalTrialsHub.Application.Services;
using ClinicalTrialsHub.Application.Validation;
using ClinicalTrialsHub.Domain;
using ClinicalTrialsHub.Tests.TestData;
using NSubstitute;

namespace ClinicalTrialsHub.Tests.Application;

[TestFixture]
public sealed class StudyServiceTests
{
    private IStudyRepository _repo = null!;
    private StudyService _sut = null!;

    [SetUp]
    public void SetUp()
    {
        _repo = Substitute.For<IStudyRepository>();
        _sut = new StudyService(_repo, new StudyCreateInputValidator(), new StudyEligibilityInputValidator());
    }

    [Test]
    public async Task CreateStudyAsync_persists_when_valid()
    {
        var expected = new Study { Id = "study-0001", Objectives = new List<string> { "o" } };
        _repo.AddAsync(Arg.Any<StudyDraft>(), Arg.Any<CancellationToken>())
            .Returns(expected);

        var created = await _sut.CreateStudyAsync(StudyTestData.ValidCreate(), CancellationToken.None);

        Assert.That(created, Is.SameAs(expected));
        await _repo.Received(1).AddAsync(Arg.Any<StudyDraft>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public void CreateStudyAsync_throws_validation_without_repository_call()
    {
        var bad = StudyTestData.ValidCreate() with { Objectives = Array.Empty<string>() };
        Assert.ThrowsAsync<ValidationException>(() => _sut.CreateStudyAsync(bad, CancellationToken.None));
        _ = _repo.DidNotReceive().AddAsync(Arg.Any<StudyDraft>(), Arg.Any<CancellationToken>());
    }

    [Test]
    public async Task ListStudiesAsync_delegates()
    {
        var list = new List<Study> { new() { Id = "study-0001" } };
        _repo.ListAsync(Arg.Any<CancellationToken>()).Returns(list);

        var result = await _sut.ListStudiesAsync(CancellationToken.None);

        Assert.That(result, Is.SameAs(list));
    }

    [Test]
    public async Task GetStudyByIdAsync_returns_study()
    {
        var study = new Study { Id = "study-0001" };
        _repo.GetByIdAsync("study-0001", Arg.Any<CancellationToken>()).Returns(study);

        var result = await _sut.GetStudyByIdAsync("study-0001", CancellationToken.None);

        Assert.That(result, Is.SameAs(study));
    }

    [Test]
    public void GetStudyByIdAsync_throws_when_missing()
    {
        _repo.GetByIdAsync("nope", Arg.Any<CancellationToken>()).Returns((Study?)null);
        Assert.ThrowsAsync<NotFoundException>(() => _sut.GetStudyByIdAsync("nope", CancellationToken.None));
    }

    [Test]
    public async Task ReplaceStudyAsync_updates_when_valid()
    {
        var updated = new Study { Id = "study-0001" };
        _repo.ReplaceAsync("study-0001", Arg.Any<StudyDraft>(), Arg.Any<CancellationToken>())
            .Returns(updated);

        var result = await _sut.ReplaceStudyAsync("study-0001", StudyTestData.ValidCreate(), CancellationToken.None);

        Assert.That(result, Is.SameAs(updated));
    }

    [Test]
    public void ReplaceStudyAsync_throws_not_found_when_repository_returns_null()
    {
        _repo.ReplaceAsync("study-0001", Arg.Any<StudyDraft>(), Arg.Any<CancellationToken>())
            .Returns((Study?)null);
        Assert.ThrowsAsync<NotFoundException>(() =>
            _sut.ReplaceStudyAsync("study-0001", StudyTestData.ValidCreate(), CancellationToken.None));
    }

    [Test]
    public async Task UpdateStudyEligibilityAsync_updates_when_valid()
    {
        var updated = new Study { Id = "study-0001" };
        _repo.UpdateEligibilityAsync(
                "study-0001",
                Arg.Any<IReadOnlyList<EligibilityCriterion>>(),
                Arg.Any<IReadOnlyList<EligibilityCriterion>>(),
                Arg.Any<CancellationToken>())
            .Returns(updated);

        var result = await _sut.UpdateStudyEligibilityAsync(
            "study-0001",
            StudyTestData.ValidEligibility(),
            CancellationToken.None);

        Assert.That(result, Is.SameAs(updated));
    }

    [Test]
    public void UpdateStudyEligibilityAsync_throws_not_found_when_repository_returns_null()
    {
        _repo.UpdateEligibilityAsync(
                "study-0001",
                Arg.Any<IReadOnlyList<EligibilityCriterion>>(),
                Arg.Any<IReadOnlyList<EligibilityCriterion>>(),
                Arg.Any<CancellationToken>())
            .Returns((Study?)null);
        Assert.ThrowsAsync<NotFoundException>(() =>
            _sut.UpdateStudyEligibilityAsync("study-0001", StudyTestData.ValidEligibility(), CancellationToken.None));
    }

    [Test]
    public void GetEligibilityDimensions_returns_registry_rows()
    {
        var dto = _sut.GetEligibilityDimensions();
        Assert.That(dto.Data.Count, Is.GreaterThan(0));
    }
}
