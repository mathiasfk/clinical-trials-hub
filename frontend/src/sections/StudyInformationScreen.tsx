import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import type { ApiErrorResponse, Study, StudyCreateInput, StudyType } from '../types'
import { nextSection } from './constants'
import { FieldError } from './EligibilityEditor'
import { extractErrorMessage } from './eligibilityDrafts'
import { SectionFooter } from './SectionFooter'
import { useSectionContext } from './SectionContext'
import type { StudyInformationData } from './validation'
import { studyToStudyInformation, validateStudyInformation } from './validation'

export function StudyInformationScreen() {
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

  const initial =
    ctx.mode === 'edit'
      ? studyToStudyInformation(ctx.study as Study)
      : ctx.draft.studyInformation

  return <StudyInformationForm initial={initial} />
}

function StudyInformationForm({ initial }: { initial: StudyInformationData }) {
  const ctx = useSectionContext()
  const navigate = useNavigate()
  const [data, setData] = useState<StudyInformationData>(initial)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  function updateField<K extends keyof StudyInformationData>(
    field: K,
    value: StudyInformationData[K],
  ) {
    setData((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')
    setSuccessMessage('')

    const errors = validateStudyInformation(data)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }
    setValidationErrors({})

    if (ctx.mode === 'new') {
      ctx.setStudyInformation(data)
      const next = nextSection('study-information')
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
      const payload: StudyCreateInput = buildUpdatedStudy(currentStudy, data)
      await ctx.replaceStudy(payload)
      setSuccessMessage('Study information saved.')
    } catch (error) {
      const apiError = error as ApiErrorResponse
      setSubmitError(extractErrorMessage(error, 'Failed to save study information.'))
      setValidationErrors(apiError.errors ?? {})
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <h2>Study information</h2>

      <label htmlFor="phase">Phase</label>
      <input
        id="phase"
        type="text"
        value={data.phase}
        onChange={(event) => updateField('phase', event.target.value)}
      />
      <FieldError message={validationErrors.phase} />

      <label htmlFor="therapeuticArea">Therapeutic area</label>
      <input
        id="therapeuticArea"
        type="text"
        value={data.therapeuticArea}
        onChange={(event) => updateField('therapeuticArea', event.target.value)}
      />
      <FieldError message={validationErrors.therapeuticArea} />

      <label htmlFor="patientPopulation">Patient population</label>
      <input
        id="patientPopulation"
        type="text"
        value={data.patientPopulation}
        onChange={(event) => updateField('patientPopulation', event.target.value)}
      />
      <FieldError message={validationErrors.patientPopulation} />

      <label htmlFor="studyType">Study type</label>
      <select
        id="studyType"
        value={data.studyType}
        onChange={(event) => updateField('studyType', event.target.value as StudyType)}
      >
        <option value="parallel">parallel</option>
        <option value="crossover">crossover</option>
        <option value="single-arm">single-arm</option>
      </select>
      <FieldError message={validationErrors.studyType} />

      <label htmlFor="participants">Number of participants</label>
      <input
        id="participants"
        type="number"
        min={1}
        value={data.participants ?? ''}
        onChange={(event) =>
          updateField(
            'participants',
            event.target.value === '' ? null : Number(event.target.value),
          )
        }
      />
      <FieldError message={validationErrors.participants} />

      <label htmlFor="numberOfArms">Number of arms</label>
      <input
        id="numberOfArms"
        type="number"
        min={1}
        value={data.numberOfArms ?? ''}
        onChange={(event) =>
          updateField(
            'numberOfArms',
            event.target.value === '' ? null : Number(event.target.value),
          )
        }
      />
      <FieldError message={validationErrors.numberOfArms} />

      <SectionFooter
        mode={ctx.mode}
        busy={isBusy}
        submitError={submitError}
        successMessage={successMessage}
      />
    </form>
  )
}

function buildUpdatedStudy(study: Study, info: StudyInformationData): StudyCreateInput {
  return {
    objectives: study.objectives,
    endpoints: study.endpoints,
    inclusionCriteria: study.inclusionCriteria,
    exclusionCriteria: study.exclusionCriteria,
    participants: info.participants ?? 0,
    studyType: info.studyType,
    numberOfArms: info.numberOfArms ?? 0,
    phase: info.phase.trim(),
    therapeuticArea: info.therapeuticArea.trim(),
    patientPopulation: info.patientPopulation.trim(),
  }
}
