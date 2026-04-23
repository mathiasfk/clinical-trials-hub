using ClinicalTrialsHub.Application.Services;
using ClinicalTrialsHub.Application.Validation;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace ClinicalTrialsHub.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining<StudyCreateInputValidator>();
        services.AddScoped<StudyService>();
        return services;
    }
}
