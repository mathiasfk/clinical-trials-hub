namespace ClinicalTrialsHub.Application.Exceptions;

public sealed class ValidationException : Exception
{
    public IReadOnlyDictionary<string, string> Errors { get; }

    public ValidationException(IDictionary<string, string> errors)
        : base("validation failed")
    {
        Errors = new Dictionary<string, string>(errors);
    }
}

public sealed class NotFoundException : Exception
{
    public string Resource { get; }

    public NotFoundException(string resource)
        : base($"{resource} not found")
    {
        Resource = resource;
    }
}

public sealed class InvalidJsonException : Exception
{
    public string Detail { get; }

    public InvalidJsonException(string detail)
        : base(detail)
    {
        Detail = detail;
    }
}
