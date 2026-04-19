package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	bootstrap "github.com/mathias/clinical-trials-hub/backend/internal/bootstrap"
	"github.com/mathias/clinical-trials-hub/backend/internal/repository/memory"
	"github.com/mathias/clinical-trials-hub/backend/internal/service"
)

func newTestServer() *Server {
	repo := memory.NewStudyRepository(bootstrap.SeedStudies())
	studyService := service.NewStudyService(repo, service.NewSequentialIDGenerator("study"))
	return NewServer(studyService)
}

func TestListStudies(t *testing.T) {
	t.Parallel()

	server := newTestServer()
	request := httptest.NewRequest(http.MethodGet, "/api/studies", nil)
	recorder := httptest.NewRecorder()

	server.Routes().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
}

func TestListEligibilityDimensions(t *testing.T) {
	t.Parallel()

	server := newTestServer()
	request := httptest.NewRequest(http.MethodGet, "/api/eligibility-dimensions", nil)
	recorder := httptest.NewRecorder()

	server.Routes().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
}

func TestCreateStudyValidationError(t *testing.T) {
	t.Parallel()

	server := newTestServer()
	request := httptest.NewRequest(http.MethodPost, "/api/studies", bytes.NewBufferString("{}"))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	server.Routes().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", recorder.Code)
	}
}

func TestCreateAndGetStudy(t *testing.T) {
	t.Parallel()

	server := newTestServer()
	payload := map[string]any{
		"objectives": []string{"Measure progression-free survival"},
		"endpoints":  []string{"Median progression-free survival at 24 weeks"},
		"inclusionCriteria": []map[string]any{
			criterionPayload("Require age above 18.", "age", ">", 18, "years old"),
			criterionPayload("Require hsCRP above 2 mg/L.", "hsCRP", ">", 2, "mg/L"),
		},
		"exclusionCriteria": []map[string]any{
			criterionPayload("Exclude systolic blood pressure below 95 mmHg.", "SBP", "<", 95, "mmHg"),
		},
		"participants":      72,
		"studyType":         "parallel",
		"numberOfArms":      2,
		"phase":             "Phase II",
		"therapeuticArea":   "Oncology",
		"patientPopulation": "Adults with advanced solid tumors",
	}
	body, _ := json.Marshal(payload)

	createRequest := httptest.NewRequest(http.MethodPost, "/api/studies", bytes.NewReader(body))
	createRequest.Header.Set("Content-Type", "application/json")
	createRecorder := httptest.NewRecorder()
	server.Routes().ServeHTTP(createRecorder, createRequest)

	if createRecorder.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", createRecorder.Code)
	}

	var createResponse struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(createRecorder.Body.Bytes(), &createResponse); err != nil {
		t.Fatalf("expected valid JSON response: %v", err)
	}
	if createResponse.Data.ID == "" {
		t.Fatal("expected created study id")
	}

	getRequest := httptest.NewRequest(http.MethodGet, "/api/studies/"+createResponse.Data.ID, nil)
	getRecorder := httptest.NewRecorder()
	server.Routes().ServeHTTP(getRecorder, getRequest)

	if getRecorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", getRecorder.Code)
	}
}

func TestReplaceStudySuccess(t *testing.T) {
	t.Parallel()

	server := newTestServer()
	payload := map[string]any{
		"objectives": []string{"Updated objective"},
		"endpoints":  []string{"Updated endpoint"},
		"inclusionCriteria": []map[string]any{
			criterionPayload("Require hsCRP above 2 mg/L.", "hsCRP", ">", 2, "mg/L"),
		},
		"exclusionCriteria": []map[string]any{
			criterionPayload("Exclude SBP below 95 mmHg.", "SBP", "<", 95, "mmHg"),
		},
		"participants":      150,
		"studyType":         "parallel",
		"numberOfArms":      3,
		"phase":             "Phase III",
		"therapeuticArea":   "Oncology",
		"patientPopulation": "Adults",
	}
	body, _ := json.Marshal(payload)

	request := httptest.NewRequest(http.MethodPut, "/api/studies/study-0001", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	server.Routes().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}

	var response struct {
		Data struct {
			ID    string `json:"id"`
			Phase string `json:"phase"`
		} `json:"data"`
	}
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("expected valid JSON response: %v", err)
	}
	if response.Data.ID != "study-0001" {
		t.Fatalf("expected id study-0001, got %s", response.Data.ID)
	}
	if response.Data.Phase != "Phase III" {
		t.Fatalf("expected updated phase, got %s", response.Data.Phase)
	}
}

func TestReplaceStudyValidationError(t *testing.T) {
	t.Parallel()

	server := newTestServer()
	request := httptest.NewRequest(http.MethodPut, "/api/studies/study-0001", bytes.NewBufferString("{}"))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	server.Routes().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", recorder.Code)
	}
}

func TestReplaceStudyNotFound(t *testing.T) {
	t.Parallel()

	server := newTestServer()
	payload := map[string]any{
		"objectives": []string{"Updated objective"},
		"endpoints":  []string{"Updated endpoint"},
		"inclusionCriteria": []map[string]any{
			criterionPayload("Require hsCRP above 2 mg/L.", "hsCRP", ">", 2, "mg/L"),
		},
		"exclusionCriteria": []map[string]any{
			criterionPayload("Exclude SBP below 95 mmHg.", "SBP", "<", 95, "mmHg"),
		},
		"participants":      150,
		"studyType":         "parallel",
		"numberOfArms":      3,
		"phase":             "Phase III",
		"therapeuticArea":   "Oncology",
		"patientPopulation": "Adults",
	}
	body, _ := json.Marshal(payload)

	request := httptest.NewRequest(http.MethodPut, "/api/studies/study-missing", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	server.Routes().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", recorder.Code)
	}
}

func TestUpdateStudyEligibility(t *testing.T) {
	t.Parallel()

	server := newTestServer()
	payload := map[string]any{
		"inclusionCriteria": []map[string]any{
			criterionPayload("Require LVEF below 40%.", "LVEF", "<", 40, "%"),
		},
		"exclusionCriteria": []map[string]any{
			criterionPayload("Exclude participants younger than 18.", "age", "<", 18, "years old"),
		},
	}
	body, _ := json.Marshal(payload)

	request := httptest.NewRequest(http.MethodPut, "/api/studies/study-0001/eligibility", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()

	server.Routes().ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", recorder.Code)
	}
}

func criterionPayload(description, dimensionID, operator string, value float64, unit string) map[string]any {
	return map[string]any{
		"description": description,
		"deterministicRule": map[string]any{
			"dimensionId": dimensionID,
			"operator":    operator,
			"value":       value,
			"unit":        unit,
		},
	}
}
