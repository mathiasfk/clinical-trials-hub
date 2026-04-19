import { createContext, useContext } from 'react'

import type { StudyType } from '../types'
import type {
  EligibilityData,
  EndpointsData,
  ObjectivesData,
  StudyInformationData,
} from '../sections/validation'

export interface NewStudyDraft {
  studyInformation: StudyInformationData
  objectives: ObjectivesData
  endpoints: EndpointsData
  eligibility: EligibilityData
}

export type DraftAction =
  | { type: 'setStudyInformation'; data: StudyInformationData }
  | { type: 'setObjectives'; data: ObjectivesData }
  | { type: 'setEndpoints'; data: EndpointsData }
  | { type: 'setEligibility'; data: EligibilityData }
  | { type: 'reset' }

const DEFAULT_STUDY_TYPE: StudyType = 'parallel'

export const EMPTY_DRAFT: NewStudyDraft = {
  studyInformation: {
    phase: '',
    therapeuticArea: '',
    patientPopulation: '',
    studyType: DEFAULT_STUDY_TYPE,
    participants: null,
    numberOfArms: null,
  },
  objectives: { objectives: [''] },
  endpoints: { endpoints: [''] },
  eligibility: { inclusionCriteria: [], exclusionCriteria: [] },
}

export function draftReducer(state: NewStudyDraft, action: DraftAction): NewStudyDraft {
  switch (action.type) {
    case 'setStudyInformation':
      return { ...state, studyInformation: action.data }
    case 'setObjectives':
      return { ...state, objectives: action.data }
    case 'setEndpoints':
      return { ...state, endpoints: action.data }
    case 'setEligibility':
      return { ...state, eligibility: action.data }
    case 'reset':
      return EMPTY_DRAFT
  }
}

export interface NewStudyDraftContextValue {
  draft: NewStudyDraft
  setStudyInformation: (data: StudyInformationData) => void
  setObjectives: (data: ObjectivesData) => void
  setEndpoints: (data: EndpointsData) => void
  setEligibility: (data: EligibilityData) => void
  resetDraft: () => void
}

export const NewStudyDraftContext = createContext<NewStudyDraftContextValue | null>(null)

export function useNewStudyDraft(): NewStudyDraftContextValue {
  const value = useContext(NewStudyDraftContext)
  if (!value) {
    throw new Error('useNewStudyDraft must be used within a NewStudyDraftProvider')
  }
  return value
}
