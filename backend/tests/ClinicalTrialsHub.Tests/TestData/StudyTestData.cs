using ClinicalTrialsHub.Application.Dtos;

namespace ClinicalTrialsHub.Tests.TestData;

internal static class StudyTestData
{
    public static StudyCreateInputDto ValidCreate() =>
        new(
            Objectives: new[] { "Primary objective" },
            Endpoints: new[] { "Primary endpoint" },
            InclusionCriteria: new[]
            {
                new EligibilityCriterionDto(
                    "Age gate",
                    new DeterministicRuleDto("age", ">=", 18, "years old")),
            },
            ExclusionCriteria: Array.Empty<EligibilityCriterionDto>(),
            Participants: 42,
            StudyType: "parallel",
            NumberOfArms: 2,
            Phase: "Phase 2",
            TherapeuticArea: "Oncology",
            PatientPopulation: "Adult participants",
            FirstPatientFirstVisit: "",
            LastPatientFirstVisit: "",
            ProtocolApprovalDate: "");

    public static StudyEligibilityInputDto ValidEligibility() =>
        new(
            InclusionCriteria: new[]
            {
                new EligibilityCriterionDto(
                    "BMI limit",
                    new DeterministicRuleDto("BMI", "<", 30, "kg/m²")),
            },
            ExclusionCriteria: Array.Empty<EligibilityCriterionDto>());
}
