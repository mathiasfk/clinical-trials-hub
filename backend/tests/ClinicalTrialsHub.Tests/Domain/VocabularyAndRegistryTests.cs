using ClinicalTrialsHub.Domain;

namespace ClinicalTrialsHub.Tests.Domain;

[TestFixture]
public sealed class VocabularyAndRegistryTests
{
    [Test]
    public void Dimension_lookup_is_case_insensitive_and_returns_canonical_id()
    {
        Assert.That(
            EligibilityDimensionRegistry.TryResolveCanonicalId("  hScRp  ", out var canonical),
            Is.True);
        Assert.That(canonical, Is.EqualTo("hsCRP"));
    }

    [Test]
    public void Unit_less_dimensions_have_empty_allowed_units()
    {
        var ecog = EligibilityDimensionRegistry.FindById("ecog");
        Assert.That(ecog, Is.Not.Null);
        Assert.That(ecog!.AllowedUnits, Is.Empty);

        var mmse = EligibilityDimensionRegistry.FindById("mmse");
        Assert.That(mmse, Is.Not.Null);
        Assert.That(mmse!.AllowedUnits, Is.Empty);
    }

    [Test]
    public void Vocabulary_helpers_accept_each_allowed_value_and_reject_unknown()
    {
        foreach (var phase in Vocabularies.AllowedPhases)
        {
            Assert.That(Vocabularies.IsAllowedPhase(phase), Is.True);
        }

        Assert.That(Vocabularies.IsAllowedPhase("Phase X"), Is.False);

        foreach (var area in Vocabularies.AllowedTherapeuticAreas)
        {
            Assert.That(Vocabularies.IsAllowedTherapeuticArea(area), Is.True);
        }

        Assert.That(Vocabularies.IsAllowedTherapeuticArea("Unknown"), Is.False);

        foreach (var studyType in Vocabularies.AllowedStudyTypes)
        {
            Assert.That(Vocabularies.IsAllowedStudyType(studyType), Is.True);
        }

        Assert.That(Vocabularies.IsAllowedStudyType(" factorial "), Is.False);
    }
}
