// Package openapi holds directives to regenerate the OpenAPI (Swagger) contract.
// Run from the backend module root: go generate ./...
package openapi

//go:generate go run github.com/swaggo/swag/cmd/swag@v1.16.6 init -g main.go -o docs -d cmd/api,internal/http,internal/domain
