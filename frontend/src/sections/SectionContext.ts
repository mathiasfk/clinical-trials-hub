import { useOutletContext } from 'react-router-dom'

import type { NewStudyDraft } from '../newStudy/draftState'
import type {
  EligibilityDimension,
  Study,
  StudyCreateInput,
  StudyEligibilityInput,
} from '../types'
import type {
  EligibilityData,
  EndpointsData,
  ObjectivesData,
  StudyInformationData,
} from './validation'

interface CommonSectionContext {
  dimensions: EligibilityDimension[]
  isLoadingDimensions: boolean
  dimensionsError: string
  refreshDimensions: () => Promise<void>
}

export interface EditSectionContext extends CommonSectionContext {
  mode: 'edit'
  studyId: string
  study: Study | null
  isLoadingStudy: boolean
  loadError: string
  replaceStudy: (input: StudyCreateInput) => Promise<Study>
  updateEligibility: (input: StudyEligibilityInput) => Promise<Study>
}

export interface NewSectionContext extends CommonSectionContext {
  mode: 'new'
  draft: NewStudyDraft
  setStudyInformation: (data: StudyInformationData) => void
  setObjectives: (data: ObjectivesData) => void
  setEndpoints: (data: EndpointsData) => void
  setEligibility: (data: EligibilityData) => void
  publishDraft: () => Promise<Study>
  discardDraft: () => void
}

export type SectionOutletContext = EditSectionContext | NewSectionContext

export function useSectionContext(): SectionOutletContext {
  return useOutletContext<SectionOutletContext>()
}
