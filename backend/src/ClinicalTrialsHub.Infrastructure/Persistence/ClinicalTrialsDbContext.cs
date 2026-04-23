using ClinicalTrialsHub.Domain;
using Microsoft.EntityFrameworkCore;

namespace ClinicalTrialsHub.Infrastructure.Persistence;

public sealed class ClinicalTrialsDbContext(DbContextOptions<ClinicalTrialsDbContext> options) : DbContext(options)
{
    public DbSet<Study> Studies => Set<Study>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ClinicalTrialsDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
