import { useCallback, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'

import type {
  EligibilityData,
  EndpointsData,
  ObjectivesData,
  StudyInformationData,
} from '../sections/validation'
import {
  EMPTY_DRAFT,
  NewStudyDraftContext,
  draftReducer,
} from './draftState'
import type { NewStudyDraftContextValue } from './draftState'

export function NewStudyDraftProvider({ children }: { children: ReactNode }) {
  const [draft, dispatch] = useReducer(draftReducer, EMPTY_DRAFT)

  const setStudyInformation = useCallback((data: StudyInformationData) => {
    dispatch({ type: 'setStudyInformation', data })
  }, [])
  const setObjectives = useCallback((data: ObjectivesData) => {
    dispatch({ type: 'setObjectives', data })
  }, [])
  const setEndpoints = useCallback((data: EndpointsData) => {
    dispatch({ type: 'setEndpoints', data })
  }, [])
  const setEligibility = useCallback((data: EligibilityData) => {
    dispatch({ type: 'setEligibility', data })
  }, [])
  const resetDraft = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  const value = useMemo<NewStudyDraftContextValue>(
    () => ({
      draft,
      setStudyInformation,
      setObjectives,
      setEndpoints,
      setEligibility,
      resetDraft,
    }),
    [draft, setStudyInformation, setObjectives, setEndpoints, setEligibility, resetDraft],
  )

  return <NewStudyDraftContext.Provider value={value}>{children}</NewStudyDraftContext.Provider>
}
