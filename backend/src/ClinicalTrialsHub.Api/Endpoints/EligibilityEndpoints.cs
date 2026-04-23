using ClinicalTrialsHub.Application.Services;

namespace ClinicalTrialsHub.Api.Endpoints;

public static class EligibilityEndpoints
{
    public static void MapEligibilityEndpoints(this WebApplication app)
    {
        app.MapMethods(
                "/api/v1/eligibility-dimensions",
                [HttpMethods.Post, HttpMethods.Put, HttpMethods.Patch, HttpMethods.Delete],
                () => Results.StatusCode(StatusCodes.Status405MethodNotAllowed))
            .ExcludeFromDescription();

        app.MapGet(
                "/api/v1/eligibility-dimensions",
                (StudyService studyService) => Results.Ok(studyService.GetEligibilityDimensions()))
            .WithName("GetEligibilityDimensions")
            .WithTags("eligibility")
            .WithSummary("List eligibility dimensions")
            .WithDescription("Returns deterministic-rule dimension metadata (IDs, display names, allowed units).")
            .Produces(StatusCodes.Status200OK)
            .Produces(StatusCodes.Status405MethodNotAllowed)
            .WithOpenApi();
    }
}
