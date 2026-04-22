package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	_ "github.com/mathias/clinical-trials-hub/backend/docs" // Registers OpenAPI spec for Swagger UI.
	"github.com/mathias/clinical-trials-hub/backend/internal/domain"
	"github.com/mathias/clinical-trials-hub/backend/internal/service"
	httpSwagger "github.com/swaggo/http-swagger"
)

type Server struct {
	studyService *service.StudyService
}

func NewServer(studyService *service.StudyService) *Server {
	return &Server{studyService: studyService}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.handleHealth)
	mux.HandleFunc("/api/eligibility-dimensions", s.handleEligibilityDimensions)
	mux.HandleFunc("/api/studies", s.handleStudies)
	mux.HandleFunc("/api/studies/", s.handleStudyRoute)
	mux.Handle("/swagger/", httpSwagger.WrapHandler)

	return withCORS(mux)
}

// handleHealth godoc
// @Summary      Health check
// @Description  Liveness probe for the API process.
// @Tags         health
// @Produce      json
// @Success      200  {object}  HealthResponse
// @Router       /health [get]
func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, HealthResponse{Status: "ok"})
}

func (s *Server) handleStudies(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.listStudies(w, r)
	case http.MethodPost:
		s.createStudy(w, r)
	default:
		writeMethodNotAllowed(w)
	}
}

// listStudies godoc
// @Summary      List studies
// @Description  Returns all registered studies.
// @Tags         studies
// @Produce      json
// @Success      200  {object}  StudyListResponse
// @Failure      500  {object}  ErrorResponse
// @Router       /api/studies [get]
func (s *Server) listStudies(w http.ResponseWriter, r *http.Request) {
	studies, err := s.studyService.ListStudies(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list studies", nil)
		return
	}

	writeJSON(w, http.StatusOK, StudyListResponse{Data: studies})
}

// createStudy godoc
// @Summary      Create study
// @Description  Creates a new study from a full registration payload. Unknown JSON fields are rejected.
// @Tags         studies
// @Accept       json
// @Produce      json
// @Param        body  body      domain.StudyCreateInput  true  "Registration payload"
// @Success      201   {object}  StudyResponse
// @Failure      400   {object}  ErrorResponse  "Invalid JSON or validation error"
// @Failure      500   {object}  ErrorResponse
// @Router       /api/studies [post]
func (s *Server) createStudy(w http.ResponseWriter, r *http.Request) {
	var payload domain.StudyCreateInput
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON payload", nil)
		return
	}

	study, err := s.studyService.CreateStudy(r.Context(), payload)
	if err != nil {
		var validationErr *service.ValidationError
		if errors.As(err, &validationErr) {
			writeError(w, http.StatusBadRequest, "validation failed", validationErr.Fields)
			return
		}

		writeError(w, http.StatusInternalServerError, "failed to create study", nil)
		return
	}

	writeJSON(w, http.StatusCreated, StudyResponse{Data: study})
}

// handleEligibilityDimensions godoc
// @Summary      List eligibility dimensions
// @Description  Returns deterministic-rule dimension metadata (IDs, display names, allowed units).
// @Tags         eligibility
// @Produce      json
// @Success      200  {object}  DimensionsResponse
// @Failure      405  {object}  ErrorResponse
// @Router       /api/eligibility-dimensions [get]
func (s *Server) handleEligibilityDimensions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w)
		return
	}

	writeJSON(w, http.StatusOK, DimensionsResponse{Data: s.studyService.GetEligibilityDimensions()})
}

func (s *Server) handleStudyRoute(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/studies/")
	if strings.HasSuffix(path, "/eligibility") {
		s.handleStudyEligibility(w, r)
		return
	}

	s.handleStudyByID(w, r)
}

func (s *Server) handleStudyByID(w http.ResponseWriter, r *http.Request) {
	id := studyPathID(r)
	if strings.TrimSpace(id) == "" {
		writeError(w, http.StatusBadRequest, "study id is required", nil)
		return
	}

	switch r.Method {
	case http.MethodGet:
		s.getStudyByID(w, r)
	case http.MethodPut:
		s.replaceStudy(w, r)
	default:
		writeMethodNotAllowed(w)
	}
}

// studyPathID returns the study id segment for /api/studies/{id} (not /eligibility).
func studyPathID(r *http.Request) string {
	path := strings.TrimPrefix(r.URL.Path, "/api/studies/")
	path = strings.Trim(path, "/")
	if strings.HasSuffix(path, "/eligibility") {
		path = strings.TrimSuffix(path, "/eligibility")
		path = strings.Trim(path, "/")
	}
	return path
}

// getStudyByID godoc
// @Summary      Get study by ID
// @Description  Returns a single study including eligibility criteria.
// @Tags         studies
// @Produce      json
// @Param        id   path      string  true  "Study ID"
// @Success      200  {object}  StudyResponse
// @Failure      400  {object}  ErrorResponse
// @Failure      404  {object}  ErrorResponse
// @Failure      500  {object}  ErrorResponse
// @Router       /api/studies/{id} [get]
func (s *Server) getStudyByID(w http.ResponseWriter, r *http.Request) {
	id := studyPathID(r)
	if strings.TrimSpace(id) == "" {
		writeError(w, http.StatusBadRequest, "study id is required", nil)
		return
	}

	study, found, err := s.studyService.GetStudyByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read study", nil)
		return
	}
	if !found {
		writeError(w, http.StatusNotFound, "study not found", nil)
		return
	}

	writeJSON(w, http.StatusOK, StudyResponse{Data: study})
}

// replaceStudy godoc
// @Summary      Replace study registration
// @Description  Replaces the full registration payload for an existing study. Unknown JSON fields are rejected.
// @Tags         studies
// @Accept       json
// @Produce      json
// @Param        id    path      string                   true  "Study ID"
// @Param        body  body      domain.StudyCreateInput  true  "Registration payload"
// @Success      200   {object}  StudyResponse
// @Failure      400   {object}  ErrorResponse  "Invalid JSON or validation error"
// @Failure      404   {object}  ErrorResponse
// @Failure      500   {object}  ErrorResponse
// @Router       /api/studies/{id} [put]
func (s *Server) replaceStudy(w http.ResponseWriter, r *http.Request) {
	id := studyPathID(r)
	if strings.TrimSpace(id) == "" {
		writeError(w, http.StatusBadRequest, "study id is required", nil)
		return
	}

	var payload domain.StudyCreateInput
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON payload", nil)
		return
	}

	study, err := s.studyService.ReplaceStudy(r.Context(), id, payload)
	if err != nil {
		var validationErr *service.ValidationError
		if errors.As(err, &validationErr) {
			writeError(w, http.StatusBadRequest, "validation failed", validationErr.Fields)
			return
		}

		var notFoundErr *service.NotFoundError
		if errors.As(err, &notFoundErr) {
			writeError(w, http.StatusNotFound, err.Error(), nil)
			return
		}

		writeError(w, http.StatusInternalServerError, "failed to replace study", nil)
		return
	}

	writeJSON(w, http.StatusOK, StudyResponse{Data: study})
}

// handleStudyEligibility godoc
// @Summary      Update study eligibility
// @Description  Updates inclusion and exclusion criteria only for an existing study.
// @Tags         studies
// @Accept       json
// @Produce      json
// @Param        id    path      string                      true  "Study ID"
// @Param        body  body      domain.StudyEligibilityInput  true  "Eligibility payload"
// @Success      200   {object}  StudyResponse
// @Failure      400   {object}  ErrorResponse  "Invalid JSON or validation error"
// @Failure      404   {object}  ErrorResponse
// @Failure      405   {object}  ErrorResponse
// @Failure      500   {object}  ErrorResponse
// @Router       /api/studies/{id}/eligibility [put]
func (s *Server) handleStudyEligibility(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		writeMethodNotAllowed(w)
		return
	}

	id := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/studies/"), "/eligibility")
	id = strings.TrimSuffix(id, "/")
	if strings.TrimSpace(id) == "" {
		writeError(w, http.StatusBadRequest, "study id is required", nil)
		return
	}

	var payload domain.StudyEligibilityInput
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON payload", nil)
		return
	}

	study, err := s.studyService.UpdateStudyEligibility(r.Context(), id, payload)
	if err != nil {
		var validationErr *service.ValidationError
		if errors.As(err, &validationErr) {
			writeError(w, http.StatusBadRequest, "validation failed", validationErr.Fields)
			return
		}

		var notFoundErr *service.NotFoundError
		if errors.As(err, &notFoundErr) {
			writeError(w, http.StatusNotFound, err.Error(), nil)
			return
		}

		writeError(w, http.StatusInternalServerError, "failed to update study eligibility", nil)
		return
	}

	writeJSON(w, http.StatusOK, StudyResponse{Data: study})
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func writeMethodNotAllowed(w http.ResponseWriter) {
	writeError(w, http.StatusMethodNotAllowed, "method not allowed", nil)
}

func writeError(w http.ResponseWriter, status int, message string, validationErrors map[string]string) {
	payload := ErrorResponse{
		Message: message,
		Errors:  validationErrors,
	}

	writeJSON(w, status, payload)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
