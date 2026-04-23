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

            case BadHttpRequestException ex
                when (ex.Message.Contains("JSON", StringComparison.OrdinalIgnoreCase)
                    || ex.Message.Contains("request body", StringComparison.OrdinalIgnoreCase)):
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

    private static Task WriteJsonAsync(HttpContext httpContext, int statusCode, ErrorResponseDto body, CancellationToken cancellationToken)
    {
        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/json";
        return httpContext.Response.WriteAsJsonAsync(body, cancellationToken);
    }
}
