using ClinicalTrialsHub.Api.Http;
using ClinicalTrialsHub.Application.Dtos;
using ClinicalTrialsHub.Application.Mapping;
using ClinicalTrialsHub.Application.Services;

namespace ClinicalTrialsHub.Api.Endpoints;

public static class StudiesEndpoints
{
    public static void MapStudiesEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/studies").WithTags("studies");

        group.MapGet(
                "/",
                async (StudyService studyService, CancellationToken cancellationToken) =>
                {
                    var studies = await studyService.ListStudiesAsync(cancellationToken).ConfigureAwait(false);
                    var data = studies.Select(StudyMapper.ToStudyDto).ToArray();
                    return Results.Ok(new StudyListResponseDto(data));
                })
            .WithName("ListStudies")
            .WithSummary("List studies")
            .WithDescription("Returns every registered study ordered by ascending numeric study id suffix.")
            .Produces<StudyListResponseDto>(StatusCodes.Status200OK)
            .WithOpenApi();

        group.MapPost(
                "/",
                async (StudyCreateInputDto input, StudyService studyService, CancellationToken cancellationToken) =>
                {
                    var created = await studyService.CreateStudyAsync(input, cancellationToken).ConfigureAwait(false);
                    var body = new StudyResponseDto(StudyMapper.ToStudyDto(created));
                    return Results.Created($"/api/studies/{created.Id}", body);
                })
            .AddEndpointFilter(JsonInvalidPayloadEndpointFilter.Instance)
            .WithName("CreateStudy")
            .WithSummary("Create study")
            .WithDescription("Registers a new study; the server assigns the next contiguous study-NNNN identifier.")
            .Produces<StudyResponseDto>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .WithOpenApi();

        group.MapGet(
                "/{id}",
                async (string id, StudyService studyService, CancellationToken cancellationToken) =>
                {
                    if (string.IsNullOrWhiteSpace(id))
                    {
                        return Results.BadRequest(new ErrorResponseDto("study id is required", null));
                    }

                    var study = await studyService.GetStudyByIdAsync(id, cancellationToken).ConfigureAwait(false);
                    return Results.Ok(new StudyResponseDto(StudyMapper.ToStudyDto(study)));
                })
            .WithName("GetStudyById")
            .WithSummary("Get study by id")
            .WithDescription("Fetches a single study aggregate including eligibility criteria.")
            .Produces<StudyResponseDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .WithOpenApi();

        group.MapPut(
                "/{id}",
                async (string id, StudyCreateInputDto input, StudyService studyService, CancellationToken cancellationToken) =>
                {
                    if (string.IsNullOrWhiteSpace(id))
                    {
                        return Results.BadRequest(new ErrorResponseDto("study id is required", null));
                    }

                    var updated = await studyService.ReplaceStudyAsync(id, input, cancellationToken).ConfigureAwait(false);
                    return Results.Ok(new StudyResponseDto(StudyMapper.ToStudyDto(updated)));
                })
            .AddEndpointFilter(JsonInvalidPayloadEndpointFilter.Instance)
            .WithName("ReplaceStudy")
            .WithSummary("Replace study")
            .WithDescription("Fully replaces an existing study, including eligibility criteria, while keeping the same id.")
            .Produces<StudyResponseDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .WithOpenApi();

        group.MapPut(
                "/{id}/eligibility",
                async (string id, StudyEligibilityInputDto input, StudyService studyService, CancellationToken cancellationToken) =>
                {
                    if (string.IsNullOrWhiteSpace(id))
                    {
                        return Results.BadRequest(new ErrorResponseDto("study id is required", null));
                    }

                    var updated = await studyService.UpdateStudyEligibilityAsync(id, input, cancellationToken)
                        .ConfigureAwait(false);
                    return Results.Ok(new StudyResponseDto(StudyMapper.ToStudyDto(updated)));
                })
            .AddEndpointFilter(JsonInvalidPayloadEndpointFilter.Instance)
            .WithName("UpdateStudyEligibility")
            .WithSummary("Update eligibility only")
            .WithDescription("Updates inclusion and exclusion criteria without changing other study fields.")
            .Produces<StudyResponseDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .WithOpenApi();

        group.MapGet(
                "/{id}/similar-suggestions",
                async (
                    string id,
                    int? limit,
                    SimilaritySuggestionService similarityService,
                    CancellationToken cancellationToken) =>
                {
                    if (string.IsNullOrWhiteSpace(id))
                    {
                        return Results.BadRequest(new ErrorResponseDto("study id is required", null));
                    }

                    var resolvedLimit = limit ?? 3;
                    if (resolvedLimit is < 1 or > 10)
                    {
                        var errors = new Dictionary<string, string>
                        {
                            ["limit"] = "limit must be between 1 and 10",
                        };
                        return Results.BadRequest(new ErrorResponseDto("validation failed", errors));
                    }

                    var result = await similarityService
                        .GetSimilarSuggestionsAsync(id, resolvedLimit, cancellationToken)
                        .ConfigureAwait(false);
                    return Results.Ok(result);
                })
            .WithName("GetSimilarStudySuggestions")
            .WithSummary("Similar study criterion suggestions")
            .WithDescription(
                "Returns up to `limit` eligibility criteria from other studies ranked by deterministic similarity to the target study.")
            .Produces<SimilarSuggestionsResponseDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .WithOpenApi();
    }
}
