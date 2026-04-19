import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import type { ApiErrorResponse, Study, StudyCreateInput } from '../types'
import { nextSection } from './constants'
import { FieldError } from './EligibilityEditor'
import { extractErrorMessage } from './eligibilityDrafts'
import { SectionFooter } from './SectionFooter'
import { useSectionContext } from './SectionContext'
import type { ObjectivesData } from './validation'
import { validateObjectives } from './validation'

export function ObjectivesScreen() {
  const ctx = useSectionContext()

  if (ctx.mode === 'edit' && !ctx.study) {
    if (ctx.isLoadingStudy) {
      return <p>Loading study...</p>
    }
    if (ctx.loadError) {
      return <p className="error-message">{ctx.loadError}</p>
    }
    return <p>Study not found.</p>
  }

  const initial: ObjectivesData =
    ctx.mode === 'edit'
      ? { objectives: (ctx.study as Study).objectives.length > 0 ? (ctx.study as Study).objectives : [''] }
      : ctx.draft.objectives.objectives.length > 0
        ? ctx.draft.objectives
        : { objectives: [''] }

  return <ObjectivesForm initial={initial} />
}

function ObjectivesForm({ initial }: { initial: ObjectivesData }) {
  const ctx = useSectionContext()
  const navigate = useNavigate()
  const [data, setData] = useState<ObjectivesData>(initial)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  function updateObjective(index: number, value: string) {
    setData((current) => ({
      objectives: current.objectives.map((item, currentIndex) =>
        currentIndex === index ? value : item,
      ),
    }))
  }

  function addObjective() {
    setData((current) => ({ objectives: [...current.objectives, ''] }))
  }

  function removeObjective(index: number) {
    setData((current) => ({
      objectives: current.objectives.filter((_, currentIndex) => currentIndex !== index),
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')
    setSuccessMessage('')

    const errors = validateObjectives(data)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }
    setValidationErrors({})

    if (ctx.mode === 'new') {
      ctx.setObjectives({ objectives: data.objectives.map((item) => item.trim()) })
      const next = nextSection('objectives')
      if (next) {
        navigate(`/studies/new/${next}`)
      }
      return
    }

    const currentStudy = ctx.study
    if (!currentStudy) {
      return
    }

    setIsBusy(true)
    try {
      const payload: StudyCreateInput = {
        ...toStudyInput(currentStudy),
        objectives: data.objectives.map((item) => item.trim()).filter(Boolean),
      }
      await ctx.replaceStudy(payload)
      setSuccessMessage('Objectives saved.')
    } catch (error) {
      const apiError = error as ApiErrorResponse
      setSubmitError(extractErrorMessage(error, 'Failed to save objectives.'))
      setValidationErrors(apiError.errors ?? {})
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <p className="subtitle">
        Provide at least one objective. Each objective must be longer than 10 characters.
      </p>

      {data.objectives.map((objective, index) => (
        <div key={index} className="list-field-row">
          <div className="list-field-input">
            <label htmlFor={`objective-${index}`}>Objective {index + 1}</label>
            <input
              id={`objective-${index}`}
              type="text"
              value={objective}
              onChange={(event) => updateObjective(index, event.target.value)}
            />
            <FieldError message={validationErrors[`objectives[${index}]`]} />
          </div>
          <button
            type="button"
            onClick={() => removeObjective(index)}
            disabled={data.objectives.length === 1}
          >
            Remove
          </button>
        </div>
      ))}

      <button type="button" onClick={addObjective}>
        Add objective
      </button>
      <FieldError message={validationErrors.objectives} />

      <SectionFooter
        mode={ctx.mode}
        busy={isBusy}
        submitError={submitError}
        successMessage={successMessage}
      />
    </form>
  )
}

function toStudyInput(study: Study): StudyCreateInput {
  return {
    objectives: study.objectives,
    endpoints: study.endpoints,
    inclusionCriteria: study.inclusionCriteria,
    exclusionCriteria: study.exclusionCriteria,
    participants: study.participants,
    studyType: study.studyType,
    numberOfArms: study.numberOfArms,
    phase: study.phase,
    therapeuticArea: study.therapeuticArea,
    patientPopulation: study.patientPopulation,
    firstPatientFirstVisit: study.firstPatientFirstVisit,
    lastPatientFirstVisit: study.lastPatientFirstVisit,
    protocolApprovalDate: study.protocolApprovalDate,
  }
}
