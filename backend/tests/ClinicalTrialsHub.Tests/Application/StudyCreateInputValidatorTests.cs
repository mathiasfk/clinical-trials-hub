using ClinicalTrialsHub.Application.Dtos;
using ClinicalTrialsHub.Application.Validation;
using ClinicalTrialsHub.Tests.TestData;

namespace ClinicalTrialsHub.Tests.Application;

[TestFixture]
public sealed class StudyCreateInputValidatorTests
{
    private readonly StudyCreateInputValidator _validator = new();

    [Test]
    public void HappyPath_is_valid()
    {
        var result = _validator.Validate(StudyTestData.ValidCreate());
        Assert.That(result.IsValid, Is.True);
    }

    [Test]
    public void Rejects_when_no_objectives()
    {
        var input = StudyTestData.ValidCreate() with { Objectives = Array.Empty<string>() };
        var result = _validator.Validate(input);
        Assert.That(result.IsValid, Is.False);
        Assert.That(result.Errors.Any(e => e.PropertyName == "objectives"), Is.True);
    }

    [Test]
    public void Rejects_when_no_endpoints()
    {
        var input = StudyTestData.ValidCreate() with { Endpoints = Array.Empty<string>() };
        var result = _validator.Validate(input);
        Assert.That(result.Errors.Any(e => e.PropertyName == "endpoints"), Is.True);
    }

    [Test]
    public void Rejects_when_no_eligibility_criteria()
    {
        var input = StudyTestData.ValidCreate() with
        {
            InclusionCriteria = Array.Empty<EligibilityCriterionDto>(),
            ExclusionCriteria = Array.Empty<EligibilityCriterionDto>(),
        };
        var result = _validator.Validate(input);
        Assert.That(result.Errors.Any(e => e.PropertyName == "eligibilityCriteria"), Is.True);
    }

    [Test]
    public void Rejects_when_participants_not_positive()
    {
        var input = StudyTestData.ValidCreate() with { Participants = 0 };
        var result = _validator.Validate(input);
        Assert.That(result.Errors.Any(e => e.PropertyName == "participants"), Is.True);
    }

    [Test]
    public void Rejects_when_number_of_arms_not_positive()
    {
        var input = StudyTestData.ValidCreate() with { NumberOfArms = 0 };
        var result = _validator.Validate(input);
        Assert.That(result.Errors.Any(e => e.PropertyName == "numberOfArms"), Is.True);
    }

    [Test]
    public void Rejects_invalid_study_type()
    {
        var input = StudyTestData.ValidCreate() with { StudyType = "invalid-type" };
        var result = _validator.Validate(input);
        Assert.That(result.Errors.Any(e => e.PropertyName == "studyType"), Is.True);
    }

    [Test]
    public void Rejects_invalid_phase()
    {
        var input = StudyTestData.ValidCreate() with { Phase = "Phase 9" };
        var result = _validator.Validate(input);
        Assert.That(result.Errors.Any(e => e.PropertyName == "phase"), Is.True);
    }

    [Test]
    public void Rejects_invalid_therapeutic_area()
    {
        var input = StudyTestData.ValidCreate() with { TherapeuticArea = "Unknown" };
        var result = _validator.Validate(input);
        Assert.That(result.Errors.Any(e => e.PropertyName == "therapeuticArea"), Is.True);
    }

    [Test]
    public void Rejects_empty_patient_population()
    {
        var input = StudyTestData.ValidCreate() with { PatientPopulation = string.Empty };
        var result = _validator.Validate(input);
        Assert.That(result.Errors.Any(e => e.PropertyName == "patientPopulation"), Is.True);
    }

    [Test]
    public void Rejects_invalid_optional_date()
    {
        var input = StudyTestData.ValidCreate() with { FirstPatientFirstVisit = "not-a-date" };
        var result = _validator.Validate(input);
        Assert.That(result.Errors.Any(e => e.PropertyName == "firstPatientFirstVisit"), Is.True);
    }

    [Test]
    public void Rejects_missing_unit_for_dimension_that_requires_one()
    {
        var crit = new EligibilityCriterionDto(
            "rule",
            new DeterministicRuleDto("age", ">=", 18, null));
        var input = StudyTestData.ValidCreate() with { InclusionCriteria = new[] { crit } };
        var result = _validator.Validate(input);
        Assert.That(
            result.Errors.Any(e => e.PropertyName.Contains("deterministicRule.unit", StringComparison.Ordinal)),
            Is.True);
    }

    [Test]
    public void Rejects_unknown_dimension()
    {
        var crit = new EligibilityCriterionDto(
            "rule",
            new DeterministicRuleDto("unknownDim", ">=", 1, "kg"));
        var input = StudyTestData.ValidCreate() with { InclusionCriteria = new[] { crit } };
        var result = _validator.Validate(input);
        Assert.That(
            result.Errors.Any(e => e.PropertyName.Contains("dimensionId", StringComparison.Ordinal)),
            Is.True);
    }

    [Test]
    public void Rejects_invalid_operator()
    {
        var crit = new EligibilityCriterionDto(
            "rule",
            new DeterministicRuleDto("age", "~~", 18, "years old"));
        var input = StudyTestData.ValidCreate() with { InclusionCriteria = new[] { crit } };
        var result = _validator.Validate(input);
        Assert.That(
            result.Errors.Any(e => e.PropertyName.Contains("deterministicRule.operator", StringComparison.Ordinal)),
            Is.True);
    }

    [Test]
    public void Rejects_non_finite_value()
    {
        var crit = new EligibilityCriterionDto(
            "rule",
            new DeterministicRuleDto("age", ">=", double.PositiveInfinity, "years old"));
        var input = StudyTestData.ValidCreate() with { InclusionCriteria = new[] { crit } };
        var result = _validator.Validate(input);
        Assert.That(
            result.Errors.Any(e => e.PropertyName.Contains("deterministicRule.value", StringComparison.Ordinal)),
            Is.True);
    }
}
