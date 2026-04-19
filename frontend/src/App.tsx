import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { createStudy, getStudyById, listStudies } from './api'
import './App.css'
import type { ApiErrorResponse, Study, StudyCreateInput, StudyType } from './types'

interface FormState {
  objectivesText: string
  endpointsText: string
  inclusionCriteriaText: string
  exclusionCriteriaText: string
  participants: string
  studyType: StudyType
  numberOfArms: string
  phase: string
  therapeuticArea: string
  patientPopulation: string
}

const DEFAULT_FORM_STATE: FormState = {
  objectivesText: '',
  endpointsText: '',
  inclusionCriteriaText: '',
  exclusionCriteriaText: '',
  participants: '',
  studyType: 'parallel',
  numberOfArms: '',
  phase: '',
  therapeuticArea: '',
  patientPopulation: '',
}

function parseList(text: string): string[] {
  return text
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function App() {
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE)
  const [studies, setStudies] = useState<Study[]>([])
  const [selectedStudyId, setSelectedStudyId] = useState<string>('')
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null)
  const [loadError, setLoadError] = useState<string>('')
  const [submitError, setSubmitError] = useState<string>('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState<string>('')

  async function refreshStudies(preserveSelection = true): Promise<Study[]> {
    setIsLoadingList(true)
    setLoadError('')

    try {
      const loadedStudies = await listStudies()
      setStudies(loadedStudies)
      if (!preserveSelection) {
        setSelectedStudyId('')
        setSelectedStudy(null)
      }

      return loadedStudies
    } catch (error) {
      setLoadError(extractErrorMessage(error, 'Failed to load studies.'))
      return []
    } finally {
      setIsLoadingList(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshStudies()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!selectedStudyId) {
      return
    }

    const timer = window.setTimeout(() => {
      setIsLoadingDetail(true)
      setLoadError('')

      void getStudyById(selectedStudyId)
        .then((study) => {
          setSelectedStudy(study)
        })
        .catch((error) => {
          setSelectedStudy(null)
          setLoadError(extractErrorMessage(error, 'Failed to load study details.'))
        })
        .finally(() => {
          setIsLoadingDetail(false)
        })
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [selectedStudyId])

  const sortedStudies = useMemo(() => [...studies].reverse(), [studies])

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setFormState((current) => ({ ...current, [field]: value }))
  }

  async function handleCreateStudy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')
    setSuccessMessage('')
    setValidationErrors({})
    setIsCreating(true)

    const payload: StudyCreateInput = {
      objectives: parseList(formState.objectivesText),
      endpoints: parseList(formState.endpointsText),
      inclusionCriteria: parseList(formState.inclusionCriteriaText),
      exclusionCriteria: parseList(formState.exclusionCriteriaText),
      participants: Number(formState.participants),
      studyType: formState.studyType,
      numberOfArms: Number(formState.numberOfArms),
      phase: formState.phase.trim(),
      therapeuticArea: formState.therapeuticArea.trim(),
      patientPopulation: formState.patientPopulation.trim(),
    }

    try {
      const createdStudy = await createStudy(payload)
      await refreshStudies()
      setSelectedStudyId(createdStudy.id)
      setSuccessMessage(`Study ${createdStudy.id} created successfully.`)
      setFormState(DEFAULT_FORM_STATE)
    } catch (error) {
      const apiError = error as ApiErrorResponse
      setSubmitError(extractErrorMessage(error, 'Failed to create study.'))
      setValidationErrors(apiError.errors ?? {})
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <main className="page">
      <section className="panel">
        <h1>Clinical Study Registration MVP</h1>
        <p className="subtitle">
          Register studies with the required MVP fields and review in-memory seeded data.
        </p>

        <form className="form-grid" onSubmit={handleCreateStudy}>
          <label htmlFor="objectivesText">Objectives (comma or new line separated)</label>
          <textarea
            id="objectivesText"
            value={formState.objectivesText}
            onChange={(event) => updateField('objectivesText', event.target.value)}
          />
          <FieldError message={validationErrors.objectives} />

          <label htmlFor="endpointsText">Endpoints (comma or new line separated)</label>
          <textarea
            id="endpointsText"
            value={formState.endpointsText}
            onChange={(event) => updateField('endpointsText', event.target.value)}
          />
          <FieldError message={validationErrors.endpoints} />

          <label htmlFor="inclusionCriteriaText">Inclusion criteria (comma or new line separated)</label>
          <textarea
            id="inclusionCriteriaText"
            value={formState.inclusionCriteriaText}
            onChange={(event) => updateField('inclusionCriteriaText', event.target.value)}
          />
          <FieldError message={validationErrors.inclusionCriteria} />

          <label htmlFor="exclusionCriteriaText">Exclusion criteria (comma or new line separated)</label>
          <textarea
            id="exclusionCriteriaText"
            value={formState.exclusionCriteriaText}
            onChange={(event) => updateField('exclusionCriteriaText', event.target.value)}
          />
          <FieldError message={validationErrors.exclusionCriteria} />

          <label htmlFor="participants">Number of participants</label>
          <input
            id="participants"
            type="number"
            min={1}
            value={formState.participants}
            onChange={(event) => updateField('participants', event.target.value)}
          />
          <FieldError message={validationErrors.participants} />

          <label htmlFor="studyType">Study type</label>
          <select
            id="studyType"
            value={formState.studyType}
            onChange={(event) => updateField('studyType', event.target.value as StudyType)}
          >
            <option value="parallel">parallel</option>
            <option value="crossover">crossover</option>
            <option value="single-arm">single-arm</option>
          </select>
          <FieldError message={validationErrors.studyType} />

          <label htmlFor="numberOfArms">Number of arms</label>
          <input
            id="numberOfArms"
            type="number"
            min={1}
            value={formState.numberOfArms}
            onChange={(event) => updateField('numberOfArms', event.target.value)}
          />
          <FieldError message={validationErrors.numberOfArms} />

          <label htmlFor="phase">Phase</label>
          <input
            id="phase"
            type="text"
            value={formState.phase}
            onChange={(event) => updateField('phase', event.target.value)}
          />
          <FieldError message={validationErrors.phase} />

          <label htmlFor="therapeuticArea">Therapeutic area</label>
          <input
            id="therapeuticArea"
            type="text"
            value={formState.therapeuticArea}
            onChange={(event) => updateField('therapeuticArea', event.target.value)}
          />
          <FieldError message={validationErrors.therapeuticArea} />

          <label htmlFor="patientPopulation">Patient population</label>
          <input
            id="patientPopulation"
            type="text"
            value={formState.patientPopulation}
            onChange={(event) => updateField('patientPopulation', event.target.value)}
          />
          <FieldError message={validationErrors.patientPopulation} />

          <button className="submit-button" type="submit" disabled={isCreating}>
            {isCreating ? 'Creating study...' : 'Create study'}
          </button>

          {submitError ? <p className="error-message">{submitError}</p> : null}
          {successMessage ? <p className="success-message">{successMessage}</p> : null}
        </form>
      </section>

      <section className="panel studies-panel">
        <header className="panel-header">
          <h2>Registered studies</h2>
          <button type="button" onClick={() => void refreshStudies()} disabled={isLoadingList}>
            {isLoadingList ? 'Refreshing...' : 'Refresh'}
          </button>
        </header>

        {loadError ? <p className="error-message">{loadError}</p> : null}

        <div className="studies-layout">
          <div>
            <ul className="study-list">
              {sortedStudies.map((study) => (
                <li key={study.id}>
                  <button
                    className={selectedStudyId === study.id ? 'active' : ''}
                    type="button"
                    onClick={() => setSelectedStudyId(study.id)}
                  >
                    <strong>{study.id}</strong>
                    <span>{study.therapeuticArea}</span>
                    <span>{study.phase}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <article className="study-detail">
            {isLoadingDetail ? <p>Loading details...</p> : null}
            {!selectedStudyId ? <p>Select a study to inspect details.</p> : null}
            {selectedStudy ? (
              <>
                <h3>{selectedStudy.id}</h3>
                <p>
                  <strong>Participants:</strong> {selectedStudy.participants}
                </p>
                <p>
                  <strong>Study type:</strong> {selectedStudy.studyType}
                </p>
                <p>
                  <strong>Number of arms:</strong> {selectedStudy.numberOfArms}
                </p>
                <p>
                  <strong>Phase:</strong> {selectedStudy.phase}
                </p>
                <p>
                  <strong>Therapeutic area:</strong> {selectedStudy.therapeuticArea}
                </p>
                <p>
                  <strong>Patient population:</strong> {selectedStudy.patientPopulation}
                </p>
                <DetailList title="Objectives" items={selectedStudy.objectives} />
                <DetailList title="Endpoints" items={selectedStudy.endpoints} />
                <DetailList title="Inclusion criteria" items={selectedStudy.inclusionCriteria} />
                <DetailList title="Exclusion criteria" items={selectedStudy.exclusionCriteria} />
              </>
            ) : null}
          </article>
        </div>
      </section>
    </main>
  )
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <p className="field-error">{message}</p>
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }

  return fallback
}

export default App
