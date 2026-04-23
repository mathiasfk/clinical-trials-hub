using System.Text.Json;
using System.Text.Json.Serialization;
using ClinicalTrialsHub.Api.Endpoints;
using ClinicalTrialsHub.Api.ExceptionHandling;
using ClinicalTrialsHub.Application;
using ClinicalTrialsHub.Infrastructure;
using Microsoft.OpenApi;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
    options.SerializerOptions.UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow;
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
});

builder.Services.AddOpenApi(
    options =>
    {
        options.AddDocumentTransformer(
            (document, _, _) =>
            {
                document.Info.Title = "Clinical Trials Hub API";
                document.Info.Version = "1.0";
                document.Info.Description =
                    "Clinical Trials Hub HTTP API (versioned REST under `/api/v1`; contract aligns with `frontend/src/types.ts`).";

                document.Paths ??= new OpenApiPaths();
                if (!document.Paths.ContainsKey("/health"))
                {
                    var healthOperation = new OpenApiOperation
                    {
                        OperationId = "Health",
                        Summary = "Health check",
                        Description = "Liveness probe returning a minimal JSON payload.",
                        Responses = new OpenApiResponses
                        {
                            ["200"] = new OpenApiResponse { Description = "OK" },
                        },
                    };

                    var healthPath = new OpenApiPathItem();
                    healthPath.AddOperation(System.Net.Http.HttpMethod.Get, healthOperation);
                    document.Paths.Add("/health", healthPath);
                }

                return Task.CompletedTask;
            });
    });

var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "ClinicalTrialsHub",
        policy =>
        {
            policy.WithOrigins(corsOrigins)
                .WithMethods(HttpMethods.Get, HttpMethods.Post, HttpMethods.Put, HttpMethods.Options)
                .WithHeaders("Content-Type");
        });
});

builder.Services.AddHealthChecks();
// Required for ExceptionHandlerMiddleware (IProblemDetailsService); error responses for this API are still written as ErrorResponseDto in GlobalExceptionHandler.
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors("ClinicalTrialsHub");

app.MapOpenApi();

app.MapScalarApiReference(options =>
{
    options.WithOpenApiRoutePattern("/openapi/{documentName}.json");
});

app.MapHealthEndpoints();
app.MapEligibilityEndpoints();
app.MapStudiesEndpoints();

app.Run();

public partial class Program;
