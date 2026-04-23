using ClinicalTrialsHub.Application.Abstractions;
using ClinicalTrialsHub.Application.Dtos;
using ClinicalTrialsHub.Application.Exceptions;
using ClinicalTrialsHub.Application.Mapping;
using ClinicalTrialsHub.Domain;
using FluentValidation;
using AppValidationException = ClinicalTrialsHub.Application.Exceptions.ValidationException;

namespace ClinicalTrialsHub.Application.Services;

public sealed class StudyService(
    IStudyRepository repository,
    IValidator<StudyCreateInputDto> createValidator,
    IValidator<StudyEligibilityInputDto> eligibilityValidator)
{
    private readonly IStudyRepository _repository = repository;
    private readonly IValidator<StudyCreateInputDto> _createValidator = createValidator;
    private readonly IValidator<StudyEligibilityInputDto> _eligibilityValidator = eligibilityValidator;

    public async Task<Study> CreateStudyAsync(StudyCreateInputDto input, CancellationToken cancellationToken)
    {
        var normalized = StudyMapper.NormalizeIncoming(input);
        await ThrowIfInvalidAsync(_createValidator, normalized, cancellationToken).ConfigureAwait(false);
        var draft = StudyMapper.ToDraft(normalized);
        return await _repository.AddAsync(draft, cancellationToken).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<Study>> ListStudiesAsync(CancellationToken cancellationToken) =>
        await _repository.ListAsync(cancellationToken).ConfigureAwait(false);

    public async Task<Study> GetStudyByIdAsync(string id, CancellationToken cancellationToken)
    {
        var trimmed = id.Trim();
        var study = await _repository.GetByIdAsync(trimmed, cancellationToken).ConfigureAwait(false);
        if (study is null)
        {
            throw new NotFoundException("study");
        }

        return study;
    }

    public async Task<Study> ReplaceStudyAsync(string id, StudyCreateInputDto input, CancellationToken cancellationToken)
    {
        var trimmedId = id.Trim();
        if (trimmedId.Length == 0)
        {
            throw new NotFoundException("study");
        }

        var normalized = StudyMapper.NormalizeIncoming(input);
        await ThrowIfInvalidAsync(_createValidator, normalized, cancellationToken).ConfigureAwait(false);
        var draft = StudyMapper.ToDraft(normalized);

        var updated = await _repository.ReplaceAsync(trimmedId, draft, cancellationToken).ConfigureAwait(false);
        if (updated is null)
        {
            throw new NotFoundException("study");
        }

        return updated;
    }

    public async Task<Study> UpdateStudyEligibilityAsync(
        string id,
        StudyEligibilityInputDto input,
        CancellationToken cancellationToken)
    {
        var trimmedId = id.Trim();
        var normalized = StudyMapper.NormalizeIncoming(input);
        await ThrowIfInvalidAsync(_eligibilityValidator, normalized, cancellationToken).ConfigureAwait(false);

        var inclusion = normalized.InclusionCriteria.Select(StudyMapper.ToDomainCriterion).ToArray();
        var exclusion = normalized.ExclusionCriteria.Select(StudyMapper.ToDomainCriterion).ToArray();

        var updated = await _repository.UpdateEligibilityAsync(trimmedId, inclusion, exclusion, cancellationToken)
            .ConfigureAwait(false);
        if (updated is null)
        {
            throw new NotFoundException("study");
        }

        return updated;
    }

    public DimensionsResponseDto GetEligibilityDimensions()
    {
        var data = EligibilityDimensionRegistry.All.Select(static d => new EligibilityDimensionDto(
            d.Id,
            d.DisplayName,
            d.Description,
            d.AllowedUnits.ToArray())).ToArray();
        return new DimensionsResponseDto(data);
    }

    private static async Task ThrowIfInvalidAsync<T>(
        IValidator<T> validator,
        T instance,
        CancellationToken cancellationToken)
    {
        var result = await validator.ValidateAsync(instance, cancellationToken).ConfigureAwait(false);
        if (result.IsValid)
        {
            return;
        }

        var dict = result.Errors
            .GroupBy(e => e.PropertyName)
            .ToDictionary(static g => g.Key, static g => g.First().ErrorMessage);
        throw new AppValidationException(dict);
    }
}
