using Microsoft.AspNetCore.Diagnostics.HealthChecks;

namespace ClinicalTrialsHub.Api.Endpoints;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this WebApplication app)
    {
        app.MapHealthChecks(
                "/health",
                new HealthCheckOptions
                {
                    Predicate = _ => false,
                    ResponseWriter = static async (context, _) =>
                    {
                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsync("{\"status\":\"ok\"}").ConfigureAwait(false);
                    },
                })
            .WithName("Health")
            .WithTags("health")
            .WithSummary("Health check")
            .WithDescription("Liveness probe returning a minimal JSON payload.");
    }
}
