using ClinicalTrialsHub.Domain;
using ClinicalTrialsHub.Infrastructure.Persistence;
using ClinicalTrialsHub.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

namespace ClinicalTrialsHub.Tests.Infrastructure;

[TestFixture]
[Parallelizable(ParallelScope.None)]
public sealed class EfStudyRepositoryTests
{
    private static ClinicalTrialsDbContext CreateContext(string databaseName)
    {
        var options = new DbContextOptionsBuilder<ClinicalTrialsDbContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;
        return new ClinicalTrialsDbContext(options);
    }

    private static StudyDraft SimpleDraft(string suffix = "x") =>
        new(
            Objectives: new List<string> { $"obj-{suffix}" },
            Endpoints: new List<string> { $"ep-{suffix}" },
            InclusionCriteria: new List<EligibilityCriterion>
            {
                new()
                {
                    Description = "d",
                    DeterministicRule = new DeterministicRule
                    {
                        DimensionId = "age",
                        Operator = ">=",
                        Value = 18,
                        Unit = "years old",
                    },
                },
            },
            ExclusionCriteria: new List<EligibilityCriterion>(),
            Participants: 10,
            StudyType: "parallel",
            NumberOfArms: 2,
            Phase: "Phase 2",
            TherapeuticArea: "Oncology",
            PatientPopulation: "Adults",
            FirstPatientFirstVisit: "",
            LastPatientFirstVisit: "",
            ProtocolApprovalDate: "");

    [Test]
    public async Task AddAsync_assigns_next_suffix_when_store_has_studies()
    {
        var dbName = Guid.NewGuid().ToString();
        await using (var seedCtx = CreateContext(dbName))
        {
            seedCtx.Studies.Add(
                new Study
                {
                    Id = "study-0005",
                    Objectives = new List<string> { "o" },
                    Endpoints = new List<string> { "e" },
                    InclusionCriteria = new List<EligibilityCriterion>
                    {
                        new()
                        {
                            Description = "d",
                            DeterministicRule = new DeterministicRule
                            {
                                DimensionId = "age",
                                Operator = ">=",
                                Value = 18,
                                Unit = "years old",
                            },
                        },
                    },
                    ExclusionCriteria = new List<EligibilityCriterion>(),
                    Participants = 1,
                    StudyType = "parallel",
                    NumberOfArms = 1,
                    Phase = "Phase 2",
                    TherapeuticArea = "Oncology",
                    PatientPopulation = "p",
                    FirstPatientFirstVisit = "",
                    LastPatientFirstVisit = "",
                    ProtocolApprovalDate = "",
                });
            await seedCtx.SaveChangesAsync();
        }

        await using var ctx = CreateContext(dbName);
        var repo = new EfStudyRepository(ctx);
        var created = await repo.AddAsync(SimpleDraft("new"), CancellationToken.None);
        Assert.That(created.Id, Is.EqualTo("study-0006"));
    }

    [Test]
    public async Task Concurrent_AddAsync_produces_distinct_ids()
    {
        var dbName = Guid.NewGuid().ToString();
        var tasks = Enumerable.Range(0, 8).Select(async _ =>
        {
            await using var ctx = CreateContext(dbName);
            var repo = new EfStudyRepository(ctx);
            return await repo.AddAsync(SimpleDraft(Guid.NewGuid().ToString("N")), CancellationToken.None);
        });

        var studies = await Task.WhenAll(tasks);
        var ids = studies.Select(s => s.Id).ToHashSet();
        Assert.That(ids.Count, Is.EqualTo(8));
    }

    [Test]
    public async Task ReplaceAsync_returns_null_for_missing_id()
    {
        var dbName = Guid.NewGuid().ToString();
        await using var ctx = CreateContext(dbName);
        var repo = new EfStudyRepository(ctx);
        var result = await repo.ReplaceAsync("study-9999", SimpleDraft(), CancellationToken.None);
        Assert.That(result, Is.Null);
    }

    [Test]
    public async Task UpdateEligibilityAsync_returns_null_for_missing_id()
    {
        var dbName = Guid.NewGuid().ToString();
        await using var ctx = CreateContext(dbName);
        var repo = new EfStudyRepository(ctx);
        var incl = new List<EligibilityCriterion>
        {
            new()
            {
                Description = "d",
                DeterministicRule = new DeterministicRule
                {
                    DimensionId = "age",
                    Operator = ">=",
                    Value = 21,
                    Unit = "years old",
                },
            },
        };
        var result = await repo.UpdateEligibilityAsync(
            "study-9999",
            incl,
            Array.Empty<EligibilityCriterion>(),
            CancellationToken.None);
        Assert.That(result, Is.Null);
    }

    [Test]
    public async Task Add_then_Get_round_trips_eligibility_fields()
    {
        var dbName = Guid.NewGuid().ToString();
        await using var ctx = CreateContext(dbName);
        var repo = new EfStudyRepository(ctx);
        var draft = new StudyDraft(
            Objectives: new List<string> { "o" },
            Endpoints: new List<string> { "e" },
            InclusionCriteria: new List<EligibilityCriterion>
            {
                new()
                {
                    Description = "incl-1",
                    DeterministicRule = new DeterministicRule
                    {
                        DimensionId = "LVEF",
                        Operator = ">",
                        Value = 40,
                        Unit = "%",
                    },
                },
            },
            ExclusionCriteria: new List<EligibilityCriterion>
            {
                new()
                {
                    Description = "excl-1",
                    DeterministicRule = new DeterministicRule
                    {
                        DimensionId = "ECOG",
                        Operator = "=",
                        Value = 2,
                        Unit = string.Empty,
                    },
                },
            },
            Participants: 5,
            StudyType: "parallel",
            NumberOfArms: 1,
            Phase: "Phase 3",
            TherapeuticArea: "Neurology",
            PatientPopulation: "pp",
            FirstPatientFirstVisit: "",
            LastPatientFirstVisit: "",
            ProtocolApprovalDate: "");

        var created = await repo.AddAsync(draft, CancellationToken.None);
        var loaded = await repo.GetByIdAsync(created.Id, CancellationToken.None);
        Assert.That(loaded, Is.Not.Null);
        Assert.That(loaded!.InclusionCriteria, Has.Count.EqualTo(1));
        Assert.That(loaded.ExclusionCriteria, Has.Count.EqualTo(1));
        var i0 = loaded.InclusionCriteria[0];
        Assert.Multiple(() =>
        {
            Assert.That(i0.Description, Is.EqualTo("incl-1"));
            Assert.That(i0.DeterministicRule.DimensionId, Is.EqualTo("LVEF"));
            Assert.That(i0.DeterministicRule.Operator, Is.EqualTo(">"));
            Assert.That(i0.DeterministicRule.Value, Is.EqualTo(40));
            Assert.That(i0.DeterministicRule.Unit, Is.EqualTo("%"));
        });
        var e0 = loaded.ExclusionCriteria[0];
        Assert.Multiple(() =>
        {
            Assert.That(e0.Description, Is.EqualTo("excl-1"));
            Assert.That(e0.DeterministicRule.DimensionId, Is.EqualTo("ECOG"));
            Assert.That(e0.DeterministicRule.Unit, Is.Null.Or.Empty);
        });
    }
}
