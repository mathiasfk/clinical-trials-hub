// Package main is the HTTP API entrypoint for the Clinical Trials Hub backend.
//
// @title                       Clinical Trials Hub API
// @version                     1.0
// @description                 Study registration HTTP API for the Clinical Trials Hub MVP. OpenAPI artifacts are generated under `backend/docs/` for consumers (for example .NET NSwag or Swashbuckle).
// @host                        localhost:8080
// @BasePath                    /
// @schemes                     http
package main

import (
	"log"
	"net/http"
	"os"

	bootstrap "github.com/mathias/clinical-trials-hub/backend/internal/bootstrap"
	transport "github.com/mathias/clinical-trials-hub/backend/internal/http"
	"github.com/mathias/clinical-trials-hub/backend/internal/repository/memory"
	"github.com/mathias/clinical-trials-hub/backend/internal/service"
)

func main() {
	repository := memory.NewStudyRepository(bootstrap.SeedStudies())
	idGenerator := service.NewRepositoryAwareIDGenerator("study", repository)
	studyService := service.NewStudyService(repository, idGenerator)
	server := transport.NewServer(studyService)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("server listening on :%s", port)
	if err := http.ListenAndServe(":"+port, server.Routes()); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
