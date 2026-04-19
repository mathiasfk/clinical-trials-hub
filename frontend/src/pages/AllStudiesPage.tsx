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
          {studies.map((study) => (
            <li key={study.id}>
              <Link className="study-card" to={`/studies/${study.id}/summary`}>
                <span className="study-card-phase">{study.phase}</span>
                <strong>{study.id}</strong>
                <span>{study.therapeuticArea}</span>
                <span>{study.patientPopulation}</span>
                <div className="study-card-metadata">
                  <span>{study.participants} participants</span>
                  <span>{study.numberOfArms} arms</span>
                  <span>
                    {study.inclusionCriteria.length + study.exclusionCriteria.length} criteria
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
