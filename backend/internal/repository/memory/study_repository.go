package memory

import (
	"context"
	"sync"

	"github.com/mathias/clinical-trials-hub/backend/internal/domain"
)

type StudyRepository struct {
	mu      sync.RWMutex
	studies map[string]domain.Study
	order   []string
}

func NewStudyRepository(seed []domain.Study) *StudyRepository {
	repo := &StudyRepository{
		studies: make(map[string]domain.Study),
		order:   make([]string, 0, len(seed)),
	}

	for _, study := range seed {
		repo.studies[study.ID] = cloneStudy(study)
		repo.order = append(repo.order, study.ID)
	}

	return repo
}

func (r *StudyRepository) Create(_ context.Context, study domain.Study) (domain.Study, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.studies[study.ID] = cloneStudy(study)
	r.order = append(r.order, study.ID)

	return cloneStudy(study), nil
}

func (r *StudyRepository) List(_ context.Context) ([]domain.Study, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	list := make([]domain.Study, 0, len(r.order))
	for _, id := range r.order {
		list = append(list, cloneStudy(r.studies[id]))
	}

	return list, nil
}

func (r *StudyRepository) GetByID(_ context.Context, id string) (domain.Study, bool, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	study, ok := r.studies[id]
	if !ok {
		return domain.Study{}, false, nil
	}

	return cloneStudy(study), true, nil
}

func cloneStudy(study domain.Study) domain.Study {
	return domain.Study{
		ID:                study.ID,
		Objectives:        append([]string(nil), study.Objectives...),
		Endpoints:         append([]string(nil), study.Endpoints...),
		InclusionCriteria: append([]string(nil), study.InclusionCriteria...),
		ExclusionCriteria: append([]string(nil), study.ExclusionCriteria...),
		Participants:      study.Participants,
		StudyType:         study.StudyType,
		NumberOfArms:      study.NumberOfArms,
		Phase:             study.Phase,
		TherapeuticArea:   study.TherapeuticArea,
		PatientPopulation: study.PatientPopulation,
	}
}
