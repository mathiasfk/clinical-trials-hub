using ClinicalTrialsHub.Application.Dtos;
using ClinicalTrialsHub.Application.Validation;
using ClinicalTrialsHub.Tests.TestData;

namespace ClinicalTrialsHub.Tests.Application;

[TestFixture]
public sealed class StudyEligibilityInputValidatorTests
{
    private readonly StudyEligibilityInputValidator _validator = new();

    [Test]
    public void HappyPath_is_valid()
    {
        var result = _validator.Validate(StudyTestData.ValidEligibility());
        Assert.That(result.IsValid, Is.True);
    }

    [Test]
    public void Rejects_when_no_criteria()
    {
        var input = new StudyEligibilityInputDto(
            Array.Empty<EligibilityCriterionDto>(),
            Array.Empty<EligibilityCriterionDto>());
        var result = _validator.Validate(input);
        Assert.That(result.Errors.Any(e => e.PropertyName == "eligibilityCriteria"), Is.True);
    }

    [Test]
    public void Rejects_per_criterion_missing_unit()
    {
        var crit = new EligibilityCriterionDto(
            "rule",
            new DeterministicRuleDto("SBP", "<", 140, null));
        var input = new StudyEligibilityInputDto(new[] { crit }, Array.Empty<EligibilityCriterionDto>());
        var result = _validator.Validate(input);
        Assert.That(
            result.Errors.Any(e => e.PropertyName.Contains("deterministicRule.unit", StringComparison.Ordinal)),
            Is.True);
    }
}
