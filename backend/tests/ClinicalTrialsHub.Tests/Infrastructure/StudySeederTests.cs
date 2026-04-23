using ClinicalTrialsHub.Domain;
using ClinicalTrialsHub.Infrastructure.Bootstrap;

namespace ClinicalTrialsHub.Tests.Infrastructure;

[TestFixture]
public sealed class StudySeederTests
{
    [Test]
    public void Catalog_ids_are_contiguous_starting_at_study_0001()
    {
        var catalog = StudySeeder.Catalog;
        Assert.That(catalog, Is.Not.Empty);
        for (var i = 0; i < catalog.Count; i++)
        {
            Assert.That(catalog[i].Id, Is.EqualTo($"study-{(i + 1):D4}"));
        }
    }

    [Test]
    public void Every_criterion_dimension_resolves_and_unit_is_allowed_or_empty()
    {
        foreach (var study in StudySeeder.Catalog)
        {
            foreach (var c in study.InclusionCriteria.Concat(study.ExclusionCriteria))
            {
                Assert.That(
                    EligibilityDimensionRegistry.TryResolveCanonicalId(c.DeterministicRule.DimensionId, out var canon),
                    Is.True);
                var def = EligibilityDimensionRegistry.FindById(canon!);
                Assert.That(def, Is.Not.Null);
                if (def!.AllowedUnits.Count == 0)
                {
                    Assert.That(string.IsNullOrEmpty(c.DeterministicRule.Unit), Is.True);
                }
                else
                {
                    Assert.That(
                        def.AllowedUnits.Any(u =>
                            string.Equals(u, c.DeterministicRule.Unit, StringComparison.OrdinalIgnoreCase)),
                        Is.True);
                }
            }
        }
    }
}
