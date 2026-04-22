package http

import "github.com/mathias/clinical-trials-hub/backend/internal/domain"

// HealthResponse is the JSON body for GET /health.
type HealthResponse struct {
	Status string `json:"status" example:"ok"`
}

// StudyListResponse wraps a list of studies for OpenAPI and JSON responses.
type StudyListResponse struct {
	Data []domain.Study `json:"data"`
}

// StudyResponse wraps a single study for OpenAPI and JSON responses.
type StudyResponse struct {
	Data domain.Study `json:"data"`
}

// DimensionsResponse wraps eligibility dimension definitions.
type DimensionsResponse struct {
	Data []domain.DimensionDefinition `json:"data"`
}

// ErrorResponse is the JSON body for API errors.
type ErrorResponse struct {
	Message string            `json:"message"`
	Errors  map[string]string `json:"errors,omitempty"`
}
