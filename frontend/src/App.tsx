import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'

import {
  createStudy,
  getStudyById,
  listEligibilityDimensions,
  listStudies,
  updateStudyEligibility,
} from './api'
import './App.css'
import type {
  ApiErrorResponse,
  EligibilityCriterion,
  EligibilityDimension,
  Study,
  StudyCreateInput,
  StudyEligibilityInput,
  StudyType,
} from './types'

interface FormState {
  objectivesText: string
  endpointsText: string
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
  participants: '',
  studyType: 'parallel',
  numberOfArms: '',
  phase: '',
  therapeuticArea: '',
  patientPopulation: '',
}

type RuleOperator = EligibilityCriterion['deterministicRule']['operator']

interface CriterionDraft {
  description: string
  dimensionId: string
  operator: RuleOperator
  value: string
  unit: string
}

interface WorkspaceContextValue {
  study: Study | null
  isLoadingStudy: boolean
  loadError: string
  reloadStudy: () => Promise<void>
  updateStudyInList: (study: Study) => void
}

const RULE_OPERATORS: RuleOperator[] = ['>', '>=', '<', '<=', '=', '!=']

function parseList(text: string): string[] {
  return text
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function App() {
  const [studies, setStudies] = useState<Study[]>([])
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [loadError, setLoadError] = useState<string>('')
  const [dimensions, setDimensions] = useState<EligibilityDimension[]>([])
  const [isLoadingDimensions, setIsLoadingDimensions] = useState(true)
  const [dimensionsError, setDimensionsError] = useState<string>('')

  const refreshStudies = useCallback(async (): Promise<Study[]> => {
    setIsLoadingList(true)
    setLoadError('')

    try {
      const loadedStudies = await listStudies()
      setStudies(loadedStudies)
      return loadedStudies
    } catch (error) {
      setLoadError(extractErrorMessage(error, 'Failed to load studies.'))
      return []
    } finally {
      setIsLoadingList(false)
    }
  }, [])

  const refreshDimensions = useCallback(async (): Promise<EligibilityDimension[]> => {
    setIsLoadingDimensions(true)
    setDimensionsError('')

    try {
      const loadedDimensions = await listEligibilityDimensions()
      setDimensions(loadedDimensions)
      return loadedDimensions
    } catch (error) {
      setDimensionsError(extractErrorMessage(error, 'Failed to load eligibility dimensions.'))
      return []
    } finally {
      setIsLoadingDimensions(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshStudies()
      void refreshDimensions()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [refreshDimensions, refreshStudies])

  const sortedStudies = useMemo(() => [...studies].reverse(), [studies])

  const upsertStudyInList = useCallback((study: Study) => {
    setStudies((currentStudies) => {
      const existingIndex = currentStudies.findIndex((currentStudy) => currentStudy.id === study.id)
      if (existingIndex === -1) {
        return [...currentStudies, study]
      }

      return currentStudies.map((currentStudy) => (currentStudy.id === study.id ? study : currentStudy))
    })
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/studies" replace />} />
        <Route
          path="/studies"
          element={
            <AllStudiesPage
              studies={sortedStudies}
              dimensions={dimensions}
              isLoadingList={isLoadingList}
              isLoadingDimensions={isLoadingDimensions}
              loadError={loadError}
              dimensionsError={dimensionsError}
              onRefreshStudies={refreshStudies}
              onRefreshDimensions={refreshDimensions}
              onStudyCreated={upsertStudyInList}
            />
          }
        />
        <Route
          path="/studies/:studyId"
          element={<StudyWorkspace onStudyUpdated={upsertStudyInList} />}
        >
          <Route index element={<Navigate to="summary" replace />} />
          <Route path="summary" element={<StudySummaryPage dimensions={dimensions} />} />
          <Route
            path="eligibility"
            element={
              <EligibilityCriteriaPage
                dimensions={dimensions}
                isLoadingDimensions={isLoadingDimensions}
                dimensionsError={dimensionsError}
                onRefreshDimensions={refreshDimensions}
              />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function AllStudiesPage({
  studies,
  dimensions,
  isLoadingList,
  isLoadingDimensions,
  loadError,
  dimensionsError,
  onRefreshStudies,
  onRefreshDimensions,
  onStudyCreated,
}: {
  studies: Study[]
  dimensions: EligibilityDimension[]
  isLoadingList: boolean
  isLoadingDimensions: boolean
  loadError: string
  dimensionsError: string
  onRefreshStudies: () => Promise<Study[]>
  onRefreshDimensions: () => Promise<EligibilityDimension[]>
  onStudyCreated: (study: Study) => void
}) {
  return (
    <main className="page">
      <section className="page-header">
        <div>
          <p className="eyebrow">Study registration</p>
          <h1>All studies</h1>
          <p className="subtitle">
            Review registered studies, create a new one, and open each study workspace.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" onClick={() => void onRefreshStudies()} disabled={isLoadingList}>
            {isLoadingList ? 'Refreshing studies...' : 'Refresh studies'}
          </button>
          <button
            type="button"
            onClick={() => void onRefreshDimensions()}
            disabled={isLoadingDimensions}
          >
            {isLoadingDimensions ? 'Refreshing dimensions...' : 'Refresh dimensions'}
          </button>
        </div>
      </section>

      <div className="all-studies-layout">
        <section className="panel">
          <header className="panel-header">
            <h2>Overview</h2>
            <span className="panel-badge">{studies.length} studies</span>
          </header>

          {loadError ? <p className="error-message">{loadError}</p> : null}

          {isLoadingList ? <p>Loading studies...</p> : null}
          {!isLoadingList && studies.length === 0 ? (
            <p>No studies available yet. Create one to get started.</p>
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
                    <span>{study.inclusionCriteria.length + study.exclusionCriteria.length} criteria</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <header className="panel-header">
            <div>
              <h2>Create study</h2>
              <p className="panel-copy">Add a study directly from the `All studies` home.</p>
            </div>
          </header>

          {dimensionsError ? <p className="error-message">{dimensionsError}</p> : null}

          <CreateStudyForm
            dimensions={dimensions}
            isLoadingDimensions={isLoadingDimensions}
            onStudyCreated={onStudyCreated}
          />
        </section>
      </div>
    </main>
  )
}

function CreateStudyForm({
  dimensions,
  isLoadingDimensions,
  onStudyCreated,
}: {
  dimensions: EligibilityDimension[]
  isLoadingDimensions: boolean
  onStudyCreated: (study: Study) => void
}) {
  const navigate = useNavigate()
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM_STATE)
  const [inclusionCriteria, setInclusionCriteria] = useState<CriterionDraft[]>([])
  const [exclusionCriteria, setExclusionCriteria] = useState<CriterionDraft[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const resolvedInclusionCriteria =
    inclusionCriteria.length > 0
      ? inclusionCriteria
      : dimensions.length > 0
        ? [createEmptyCriterionDraft(dimensions)]
        : []
  const resolvedExclusionCriteria =
    exclusionCriteria.length > 0
      ? exclusionCriteria
      : dimensions.length > 0
        ? [createEmptyCriterionDraft(dimensions)]
        : []

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setFormState((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')

    const clientValidationErrors = validateCriterionDrafts({
      inclusionCriteria: resolvedInclusionCriteria,
      exclusionCriteria: resolvedExclusionCriteria,
    })
    if (Object.keys(clientValidationErrors).length > 0) {
      setValidationErrors(clientValidationErrors)
      return
    }

    setValidationErrors({})
    setIsCreating(true)

    const payload: StudyCreateInput = {
      objectives: parseList(formState.objectivesText),
      endpoints: parseList(formState.endpointsText),
      inclusionCriteria: buildCriteriaPayload(resolvedInclusionCriteria),
      exclusionCriteria: buildCriteriaPayload(resolvedExclusionCriteria),
      participants: Number(formState.participants),
      studyType: formState.studyType,
      numberOfArms: Number(formState.numberOfArms),
      phase: formState.phase.trim(),
      therapeuticArea: formState.therapeuticArea.trim(),
      patientPopulation: formState.patientPopulation.trim(),
    }

    try {
      const createdStudy = await createStudy(payload)
      onStudyCreated(createdStudy)
      setFormState(DEFAULT_FORM_STATE)
      setInclusionCriteria(dimensions.length > 0 ? [createEmptyCriterionDraft(dimensions)] : [])
      setExclusionCriteria(dimensions.length > 0 ? [createEmptyCriterionDraft(dimensions)] : [])
      navigate(`/studies/${createdStudy.id}/summary`)
    } catch (error) {
      const apiError = error as ApiErrorResponse
      setSubmitError(extractErrorMessage(error, 'Failed to create study.'))
      setValidationErrors(apiError.errors ?? {})
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
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

      <CriteriaGroupEditor
        title="Inclusion criteria"
        fieldKey="inclusionCriteria"
        criteria={resolvedInclusionCriteria}
        dimensions={dimensions}
        validationErrors={validationErrors}
        onChange={setInclusionCriteria}
      />

      <CriteriaGroupEditor
        title="Exclusion criteria"
        fieldKey="exclusionCriteria"
        criteria={resolvedExclusionCriteria}
        dimensions={dimensions}
        validationErrors={validationErrors}
        onChange={setExclusionCriteria}
      />

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

      <button
        className="submit-button"
        type="submit"
        disabled={isCreating || isLoadingDimensions || dimensions.length === 0}
      >
        {isCreating ? 'Creating study...' : 'Create study'}
      </button>

      {submitError ? <p className="error-message">{submitError}</p> : null}
    </form>
  )
}

function StudyWorkspace({ onStudyUpdated }: { onStudyUpdated: (study: Study) => void }) {
  const { studyId = '' } = useParams()
  const [study, setStudy] = useState<Study | null>(null)
  const [isLoadingStudy, setIsLoadingStudy] = useState(true)
  const [loadError, setLoadError] = useState('')

  const reloadStudy = useCallback(async () => {
    setIsLoadingStudy(true)
    setLoadError('')

    try {
      const loadedStudy = await getStudyById(studyId)
      setStudy(loadedStudy)
      onStudyUpdated(loadedStudy)
    } catch (error) {
      setStudy(null)
      setLoadError(extractErrorMessage(error, 'Failed to load study details.'))
    } finally {
      setIsLoadingStudy(false)
    }
  }, [onStudyUpdated, studyId])

  useEffect(() => {
    if (!studyId) {
      return
    }

    const timer = window.setTimeout(() => {
      void reloadStudy()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [reloadStudy, studyId])

  return (
    <main className="workspace-shell">
      <aside className="sidebar">
        <div className="sidebar-block">
          <p className="eyebrow">Study workspace</p>
          <h1>{study?.id ?? studyId}</h1>
        </div>

        <nav className="sidebar-nav" aria-label="Study sections">
          <NavLink to="/studies">All studies</NavLink>
          <NavLink to={`/studies/${studyId}/summary`}>Summary</NavLink>
          <NavLink to={`/studies/${studyId}/eligibility`}>Eligibility criteria</NavLink>
        </nav>
      </aside>

      <section className="workspace-content">
        <Outlet
          context={
            {
              study,
              isLoadingStudy,
              loadError,
              reloadStudy,
              updateStudyInList: onStudyUpdated,
            } satisfies WorkspaceContextValue
          }
        />
      </section>
    </main>
  )
}

function StudySummaryPage({ dimensions }: { dimensions: EligibilityDimension[] }) {
  const { study, isLoadingStudy, loadError } = useWorkspaceContext()

  if (isLoadingStudy) {
    return <p>Loading study summary...</p>
  }
  if (loadError) {
    return <p className="error-message">{loadError}</p>
  }
  if (!study) {
    return <p>Study not found.</p>
  }

  return (
    <div className="workspace-page">
      <header className="workspace-page-header">
        <div>
          <p className="eyebrow">Study</p>
          <h2>Summary</h2>
        </div>
        <Link className="secondary-button" to={`/studies/${study.id}/eligibility`}>
          Edit eligibility criteria
        </Link>
      </header>

      <div className="summary-grid">
        <SummaryCard title="Description">
          <p>
            <strong>Therapeutic area:</strong> {study.therapeuticArea}
          </p>
          <p>
            <strong>Phase:</strong> {study.phase}
          </p>
          <p>
            <strong>Patient population:</strong> {study.patientPopulation}
          </p>
          <p>
            <strong>Study type:</strong> {study.studyType}
          </p>
          <p>
            <strong>Participants:</strong> {study.participants}
          </p>
          <p>
            <strong>Number of arms:</strong> {study.numberOfArms}
          </p>
        </SummaryCard>

        <SummaryCard title="Objectives">
          <DetailList items={study.objectives} />
        </SummaryCard>

        <SummaryCard title="Endpoints">
          <DetailList items={study.endpoints} />
        </SummaryCard>

        <SummaryCard title="Eligibility criteria">
          <EligibilityList
            title="Inclusion criteria"
            criteria={study.inclusionCriteria}
            dimensions={dimensions}
          />
          <EligibilityList
            title="Exclusion criteria"
            criteria={study.exclusionCriteria}
            dimensions={dimensions}
          />
        </SummaryCard>
      </div>
    </div>
  )
}

function EligibilityCriteriaPage({
  dimensions,
  isLoadingDimensions,
  dimensionsError,
  onRefreshDimensions,
}: {
  dimensions: EligibilityDimension[]
  isLoadingDimensions: boolean
  dimensionsError: string
  onRefreshDimensions: () => Promise<EligibilityDimension[]>
}) {
  const { study, isLoadingStudy, loadError, reloadStudy, updateStudyInList } = useWorkspaceContext()

  if (isLoadingStudy) {
    return <p>Loading eligibility criteria...</p>
  }
  if (loadError) {
    return <p className="error-message">{loadError}</p>
  }
  if (!study) {
    return <p>Study not found.</p>
  }

  return (
    <EligibilityCriteriaEditor
      key={buildStudyCriteriaKey(study)}
      study={study}
      dimensions={dimensions}
      isLoadingDimensions={isLoadingDimensions}
      dimensionsError={dimensionsError}
      onRefreshDimensions={onRefreshDimensions}
      reloadStudy={reloadStudy}
      updateStudyInList={updateStudyInList}
    />
  )
}

function EligibilityCriteriaEditor({
  study,
  dimensions,
  isLoadingDimensions,
  dimensionsError,
  onRefreshDimensions,
  reloadStudy,
  updateStudyInList,
}: {
  study: Study
  dimensions: EligibilityDimension[]
  isLoadingDimensions: boolean
  dimensionsError: string
  onRefreshDimensions: () => Promise<EligibilityDimension[]>
  reloadStudy: () => Promise<void>
  updateStudyInList: (study: Study) => void
}) {
  const [inclusionCriteria, setInclusionCriteria] = useState<CriterionDraft[]>(() =>
    criteriaToDrafts(study.inclusionCriteria, dimensions),
  )
  const [exclusionCriteria, setExclusionCriteria] = useState<CriterionDraft[]>(() =>
    criteriaToDrafts(study.exclusionCriteria, dimensions),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')
    setSuccessMessage('')

    const clientValidationErrors = validateCriterionDrafts({
      inclusionCriteria,
      exclusionCriteria,
    })
    if (Object.keys(clientValidationErrors).length > 0) {
      setValidationErrors(clientValidationErrors)
      return
    }

    setValidationErrors({})
    setIsSaving(true)

    const payload: StudyEligibilityInput = {
      inclusionCriteria: buildCriteriaPayload(inclusionCriteria),
      exclusionCriteria: buildCriteriaPayload(exclusionCriteria),
    }

    try {
      const updatedStudy = await updateStudyEligibility(study.id, payload)
      updateStudyInList(updatedStudy)
      await reloadStudy()
      setSuccessMessage('Eligibility criteria updated successfully.')
    } catch (error) {
      const apiError = error as ApiErrorResponse
      setSubmitError(extractErrorMessage(error, 'Failed to update eligibility criteria.'))
      setValidationErrors(apiError.errors ?? {})
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="workspace-page">
      <header className="workspace-page-header">
        <div>
          <p className="eyebrow">Study</p>
          <h2>Eligibility criteria</h2>
          <p className="subtitle">
            Add inclusion and exclusion criteria with a readable description and a deterministic rule.
          </p>
        </div>
        <button type="button" onClick={() => void onRefreshDimensions()} disabled={isLoadingDimensions}>
          {isLoadingDimensions ? 'Refreshing dimensions...' : 'Refresh dimensions'}
        </button>
      </header>

      {dimensionsError ? <p className="error-message">{dimensionsError}</p> : null}

      <form className="form-grid" onSubmit={handleSubmit}>
        <CriteriaGroupEditor
          title="Inclusion criteria"
          fieldKey="inclusionCriteria"
          criteria={inclusionCriteria}
          dimensions={dimensions}
          validationErrors={validationErrors}
          onChange={setInclusionCriteria}
        />

        <CriteriaGroupEditor
          title="Exclusion criteria"
          fieldKey="exclusionCriteria"
          criteria={exclusionCriteria}
          dimensions={dimensions}
          validationErrors={validationErrors}
          onChange={setExclusionCriteria}
        />

        <div className="button-row">
          <button
            className="submit-button"
            type="submit"
            disabled={isSaving || isLoadingDimensions || dimensions.length === 0}
          >
            {isSaving ? 'Saving eligibility...' : 'Save eligibility criteria'}
          </button>
          <Link className="secondary-button" to={`/studies/${study.id}/summary`}>
            Back to summary
          </Link>
        </div>

        {submitError ? <p className="error-message">{submitError}</p> : null}
        {successMessage ? <p className="success-message">{successMessage}</p> : null}
      </form>
    </div>
  )
}

function CriteriaGroupEditor({
  title,
  fieldKey,
  criteria,
  dimensions,
  validationErrors,
  onChange,
}: {
  title: string
  fieldKey: 'inclusionCriteria' | 'exclusionCriteria'
  criteria: CriterionDraft[]
  dimensions: EligibilityDimension[]
  validationErrors: Record<string, string>
  onChange: (criteria: CriterionDraft[]) => void
}) {
  const criteriaList =
    criteria.length > 0
      ? criteria
      : dimensions.length > 0
        ? [createEmptyCriterionDraft(dimensions)]
        : []

  function updateCriterion(index: number, updates: Partial<CriterionDraft>) {
    onChange(
      criteriaList.map((criterion, currentIndex) => {
        if (currentIndex !== index) {
          return criterion
        }

        const nextCriterion = { ...criterion, ...updates }
        if (updates.dimensionId) {
          const dimension = findDimension(dimensions, updates.dimensionId)
          nextCriterion.unit = dimension?.allowedUnits[0] ?? ''
        }

        return nextCriterion
      }),
    )
  }

  function addCriterion() {
    onChange([...criteriaList, createEmptyCriterionDraft(dimensions)])
  }

  function removeCriterion(index: number) {
    onChange(criteriaList.filter((_, currentIndex) => currentIndex !== index))
  }

  return (
    <section className="criteria-group">
      <div className="section-header">
        <h3>{title}</h3>
        <button type="button" onClick={addCriterion} disabled={dimensions.length === 0}>
          Add criterion
        </button>
      </div>

      {criteriaList.map((criterion, index) => {
        const currentDimension = findDimension(dimensions, criterion.dimensionId)
        const currentUnits = currentDimension?.allowedUnits ?? []

        return (
          <article className="criterion-editor" key={`${fieldKey}-${index}`}>
            <div className="criterion-editor-header">
              <strong>
                {title} {index + 1}
              </strong>
              <button type="button" onClick={() => removeCriterion(index)} disabled={criteriaList.length === 1}>
                Remove
              </button>
            </div>

            <label htmlFor={`${fieldKey}-${index}-description`}>Readable description</label>
            <input
              id={`${fieldKey}-${index}-description`}
              type="text"
              value={criterion.description}
              onChange={(event) => updateCriterion(index, { description: event.target.value })}
            />
            <FieldError message={validationErrors[`${fieldKey}[${index}].description`]} />

            <div className="criterion-rule-grid">
              <div>
                <label htmlFor={`${fieldKey}-${index}-dimension`}>Dimension</label>
                <select
                  id={`${fieldKey}-${index}-dimension`}
                  value={criterion.dimensionId}
                  onChange={(event) => updateCriterion(index, { dimensionId: event.target.value })}
                >
                  {dimensions.map((dimension) => (
                    <option key={dimension.id} value={dimension.id}>
                      {dimension.displayName}
                    </option>
                  ))}
                </select>
                {currentDimension ? (
                  <p className="dimension-help" title={currentDimension.description}>
                    {currentDimension.displayName}: {currentDimension.description}
                  </p>
                ) : null}
                <FieldError
                  message={validationErrors[`${fieldKey}[${index}].deterministicRule.dimensionId`]}
                />
              </div>

              <div>
                <label htmlFor={`${fieldKey}-${index}-operator`}>Operator</label>
                <select
                  id={`${fieldKey}-${index}-operator`}
                  value={criterion.operator}
                  onChange={(event) =>
                    updateCriterion(index, { operator: event.target.value as RuleOperator })
                  }
                >
                  {RULE_OPERATORS.map((operator) => (
                    <option key={operator} value={operator}>
                      {operator}
                    </option>
                  ))}
                </select>
                <FieldError
                  message={validationErrors[`${fieldKey}[${index}].deterministicRule.operator`]}
                />
              </div>

              <div>
                <label htmlFor={`${fieldKey}-${index}-value`}>Value</label>
                <input
                  id={`${fieldKey}-${index}-value`}
                  type="number"
                  step="any"
                  value={criterion.value}
                  onChange={(event) => updateCriterion(index, { value: event.target.value })}
                />
                <FieldError message={validationErrors[`${fieldKey}[${index}].deterministicRule.value`]} />
              </div>

              <div>
                <label htmlFor={`${fieldKey}-${index}-unit`}>Unit</label>
                {currentUnits.length > 0 ? (
                  <select
                    id={`${fieldKey}-${index}-unit`}
                    value={criterion.unit}
                    onChange={(event) => updateCriterion(index, { unit: event.target.value })}
                  >
                    {currentUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input id={`${fieldKey}-${index}-unit`} type="text" value="No unit" disabled />
                )}
                <FieldError message={validationErrors[`${fieldKey}[${index}].deterministicRule.unit`]} />
              </div>
            </div>

            <p className="criterion-preview">
              Rule preview:{' '}
              <span title={currentDimension?.description}>
                {formatDraftRule(criterion, dimensions)}
              </span>
            </p>
          </article>
        )
      })}

      <FieldError message={validationErrors[fieldKey]} />
    </section>
  )
}

function SummaryCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="summary-card">
      <h3>{title}</h3>
      <div className="summary-card-content">{children}</div>
    </section>
  )
}

function DetailList({ items }: { items: string[] }) {
  return (
    <ul className="detail-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function EligibilityList({
  title,
  criteria,
  dimensions,
}: {
  title: string
  criteria: EligibilityCriterion[]
  dimensions: EligibilityDimension[]
}) {
  return (
    <section className="eligibility-list">
      <div className="section-header">
        <h4>{title}</h4>
      </div>

      <ul className="detail-list">
        {criteria.map((criterion, index) => (
          <li key={`${title}-${index}`}>
            <strong>{criterion.description}</strong>
            <br />
            <span title={findDimension(dimensions, criterion.deterministicRule.dimensionId)?.description}>
              {formatRule(criterion, dimensions)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function useWorkspaceContext() {
  return useOutletContext<WorkspaceContextValue>()
}

function createEmptyCriterionDraft(dimensions: EligibilityDimension[]): CriterionDraft {
  const defaultDimension = dimensions[0]

  return {
    description: '',
    dimensionId: defaultDimension?.id ?? '',
    operator: '>',
    value: '',
    unit: defaultDimension?.allowedUnits[0] ?? '',
  }
}

function criteriaToDrafts(
  criteria: EligibilityCriterion[],
  dimensions: EligibilityDimension[],
): CriterionDraft[] {
  if (criteria.length === 0) {
    return dimensions.length > 0 ? [createEmptyCriterionDraft(dimensions)] : []
  }

  return criteria.map((criterion) => ({
    description: criterion.description,
    dimensionId: criterion.deterministicRule.dimensionId,
    operator: criterion.deterministicRule.operator,
    value: String(criterion.deterministicRule.value),
    unit: criterion.deterministicRule.unit ?? '',
  }))
}

function validateCriterionDrafts({
  inclusionCriteria,
  exclusionCriteria,
}: {
  inclusionCriteria: CriterionDraft[]
  exclusionCriteria: CriterionDraft[]
}): Record<string, string> {
  const validationErrors: Record<string, string> = {}

  validateCriteriaGroup('inclusionCriteria', inclusionCriteria, validationErrors)
  validateCriteriaGroup('exclusionCriteria', exclusionCriteria, validationErrors)

  return validationErrors
}

function validateCriteriaGroup(
  fieldKey: 'inclusionCriteria' | 'exclusionCriteria',
  criteria: CriterionDraft[],
  validationErrors: Record<string, string>,
) {
  if (criteria.length === 0) {
    validationErrors[fieldKey] = `At least one ${fieldKey === 'inclusionCriteria' ? 'inclusion' : 'exclusion'} criterion is required.`
    return
  }

  criteria.forEach((criterion, index) => {
    if (!criterion.description.trim()) {
      validationErrors[`${fieldKey}[${index}].description`] = 'Description is required.'
    }
    if (!criterion.value.trim()) {
      validationErrors[`${fieldKey}[${index}].deterministicRule.value`] = 'Value is required.'
    }
  })
}

function buildCriteriaPayload(criteria: CriterionDraft[]): EligibilityCriterion[] {
  return criteria.map((criterion) => ({
    description: criterion.description.trim(),
    deterministicRule: {
      dimensionId: criterion.dimensionId,
      operator: criterion.operator,
      value: Number(criterion.value),
      unit: criterion.unit || undefined,
    },
  }))
}

function findDimension(dimensions: EligibilityDimension[], dimensionId: string) {
  return dimensions.find((dimension) => dimension.id === dimensionId)
}

function formatDraftRule(criterion: CriterionDraft, dimensions: EligibilityDimension[]) {
  const dimension = findDimension(dimensions, criterion.dimensionId)
  const label = dimension?.displayName ?? criterion.dimensionId ?? 'dimension'
  const value = criterion.value || 'value'

  return `${label} ${criterion.operator} ${value}${criterion.unit ? ` ${criterion.unit}` : ''}`
}

function formatRule(criterion: EligibilityCriterion, dimensions: EligibilityDimension[]) {
  const dimension = findDimension(dimensions, criterion.deterministicRule.dimensionId)
  const label = dimension?.displayName ?? criterion.deterministicRule.dimensionId

  return `${label} ${criterion.deterministicRule.operator} ${criterion.deterministicRule.value}${criterion.deterministicRule.unit ? ` ${criterion.deterministicRule.unit}` : ''}`
}

function buildStudyCriteriaKey(study: Study) {
  return `${study.id}:${JSON.stringify(study.inclusionCriteria)}:${JSON.stringify(study.exclusionCriteria)}`
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
