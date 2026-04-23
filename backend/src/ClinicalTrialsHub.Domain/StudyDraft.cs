namespace ClinicalTrialsHub.Domain;

/// <summary>
/// Study payload without identifier (create / full replace); mirrors <c>StudyCreateInput</c> on the front-end.
/// </summary>
public sealed record StudyDraft(
    List<string> Objectives,
    List<string> Endpoints,
    List<EligibilityCriterion> InclusionCriteria,
    List<EligibilityCriterion> ExclusionCriteria,
    int Participants,
    string StudyType,
    int NumberOfArms,
    string Phase,
    string TherapeuticArea,
    string PatientPopulation,
    string FirstPatientFirstVisit,
    string LastPatientFirstVisit,
    string ProtocolApprovalDate);
