using ClinicalTrialsHub.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace ClinicalTrialsHub.Infrastructure.Bootstrap;

public sealed class SeedStartupHostedService(IServiceScopeFactory scopeFactory) : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory = scopeFactory;

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<ClinicalTrialsDbContext>();

        await db.Database.EnsureCreatedAsync(cancellationToken).ConfigureAwait(false);

        var hasStudies = await db.Studies.AsNoTracking().AnyAsync(cancellationToken).ConfigureAwait(false);
        if (hasStudies)
        {
            return;
        }

        await StudySeeder.SeedAsync(db, cancellationToken).ConfigureAwait(false);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
