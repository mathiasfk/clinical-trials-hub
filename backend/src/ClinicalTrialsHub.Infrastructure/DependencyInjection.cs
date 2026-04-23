using ClinicalTrialsHub.Application.Abstractions;
using ClinicalTrialsHub.Infrastructure.Bootstrap;
using ClinicalTrialsHub.Infrastructure.Persistence;
using ClinicalTrialsHub.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ClinicalTrialsHub.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services)
    {
        services.AddDbContext<ClinicalTrialsDbContext>(
            (sp, options) =>
            {
                var configuration = sp.GetRequiredService<IConfiguration>();
                var databaseName = configuration["Persistence:InMemoryDatabaseName"] ?? "clinical-trials-hub";
                options.UseInMemoryDatabase(databaseName);
            });

        services.AddScoped<IStudyRepository, EfStudyRepository>();
        services.AddHostedService<SeedStartupHostedService>();
        return services;
    }
}
