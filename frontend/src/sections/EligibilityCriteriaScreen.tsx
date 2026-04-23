import { useCallback, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { AssistantChatDock } from '../assistant'
import type { AssistantContext, CriterionGroup } from '../assistant'
import type { ApiErrorResponse, EligibilityCriterion } from '../types'
import { nextSection } from './constants'
import { CriteriaGroupEditor } from './EligibilityEditor'
import type { CriterionDraft } from './eligibilityDrafts'
import { extractErrorMessage } from '../extractErrorMessage'
import {
  completeDraftsToCriteria,
  criteriaToDrafts,
  draftsToCriteria,
} from './eligibilityDrafts'
import { SectionFooter } from './SectionFooter'
import { useSectionContext } from './SectionContext'
import { validateEligibility } from './validation'

export function EligibilityCriteriaScreen() {
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

  return <EligibilityForm key={ctx.mode === 'edit' ? ctx.studyId : 'new'} />
}

function EligibilityForm() {
  const ctx = useSectionContext()
  const navigate = useNavigate()

  const initialInclusion =
    ctx.mode === 'edit'
      ? ctx.study!.inclusionCriteria
      : ctx.draft.eligibility.inclusionCriteria

  const initialExclusion =
    ctx.mode === 'edit'
      ? ctx.study!.exclusionCriteria
      : ctx.draft.eligibility.exclusionCriteria

  const [inclusionCriteria, setInclusionCriteria] = useState<CriterionDraft[]>(() =>
    criteriaToDrafts(initialInclusion),
  )
  const [exclusionCriteria, setExclusionCriteria] = useState<CriterionDraft[]>(() =>
    criteriaToDrafts(initialExclusion),
  )
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const currentStudyMeta = useMemo(() => {
    if (ctx.mode === 'edit') {
      const study = ctx.study!
      return {
        id: study.id as string | null,
        therapeuticArea: study.therapeuticArea,
        phase: study.phase,
        studyType: study.studyType,
      }
    }
    const info = ctx.draft.studyInformation
    return {
      id: null as string | null,
      therapeuticArea: info.therapeuticArea,
      phase: info.phase,
      studyType: info.studyType,
    }
  }, [ctx])

  const assistantContext: AssistantContext = useMemo(
    () => ({
      currentStudy: {
        ...currentStudyMeta,
        inclusionCriteria: completeDraftsToCriteria(inclusionCriteria, ctx.dimensions),
        exclusionCriteria: completeDraftsToCriteria(exclusionCriteria, ctx.dimensions),
      },
      otherStudies: [],
      dimensions: ctx.dimensions,
    }),
    [currentStudyMeta, inclusionCriteria, exclusionCriteria, ctx.dimensions],
  )

  const handleAddCriterion = useCallback(
    (group: CriterionGroup, criterion: EligibilityCriterion) => {
      const drafts = criteriaToDrafts([criterion])
      if (group === 'inclusion') {
        setInclusionCriteria((current) => [...current, ...drafts])
      } else {
        setExclusionCriteria((current) => [...current, ...drafts])
      }
    },
    [],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')
    setSuccessMessage('')

    const inclusion = draftsToCriteria(inclusionCriteria)
    const exclusion = draftsToCriteria(exclusionCriteria)
    const errors = validateEligibility(
      { inclusionCriteria: inclusion, exclusionCriteria: exclusion },
      ctx.dimensions,
    )
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }
    setValidationErrors({})

    if (ctx.mode === 'new') {
      ctx.setEligibility({
        inclusionCriteria: inclusion,
        exclusionCriteria: exclusion,
      })
      const next = nextSection('eligibility')
      if (next) {
        navigate(`/studies/new/${next}`)
      }
      return
    }

    setIsBusy(true)
    try {
      await ctx.updateEligibility({
        inclusionCriteria: inclusion,
        exclusionCriteria: exclusion,
      })
      setSuccessMessage('Eligibility criteria saved.')
    } catch (error) {
      const apiError = error as ApiErrorResponse
      setSubmitError(extractErrorMessage(error, 'Failed to save eligibility criteria.'))
      setValidationErrors(apiError.errors ?? {})
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <>
      <form className="form-grid" onSubmit={handleSubmit}>
        <p className="subtitle">
          Add inclusion and exclusion criteria with a readable description and a deterministic rule.
        </p>

        {ctx.dimensionsError ? <p className="error-message">{ctx.dimensionsError}</p> : null}

        <CriteriaGroupEditor
          title="Inclusion criteria"
          fieldKey="inclusionCriteria"
          criteria={inclusionCriteria}
          dimensions={ctx.dimensions}
          validationErrors={validationErrors}
          onChange={setInclusionCriteria}
        />

        <CriteriaGroupEditor
          title="Exclusion criteria"
          fieldKey="exclusionCriteria"
          criteria={exclusionCriteria}
          dimensions={ctx.dimensions}
          validationErrors={validationErrors}
          onChange={setExclusionCriteria}
        />

        <SectionFooter
          mode={ctx.mode}
          busy={isBusy}
          submitError={submitError}
          successMessage={successMessage}
        />
      </form>

      <AssistantChatDock context={assistantContext} onAddCriterion={handleAddCriterion} />
    </>
  )
}
