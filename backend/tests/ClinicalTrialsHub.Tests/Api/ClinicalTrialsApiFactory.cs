using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace ClinicalTrialsHub.Tests.Api;

/// <summary>
/// Spins up the API with an isolated in-memory database per factory instance (seed runs on first use).
/// </summary>
public sealed class ClinicalTrialsApiFactory : WebApplicationFactory<Program>
{
    public string DatabaseName { get; } = Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("Cors:AllowedOrigins:0", "http://localhost:5173");
        builder.UseSetting("Persistence:InMemoryDatabaseName", DatabaseName);
    }
}
