using System.Text.Json;
using ClinicalTrialsHub.Application.Exceptions;

namespace ClinicalTrialsHub.Api.Http;

/// <summary>
/// Wraps Minimal API JSON model binding so <see cref="JsonException"/> (and common JSON body failures)
/// surface as <see cref="InvalidJsonException"/> for the global exception handler.
/// </summary>
public sealed class JsonInvalidPayloadEndpointFilter : IEndpointFilter
{
    public static readonly JsonInvalidPayloadEndpointFilter Instance = new();

    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        try
        {
            return await next(context);
        }
        catch (JsonException ex)
        {
            throw new InvalidJsonException(ex.Message);
        }
        catch (BadHttpRequestException ex) when (IsLikelyJsonBodyFailure(ex))
        {
            throw new InvalidJsonException(ex.Message);
        }
    }

    private static bool IsLikelyJsonBodyFailure(BadHttpRequestException ex) =>
        ex.Message.Contains("JSON", StringComparison.OrdinalIgnoreCase)
        || ex.Message.Contains("request body", StringComparison.OrdinalIgnoreCase);
}
