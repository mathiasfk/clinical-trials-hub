import { useCallback } from 'react'
import { Outlet } from 'react-router-dom'

import { createStudy } from '../api'
import type { EligibilityDimension, Study, StudyCreateInput } from '../types'
import type { NewSectionContext } from '../sections/SectionContext'
import { useNewStudyDraft } from './draftState'
import { NewStudyDraftProvider } from './NewStudyDraftProvider'

interface NewStudyLayoutProps {
  dimensions: EligibilityDimension[]
  isLoadingDimensions: boolean
  dimensionsError: string
  refreshDimensions: () => Promise<void>
  onStudyCreated: (study: Study) => void
}

export function NewStudyLayout(props: NewStudyLayoutProps) {
  return (
    <NewStudyDraftProvider>
      <NewStudyOutlet {...props} />
    </NewStudyDraftProvider>
  )
}

function NewStudyOutlet({
  dimensions,
  isLoadingDimensions,
  dimensionsError,
  refreshDimensions,
  onStudyCreated,
}: NewStudyLayoutProps) {
  const {
    draft,
    setStudyInformation,
    setObjectives,
    setEndpoints,
    setEligibility,
    resetDraft,
  } = useNewStudyDraft()

  const publishDraft = useCallback(async () => {
    const payload: StudyCreateInput = {
      objectives: draft.objectives.objectives.map((item) => item.trim()).filter(Boolean),
      endpoints: draft.endpoints.endpoints.map((item) => item.trim()).filter(Boolean),
      inclusionCriteria: draft.eligibility.inclusionCriteria,
      exclusionCriteria: draft.eligibility.exclusionCriteria,
      participants: draft.studyInformation.participants ?? 0,
      studyType: draft.studyInformation.studyType,
      numberOfArms: draft.studyInformation.numberOfArms ?? 0,
      phase: draft.studyInformation.phase.trim(),
      therapeuticArea: draft.studyInformation.therapeuticArea.trim(),
      patientPopulation: draft.studyInformation.patientPopulation.trim(),
    }
    const created = await createStudy(payload)
    onStudyCreated(created)
    resetDraft()
    return created
  }, [draft, onStudyCreated, resetDraft])

  const discardDraft = useCallback(() => {
    resetDraft()
  }, [resetDraft])

  const context: NewSectionContext = {
    mode: 'new',
    draft,
    dimensions,
    isLoadingDimensions,
    dimensionsError,
    refreshDimensions,
    setStudyInformation,
    setObjectives,
    setEndpoints,
    setEligibility,
    publishDraft,
    discardDraft,
  }

  return <Outlet context={context} />
}
