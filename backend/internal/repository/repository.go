package repository

import (
	"context"

	"github.com/mathias/clinical-trials-hub/backend/internal/domain"
)

type StudyRepository interface {
	Create(ctx context.Context, study domain.Study) (domain.Study, error)
	List(ctx context.Context) ([]domain.Study, error)
	GetByID(ctx context.Context, id string) (domain.Study, bool, error)
}
