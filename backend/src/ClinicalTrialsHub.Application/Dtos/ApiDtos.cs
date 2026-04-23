namespace ClinicalTrialsHub.Application.Dtos;

public sealed record DeterministicRuleDto(string DimensionId, string Operator, double Value, string? Unit);

public sealed record EligibilityCriterionDto(string Description, DeterministicRuleDto DeterministicRule);

public sealed record StudyCreateInputDto(
    IReadOnlyList<string> Objectives,
    IReadOnlyList<string> Endpoints,
    IReadOnlyList<EligibilityCriterionDto> InclusionCriteria,
    IReadOnlyList<EligibilityCriterionDto> ExclusionCriteria,
    int Participants,
    string StudyType,
    int NumberOfArms,
    string Phase,
    string TherapeuticArea,
    string PatientPopulation,
    string FirstPatientFirstVisit,
    string LastPatientFirstVisit,
    string ProtocolApprovalDate);

public sealed record StudyEligibilityInputDto(
    IReadOnlyList<EligibilityCriterionDto> InclusionCriteria,
    IReadOnlyList<EligibilityCriterionDto> ExclusionCriteria);

public sealed record StudyDto(
    string Id,
    IReadOnlyList<string> Objectives,
    IReadOnlyList<string> Endpoints,
    IReadOnlyList<EligibilityCriterionDto> InclusionCriteria,
    IReadOnlyList<EligibilityCriterionDto> ExclusionCriteria,
    int Participants,
    string StudyType,
    int NumberOfArms,
    string Phase,
    string TherapeuticArea,
    string PatientPopulation,
    string FirstPatientFirstVisit,
    string LastPatientFirstVisit,
    string ProtocolApprovalDate);

public sealed record StudyResponseDto(StudyDto Data);

public sealed record StudyListResponseDto(IReadOnlyList<StudyDto> Data);

public sealed record EligibilityDimensionDto(
    string Id,
    string DisplayName,
    string Description,
    IReadOnlyList<string> AllowedUnits);

public sealed record DimensionsResponseDto(IReadOnlyList<EligibilityDimensionDto> Data);

public sealed record HealthResponseDto(string Status);

public sealed record ErrorResponseDto(string Message, IReadOnlyDictionary<string, string>? Errors);
