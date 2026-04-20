import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import {
  PHASE_OPTIONS,
  STUDY_TYPE_OPTIONS,
  THERAPEUTIC_AREA_OPTIONS,
  type PhaseOption,
  type StudyTypeOption,
  type TherapeuticAreaOption,
} from '../sections/constants'
import type { Study } from '../types'

interface AllStudiesPageProps {
  studies: Study[]
  isLoadingList: boolean
  loadError: string
  onRefreshStudies: () => Promise<Study[]>
}

export function AllStudiesPage({
  studies,
  isLoadingList,
  loadError,
  onRefreshStudies,
}: AllStudiesPageProps) {
  const navigate = useNavigate()
  const [idQuery, setIdQuery] = useState('')
  const [therapeuticArea, setTherapeuticArea] = useState<'All' | TherapeuticAreaOption>('All')
  const [phase, setPhase] = useState<'All' | PhaseOption>('All')
  const [studyType, setStudyType] = useState<'All' | StudyTypeOption>('All')

  const filteredStudies = useMemo(() => {
    const q = idQuery.trim().toLowerCase()
    return studies.filter((study) => {
      const idOk = q === '' || study.id.toLowerCase().includes(q)
      const areaOk = therapeuticArea === 'All' || study.therapeuticArea === therapeuticArea
      const phaseOk = phase === 'All' || study.phase === phase
      const typeOk = studyType === 'All' || study.studyType === studyType
      return idOk && areaOk && phaseOk && typeOk
    })
  }, [studies, idQuery, therapeuticArea, phase, studyType])

  const hasActiveFilter =
    idQuery.trim() !== '' ||
    therapeuticArea !== 'All' ||
    phase !== 'All' ||
    studyType !== 'All'

  useEffect(() => {
    void onRefreshStudies()
  }, [onRefreshStudies])

  function clearFilters() {
    setIdQuery('')
    setTherapeuticArea('All')
    setPhase('All')
    setStudyType('All')
  }

  return (
    <div className="page">
      <section className="page-header">
        <div>
          <p className="subtitle">
            Review registered studies and start a new study registration.
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="submit-button"
            onClick={() => navigate('/studies/new/study-information')}
          >
            New study
          </button>
        </div>
      </section>

      <section className="panel">
        <header className="panel-header">
          <h2>Registered studies</h2>
          <span className="panel-badge">
            {hasActiveFilter
              ? `${filteredStudies.length} of ${studies.length} studies`
              : `${studies.length} studies`}
          </span>
        </header>

        {loadError ? <p className="error-message">{loadError}</p> : null}

        {isLoadingList ? <p>Loading studies...</p> : null}
        {!isLoadingList && studies.length === 0 ? (
          <p>No studies available yet. Click "New study" to start a registration.</p>
        ) : null}

        {studies.length > 0 ? (
          <>
            <div className="study-filter-bar">
              <div className="filter-field">
                <label htmlFor="all-studies-filter-study-id">Study ID</label>
                <input
                  id="all-studies-filter-study-id"
                  type="search"
                  placeholder="Search by study ID"
                  value={idQuery}
                  onChange={(e) => setIdQuery(e.target.value)}
                />
              </div>
              <div className="filter-field">
                <label htmlFor="all-studies-filter-therapeutic-area">Therapeutic area</label>
                <select
                  id="all-studies-filter-therapeutic-area"
                  value={therapeuticArea}
                  onChange={(e) =>
                    setTherapeuticArea(e.target.value as 'All' | TherapeuticAreaOption)
                  }
                >
                  <option value="All">All</option>
                  {THERAPEUTIC_AREA_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-field">
                <label htmlFor="all-studies-filter-phase">Phase</label>
                <select
                  id="all-studies-filter-phase"
                  value={phase}
                  onChange={(e) => setPhase(e.target.value as 'All' | PhaseOption)}
                >
                  <option value="All">All</option>
                  {PHASE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-field">
                <label htmlFor="all-studies-filter-study-type">Study type</label>
                <select
                  id="all-studies-filter-study-type"
                  value={studyType}
                  onChange={(e) => setStudyType(e.target.value as 'All' | StudyTypeOption)}
                >
                  <option value="All">All</option>
                  {STUDY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              {hasActiveFilter ? (
                <div className="study-filter-bar-actions">
                  <button type="button" className="study-filter-clear" onClick={clearFilters}>
                    Clear filters
                  </button>
                </div>
              ) : null}
            </div>
            {!isLoadingList && studies.length > 0 && filteredStudies.length === 0 ? (
              <p className="study-filter-empty">No studies match the current filters.</p>
            ) : null}
          </>
        ) : null}

        <ul className="study-card-list">
          {filteredStudies.map((study) => {
            const hasTherapeuticArea = study.therapeuticArea !== ''
            const hasPatientPopulation = study.patientPopulation !== ''
            const hasFpfv = study.firstPatientFirstVisit !== ''
            const criteriaCount =
              study.inclusionCriteria.length + study.exclusionCriteria.length

            return (
              <li key={study.id}>
                <Link className="study-card" to={`/studies/${study.id}/summary`}>
                  <div className="study-card-identity">
                    <strong>{study.id}</strong>
                    <span className="study-card-phase">{study.phase}</span>
                  </div>
                  {hasTherapeuticArea || hasPatientPopulation ? (
                    <div className="study-card-clinical">
                      {hasTherapeuticArea ? (
                        <span title={study.therapeuticArea}>{study.therapeuticArea}</span>
                      ) : null}
                      {hasTherapeuticArea && hasPatientPopulation ? (
                        <span className="study-card-separator" aria-hidden="true">
                          {' · '}
                        </span>
                      ) : null}
                      {hasPatientPopulation ? (
                        <span title={study.patientPopulation}>{study.patientPopulation}</span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="study-card-metadata">
                    <span>{study.studyType}</span>
                    <span>{study.participants} participants</span>
                    <span>{study.numberOfArms} arms</span>
                    <span>{criteriaCount} criteria</span>
                    {hasFpfv ? (
                      <span
                        title={`First patient, first visit: ${study.firstPatientFirstVisit}`}
                      >
                        FPFV {study.firstPatientFirstVisit}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
