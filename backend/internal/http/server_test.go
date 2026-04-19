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
		"objectives":        []string{"Measure progression-free survival"},
		"endpoints":         []string{"Median progression-free survival at 24 weeks"},
		"inclusionCriteria": []string{"Age >= 18 years", "Histologically confirmed disease"},
		"exclusionCriteria": []string{"Recent major surgery", "Uncontrolled infection"},
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
