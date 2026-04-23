using ClinicalTrialsHub.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ClinicalTrialsHub.Infrastructure.Persistence.Configurations;

public sealed class StudyConfiguration : IEntityTypeConfiguration<Study>
{
    public void Configure(EntityTypeBuilder<Study> builder)
    {
        builder.ToTable("Studies");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Id).ValueGeneratedNever();

        ConfigureCriteriaCollection(builder.OwnsMany(s => s.InclusionCriteria), "StudyInclusionCriteria");
        ConfigureCriteriaCollection(builder.OwnsMany(s => s.ExclusionCriteria), "StudyExclusionCriteria");
    }

    private static void ConfigureCriteriaCollection(
        OwnedNavigationBuilder<Study, EligibilityCriterion> navigation,
        string tableName)
    {
        navigation.ToTable(tableName);
        navigation.WithOwner().HasForeignKey("StudyId");
        navigation.Property<int>("Ordinal").ValueGeneratedOnAdd();
        navigation.HasKey("StudyId", "Ordinal");
        navigation.Property(c => c.Description).IsRequired();

        navigation.OwnsOne(c => c.DeterministicRule, rule =>
        {
            rule.Property(r => r.DimensionId).IsRequired();
            rule.Property(r => r.Operator).IsRequired();
            rule.Property(r => r.Value).IsRequired();
            rule.Property(r => r.Unit);
        });
    }
}
