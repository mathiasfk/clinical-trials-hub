import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import type { ApiErrorResponse, Study, StudyCreateInput, StudyType } from '../types'
import {
  PHASE_OPTIONS,
  THERAPEUTIC_AREA_OPTIONS,
  nextSection,
} from './constants'
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
      <label htmlFor="phase">Phase</label>
      <select
        id="phase"
        value={data.phase}
        onChange={(event) => updateField('phase', event.target.value)}
      >
        <option value="">Select a phase</option>
        {PHASE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <FieldError message={validationErrors.phase} />

      <label htmlFor="therapeuticArea">Therapeutic area</label>
      <select
        id="therapeuticArea"
        value={data.therapeuticArea}
        onChange={(event) => updateField('therapeuticArea', event.target.value)}
      >
        <option value="">Select a therapeutic area</option>
        {THERAPEUTIC_AREA_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
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

      <label htmlFor="firstPatientFirstVisit">First patient, first visit</label>
      <input
        id="firstPatientFirstVisit"
        type="date"
        value={data.firstPatientFirstVisit}
        onChange={(event) => updateField('firstPatientFirstVisit', event.target.value)}
      />
      <FieldError message={validationErrors.firstPatientFirstVisit} />

      <label htmlFor="lastPatientFirstVisit">Last patient, first visit</label>
      <input
        id="lastPatientFirstVisit"
        type="date"
        value={data.lastPatientFirstVisit}
        onChange={(event) => updateField('lastPatientFirstVisit', event.target.value)}
      />
      <FieldError message={validationErrors.lastPatientFirstVisit} />

      <label htmlFor="protocolApprovalDate">Protocol approval date</label>
      <input
        id="protocolApprovalDate"
        type="date"
        value={data.protocolApprovalDate}
        onChange={(event) => updateField('protocolApprovalDate', event.target.value)}
      />
      <FieldError message={validationErrors.protocolApprovalDate} />

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
    firstPatientFirstVisit: info.firstPatientFirstVisit.trim(),
    lastPatientFirstVisit: info.lastPatientFirstVisit.trim(),
    protocolApprovalDate: info.protocolApprovalDate.trim(),
  }
}
