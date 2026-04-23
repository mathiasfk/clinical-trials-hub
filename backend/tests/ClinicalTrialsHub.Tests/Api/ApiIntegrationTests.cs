using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ClinicalTrialsHub.Infrastructure.Bootstrap;

namespace ClinicalTrialsHub.Tests.Api;

[TestFixture]
[Parallelizable(ParallelScope.None)]
public sealed class ApiIntegrationTests
{
    [Test]
    public async Task Get_health_returns_ok_envelope()
    {
        await using var factory = new ClinicalTrialsApiFactory();
        var client = factory.CreateClient();
        var response = await client.GetAsync(new Uri("/health", UriKind.Relative));
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK));
        await using var stream = await response.Content.ReadAsStreamAsync();
        using var doc = await JsonDocument.ParseAsync(stream);
        Assert.That(doc.RootElement.GetProperty("status").GetString(), Is.EqualTo("ok"));
    }

    [Test]
    public async Task Eligibility_dimensions_rejects_post_with_405()
    {
        await using var factory = new ClinicalTrialsApiFactory();
        var client = factory.CreateClient();
        var response = await client.PostAsync(new Uri("/api/v1/eligibility-dimensions", UriKind.Relative), null);
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.MethodNotAllowed));
    }

    [Test]
    public async Task Get_eligibility_dimensions_returns_data_envelope()
    {
        await using var factory = new ClinicalTrialsApiFactory();
        var client = factory.CreateClient();
        var response = await client.GetAsync(new Uri("/api/v1/eligibility-dimensions", UriKind.Relative));
        response.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.That(doc.RootElement.TryGetProperty("data", out var data), Is.True);
        Assert.That(data.GetArrayLength(), Is.GreaterThan(0));
    }

    [Test]
    public async Task Get_studies_returns_seeded_ids_in_order()
    {
        await using var factory = new ClinicalTrialsApiFactory();
        var client = factory.CreateClient();
        var response = await client.GetAsync(new Uri("/api/v1/studies", UriKind.Relative));
        response.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var ids = doc.RootElement.GetProperty("data").EnumerateArray().Select(e => e.GetProperty("id").GetString()!)
            .ToArray();
        var expected = StudySeeder.Catalog.Select(s => s.Id).ToArray();
        Assert.That(ids, Is.EqualTo(expected));
    }

    [Test]
    public async Task Post_study_happy_path_assigns_next_id_and_get_round_trips()
    {
        await using var factory = new ClinicalTrialsApiFactory();
        var client = factory.CreateClient();
        var next = StudySeeder.Catalog.Count + 1;
        var expectedId = $"study-{next:D4}";

        var payload = new
        {
            objectives = new[] { "o" },
            endpoints = new[] { "e" },
            inclusionCriteria = new[]
            {
                new
                {
                    description = "d",
                    deterministicRule = new
                    {
                        dimensionId = "age",
                        @operator = ">=",
                        value = 18,
                        unit = "years old",
                    },
                },
            },
            exclusionCriteria = Array.Empty<object>(),
            participants = 20,
            studyType = "parallel",
            numberOfArms = 2,
            phase = "Phase 2",
            therapeuticArea = "Oncology",
            patientPopulation = "Adults",
            firstPatientFirstVisit = "",
            lastPatientFirstVisit = "",
            protocolApprovalDate = "",
        };

        var create = await client.PostAsJsonAsync("/api/v1/studies", payload);
        Assert.That(create.StatusCode, Is.EqualTo(HttpStatusCode.Created));
        using (var createdDoc = JsonDocument.Parse(await create.Content.ReadAsStringAsync()))
        {
            Assert.That(createdDoc.RootElement.GetProperty("data").GetProperty("id").GetString(), Is.EqualTo(expectedId));
        }

        var get = await client.GetAsync(new Uri($"/api/v1/studies/{expectedId}", UriKind.Relative));
        get.EnsureSuccessStatusCode();
    }

    [Test]
    public async Task Post_study_validation_returns_nested_field_paths()
    {
        await using var factory = new ClinicalTrialsApiFactory();
        var client = factory.CreateClient();
        var payload = new
        {
            objectives = new[] { "o" },
            endpoints = new[] { "e" },
            inclusionCriteria = new[]
            {
                new
                {
                    description = "d",
                    deterministicRule = new
                    {
                        dimensionId = "age",
                        @operator = ">=",
                        value = 18,
                        unit = (string?)null,
                    },
                },
            },
            exclusionCriteria = Array.Empty<object>(),
            participants = 20,
            studyType = "parallel",
            numberOfArms = 2,
            phase = "Phase 2",
            therapeuticArea = "Oncology",
            patientPopulation = "Adults",
            firstPatientFirstVisit = "",
            lastPatientFirstVisit = "",
            protocolApprovalDate = "",
        };

        var response = await client.PostAsJsonAsync("/api/v1/studies", payload);
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var errors = doc.RootElement.GetProperty("errors");
        Assert.That(
            errors.EnumerateObject().Any(p => p.Name.Contains("inclusionCriteria[0].deterministicRule.unit", StringComparison.Ordinal)),
            Is.True);
    }

    [Test]
    public async Task Post_study_rejects_unknown_json_field()
    {
        await using var factory = new ClinicalTrialsApiFactory();
        var client = factory.CreateClient();
        var payload = """
        {
          "objectives":["o"],
          "endpoints":["e"],
          "inclusionCriteria":[{"description":"d","deterministicRule":{"dimensionId":"age","operator":">=","value":18,"unit":"years old"}}],
          "exclusionCriteria":[],
          "participants":20,
          "studyType":"parallel",
          "numberOfArms":2,
          "phase":"Phase 2",
          "therapeuticArea":"Oncology",
          "patientPopulation":"Adults",
          "firstPatientFirstVisit":"",
          "lastPatientFirstVisit":"",
          "protocolApprovalDate":"",
          "unknownField": true
        }
        """;
        var response = await client.PostAsync("/api/v1/studies", new StringContent(payload, System.Text.Encoding.UTF8, "application/json"));
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.That(doc.RootElement.GetProperty("message").GetString(), Is.EqualTo("invalid JSON payload"));
    }

    [Test]
    public async Task Get_study_unknown_returns_404_envelope()
    {
        await using var factory = new ClinicalTrialsApiFactory();
        var client = factory.CreateClient();
        var response = await client.GetAsync(new Uri("/api/v1/studies/study-9999", UriKind.Relative));
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.That(doc.RootElement.GetProperty("message").GetString(), Is.EqualTo("study not found"));
    }

    [Test]
    public async Task Put_study_replaces_eligibility()
    {
        await using var factory = new ClinicalTrialsApiFactory();
        var client = factory.CreateClient();
        var id = "study-0001";
        var replacement = new
        {
            objectives = new[] { "new-obj" },
            endpoints = new[] { "new-ep" },
            inclusionCriteria = new[]
            {
                new
                {
                    description = "new",
                    deterministicRule = new
                    {
                        dimensionId = "BMI",
                        @operator = "<",
                        value = 35,
                        unit = "kg/m²",
                    },
                },
            },
            exclusionCriteria = Array.Empty<object>(),
            participants = 99,
            studyType = "crossover",
            numberOfArms = 3,
            phase = "Phase 3",
            therapeuticArea = "Neurology",
            patientPopulation = "Updated",
            firstPatientFirstVisit = "",
            lastPatientFirstVisit = "",
            protocolApprovalDate = "",
        };

        var put = await client.PutAsJsonAsync($"/api/v1/studies/{id}", replacement);
        put.EnsureSuccessStatusCode();
        var get = await client.GetAsync(new Uri($"/api/v1/studies/{id}", UriKind.Relative));
        using var doc = JsonDocument.Parse(await get.Content.ReadAsStringAsync());
        var data = doc.RootElement.GetProperty("data");
        Assert.That(data.GetProperty("objectives")[0].GetString(), Is.EqualTo("new-obj"));
        Assert.That(data.GetProperty("inclusionCriteria")[0].GetProperty("deterministicRule").GetProperty("dimensionId").GetString(), Is.EqualTo("BMI"));
    }

    [Test]
    public async Task Put_eligibility_updates_only_eligibility_fields()
    {
        await using var factory = new ClinicalTrialsApiFactory();
        var client = factory.CreateClient();
        var id = "study-0002";
        var before = JsonDocument.Parse(await (await client.GetAsync($"/api/v1/studies/{id}")).Content.ReadAsStringAsync());
        var objectives = before.RootElement.GetProperty("data").GetProperty("objectives")[0].GetString();

        var eligibility = new
        {
            inclusionCriteria = new[]
            {
                new
                {
                    description = "only eligibility",
                    deterministicRule = new
                    {
                        dimensionId = "weight",
                        @operator = "<=",
                        value = 100,
                        unit = "kg",
                    },
                },
            },
            exclusionCriteria = Array.Empty<object>(),
        };

        var put = await client.PutAsJsonAsync($"/api/v1/studies/{id}/eligibility", eligibility);
        put.EnsureSuccessStatusCode();

        var after = JsonDocument.Parse(await (await client.GetAsync($"/api/v1/studies/{id}")).Content.ReadAsStringAsync());
        var data = after.RootElement.GetProperty("data");
        Assert.That(data.GetProperty("objectives")[0].GetString(), Is.EqualTo(objectives));
        Assert.That(data.GetProperty("inclusionCriteria")[0].GetProperty("description").GetString(), Is.EqualTo("only eligibility"));
        Assert.That(data.GetProperty("inclusionCriteria")[0].GetProperty("deterministicRule").GetProperty("dimensionId").GetString(), Is.EqualTo("weight"));
    }

    [Test]
    public async Task Cors_preflight_lists_allowed_origin_for_configured_host()
    {
        await using var factory = new ClinicalTrialsApiFactory();
        var client = factory.CreateClient();

        var bad = new HttpRequestMessage(HttpMethod.Options, "/api/v1/studies");
        bad.Headers.Add("Origin", "http://evil.example");
        bad.Headers.Add("Access-Control-Request-Method", "GET");
        var badResp = await client.SendAsync(bad);
        Assert.That(badResp.Headers.Contains("Access-Control-Allow-Origin"), Is.False);

        var good = new HttpRequestMessage(HttpMethod.Options, "/api/v1/studies");
        good.Headers.Add("Origin", "http://localhost:5173");
        good.Headers.Add("Access-Control-Request-Method", "GET");
        var goodResp = await client.SendAsync(good);
        Assert.That(goodResp.Headers.TryGetValues("Access-Control-Allow-Origin", out var values), Is.True);
        Assert.That(values, Does.Contain("http://localhost:5173"));
    }

    [Test]
    public async Task Get_openapi_document_contains_expected_paths_and_info()
    {
        await using var factory = new ClinicalTrialsApiFactory();
        var client = factory.CreateClient();
        var response = await client.GetAsync(new Uri("/openapi/v1.json", UriKind.Relative));
        response.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.That(doc.RootElement.GetProperty("info").GetProperty("title").GetString(), Is.EqualTo("Clinical Trials Hub API"));
        Assert.That(doc.RootElement.GetProperty("openapi").GetString(), Does.StartWith("3."));
        var paths = doc.RootElement.GetProperty("paths");
        Assert.Multiple(() =>
        {
            Assert.That(paths.TryGetProperty("/api/v1/studies", out _), Is.True);
            Assert.That(paths.TryGetProperty("/api/v1/studies/{id}", out _), Is.True);
            Assert.That(paths.TryGetProperty("/api/v1/studies/{id}/eligibility", out _), Is.True);
            Assert.That(paths.TryGetProperty("/api/v1/studies/{id}/similar-suggestions", out _), Is.True);
            Assert.That(paths.TryGetProperty("/api/v1/eligibility-dimensions", out _), Is.True);
            Assert.That(paths.TryGetProperty("/health", out _), Is.True);
        });
    }

    [Test]
    public async Task Get_similar_suggestions_unknown_study_returns_404()
    {
        await using var factory = new ClinicalTrialsApiFactory();
        var client = factory.CreateClient();
        var response = await client.GetAsync(new Uri("/api/v1/studies/study-9999/similar-suggestions", UriKind.Relative));
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound));
    }

    [Test]
    public async Task Get_similar_suggestions_invalid_limit_returns_400()
    {
        await using var factory = new ClinicalTrialsApiFactory();
        var client = factory.CreateClient();
        var zero = await client.GetAsync(new Uri("/api/v1/studies/study-0001/similar-suggestions?limit=0", UriKind.Relative));
        Assert.That(zero.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
        var eleven = await client.GetAsync(new Uri("/api/v1/studies/study-0001/similar-suggestions?limit=11", UriKind.Relative));
        Assert.That(eleven.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task Get_similar_suggestions_seeded_corpus_returns_distinct_supplemental_criteria()
    {
        await using var factory = new ClinicalTrialsApiFactory();
        var client = factory.CreateClient();
        var response = await client.GetAsync(new Uri("/api/v1/studies/study-0001/similar-suggestions?limit=3", UriKind.Relative));
        response.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = doc.RootElement.GetProperty("data");
        Assert.That(data.GetArrayLength(), Is.GreaterThanOrEqualTo(1));
        Assert.That(
            data[0].GetProperty("criterion").GetProperty("description").GetString(),
            Does.Contain("supplemental BMI"));
    }

    [Test]
    public async Task Get_similar_suggestions_returns_ranked_suggestions_after_eligibility_distinctness()
    {
        await using var factory = new ClinicalTrialsApiFactory();
        var client = factory.CreateClient();
        var eligibility = new
        {
            inclusionCriteria = new[]
            {
                new
                {
                    description = "Integration unique BMI cap",
                    deterministicRule = new
                    {
                        dimensionId = "BMI",
                        @operator = "<",
                        value = 32,
                        unit = "kg/m²",
                    },
                },
            },
            exclusionCriteria = Array.Empty<object>(),
        };

        // study-0003 shares therapeutic area/phase/type with study-0001 and is ranked before study-0002 for similarity.
        var put = await client.PutAsJsonAsync("/api/v1/studies/study-0003/eligibility", eligibility);
        put.EnsureSuccessStatusCode();

        var response = await client.GetAsync(new Uri("/api/v1/studies/study-0001/similar-suggestions?limit=3", UriKind.Relative));
        response.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var data = doc.RootElement.GetProperty("data");
        Assert.That(data.GetArrayLength(), Is.GreaterThanOrEqualTo(1));
        var first = data[0];
        Assert.That(first.GetProperty("sourceStudyId").GetString(), Is.EqualTo("study-0003"));
        Assert.That(first.GetProperty("group").GetString(), Is.EqualTo("inclusion"));
        Assert.That(
            first.GetProperty("criterion").GetProperty("description").GetString(),
            Does.Contain("Integration unique BMI"));
    }

    [Test]
    public async Task Get_scalar_returns_html()
    {
        await using var factory = new ClinicalTrialsApiFactory();
        var client = factory.CreateClient();
        var response = await client.GetAsync(new Uri("/scalar/v1", UriKind.Relative));
        response.EnsureSuccessStatusCode();
        var media = response.Content.Headers.ContentType?.MediaType;
        Assert.That(media, Does.Contain("html"));
    }
}
