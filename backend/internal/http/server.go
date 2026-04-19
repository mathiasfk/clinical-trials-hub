package http

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/mathias/clinical-trials-hub/backend/internal/domain"
	"github.com/mathias/clinical-trials-hub/backend/internal/service"
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

	return withCORS(mux)
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
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

func (s *Server) listStudies(w http.ResponseWriter, r *http.Request) {
	studies, err := s.studyService.ListStudies(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list studies", nil)
		return
	}

	writeJSON(w, http.StatusOK, map[string][]domain.Study{"data": studies})
}

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

	writeJSON(w, http.StatusCreated, map[string]domain.Study{"data": study})
}

func (s *Server) handleEligibilityDimensions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeMethodNotAllowed(w)
		return
	}

	writeJSON(w, http.StatusOK, map[string][]domain.DimensionDefinition{
		"data": s.studyService.GetEligibilityDimensions(),
	})
}

func (s *Server) handleStudyRoute(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/studies/")
	if strings.HasSuffix(path, "/eligibility") {
		s.handleStudyEligibility(w, r)
		return
	}

	s.handleStudyByID(w, r, path)
}

func (s *Server) handleStudyByID(w http.ResponseWriter, r *http.Request, id string) {
	if strings.TrimSpace(id) == "" {
		writeError(w, http.StatusBadRequest, "study id is required", nil)
		return
	}

	switch r.Method {
	case http.MethodGet:
		s.getStudyByID(w, r, id)
	case http.MethodPut:
		s.replaceStudy(w, r, id)
	default:
		writeMethodNotAllowed(w)
	}
}

func (s *Server) getStudyByID(w http.ResponseWriter, r *http.Request, id string) {
	study, found, err := s.studyService.GetStudyByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read study", nil)
		return
	}
	if !found {
		writeError(w, http.StatusNotFound, "study not found", nil)
		return
	}

	writeJSON(w, http.StatusOK, map[string]domain.Study{"data": study})
}

func (s *Server) replaceStudy(w http.ResponseWriter, r *http.Request, id string) {
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

	writeJSON(w, http.StatusOK, map[string]domain.Study{"data": study})
}

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

	writeJSON(w, http.StatusOK, map[string]domain.Study{"data": study})
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
	payload := map[string]any{
		"message": message,
	}
	if len(validationErrors) > 0 {
		payload["errors"] = validationErrors
	}

	writeJSON(w, status, payload)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
