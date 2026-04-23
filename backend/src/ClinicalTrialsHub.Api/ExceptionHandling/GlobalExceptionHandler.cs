using System.Text.Json;
using ClinicalTrialsHub.Application.Dtos;
using ClinicalTrialsHub.Application.Exceptions;
using Microsoft.AspNetCore.Diagnostics;

namespace ClinicalTrialsHub.Api.ExceptionHandling;

public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger = logger;

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is BadHttpRequestException bad
            && bad.StatusCode == StatusCodes.Status400BadRequest
            && IsLikelyJsonBodyFailure(bad, httpContext))
        {
            await WriteJsonAsync(
                    httpContext,
                    StatusCodes.Status400BadRequest,
                    new ErrorResponseDto("invalid JSON payload", null),
                    cancellationToken)
                .ConfigureAwait(false);
            return true;
        }

        switch (exception)
        {
            case ValidationException validation:
                await WriteJsonAsync(
                        httpContext,
                        StatusCodes.Status400BadRequest,
                        new ErrorResponseDto("validation failed", validation.Errors),
                        cancellationToken)
                    .ConfigureAwait(false);
                return true;

            case NotFoundException:
                await WriteJsonAsync(
                        httpContext,
                        StatusCodes.Status404NotFound,
                        new ErrorResponseDto(exception.Message, null),
                        cancellationToken)
                    .ConfigureAwait(false);
                return true;

            case InvalidJsonException:
                await WriteJsonAsync(
                        httpContext,
                        StatusCodes.Status400BadRequest,
                        new ErrorResponseDto("invalid JSON payload", null),
                        cancellationToken)
                    .ConfigureAwait(false);
                return true;

            case JsonException:
                await WriteJsonAsync(
                        httpContext,
                        StatusCodes.Status400BadRequest,
                        new ErrorResponseDto("invalid JSON payload", null),
                        cancellationToken)
                    .ConfigureAwait(false);
                return true;
        }

        _logger.LogError(exception, "Unhandled exception processing request.");
        await WriteJsonAsync(
                httpContext,
                StatusCodes.Status500InternalServerError,
                new ErrorResponseDto("internal server error", null),
                cancellationToken)
            .ConfigureAwait(false);
        return true;
    }

    /// <summary>
    /// Prefer a structured signal (e.g. JSON exception in the chain) or JSON content-type; keep message matching as a last resort
    /// for Kestrel paths that do not set <see cref="Exception.InnerException"/>.
    /// </summary>
    private static bool IsLikelyJsonBodyFailure(BadHttpRequestException ex, HttpContext httpContext)
    {
        for (var current = (Exception?)ex; current is not null; current = current.InnerException)
        {
            if (current is JsonException)
            {
                return true;
            }
        }

        var m = httpContext.Request.Method;
        if (m is "POST" or "PUT" or "PATCH" &&
            httpContext.Request.ContentType is { } contentType
            && contentType.Contains("application/json", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return ex.Message.Contains("JSON", StringComparison.OrdinalIgnoreCase)
            || ex.Message.Contains("request body", StringComparison.OrdinalIgnoreCase);
    }

    private static Task WriteJsonAsync(HttpContext httpContext, int statusCode, ErrorResponseDto body, CancellationToken cancellationToken)
    {
        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/json";
        return httpContext.Response.WriteAsJsonAsync(body, cancellationToken);
    }
}
