import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import type { ApiErrorResponse, Study, StudyCreateInput } from '../types'
import { nextSection } from './constants'
import { FieldError } from './EligibilityEditor'
import { extractErrorMessage } from './eligibilityDrafts'
import { SectionFooter } from './SectionFooter'
import { useSectionContext } from './SectionContext'
import type { EndpointsData } from './validation'
import { validateEndpoints } from './validation'

export function EndpointsScreen() {
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

  const initial: EndpointsData =
    ctx.mode === 'edit'
      ? { endpoints: (ctx.study as Study).endpoints.length > 0 ? (ctx.study as Study).endpoints : [''] }
      : ctx.draft.endpoints.endpoints.length > 0
        ? ctx.draft.endpoints
        : { endpoints: [''] }

  return <EndpointsForm initial={initial} />
}

function EndpointsForm({ initial }: { initial: EndpointsData }) {
  const ctx = useSectionContext()
  const navigate = useNavigate()
  const [data, setData] = useState<EndpointsData>(initial)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  function updateEndpoint(index: number, value: string) {
    setData((current) => ({
      endpoints: current.endpoints.map((item, currentIndex) =>
        currentIndex === index ? value : item,
      ),
    }))
  }

  function addEndpoint() {
    setData((current) => ({ endpoints: [...current.endpoints, ''] }))
  }

  function removeEndpoint(index: number) {
    setData((current) => ({
      endpoints: current.endpoints.filter((_, currentIndex) => currentIndex !== index),
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')
    setSuccessMessage('')

    const errors = validateEndpoints(data)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }
    setValidationErrors({})

    if (ctx.mode === 'new') {
      ctx.setEndpoints({ endpoints: data.endpoints.map((item) => item.trim()) })
      const next = nextSection('endpoints')
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
        endpoints: data.endpoints.map((item) => item.trim()).filter(Boolean),
      }
      await ctx.replaceStudy(payload)
      setSuccessMessage('Endpoints saved.')
    } catch (error) {
      const apiError = error as ApiErrorResponse
      setSubmitError(extractErrorMessage(error, 'Failed to save endpoints.'))
      setValidationErrors(apiError.errors ?? {})
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <p className="subtitle">
        Provide at least one endpoint. Each endpoint must be longer than 10 characters.
      </p>

      {data.endpoints.map((endpoint, index) => (
        <div key={index} className="list-field-row">
          <div className="list-field-input">
            <label htmlFor={`endpoint-${index}`}>Endpoint {index + 1}</label>
            <input
              id={`endpoint-${index}`}
              type="text"
              value={endpoint}
              onChange={(event) => updateEndpoint(index, event.target.value)}
            />
            <FieldError message={validationErrors[`endpoints[${index}]`]} />
          </div>
          <button
            type="button"
            onClick={() => removeEndpoint(index)}
            disabled={data.endpoints.length === 1}
          >
            Remove
          </button>
        </div>
      ))}

      <button type="button" onClick={addEndpoint}>
        Add endpoint
      </button>
      <FieldError message={validationErrors.endpoints} />

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
