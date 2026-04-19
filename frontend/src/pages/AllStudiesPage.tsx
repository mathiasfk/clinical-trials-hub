import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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

  useEffect(() => {
    void onRefreshStudies()
  }, [onRefreshStudies])

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
          <span className="panel-badge">{studies.length} studies</span>
        </header>

        {loadError ? <p className="error-message">{loadError}</p> : null}

        {isLoadingList ? <p>Loading studies...</p> : null}
        {!isLoadingList && studies.length === 0 ? (
          <p>No studies available yet. Click "New study" to start a registration.</p>
        ) : null}

        <ul className="study-card-list">
          {studies.map((study) => {
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
