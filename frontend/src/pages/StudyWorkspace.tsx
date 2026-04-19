import { useCallback, useEffect, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'

import {
  getStudyById,
  replaceStudy as replaceStudyApi,
  updateStudyEligibility,
} from '../api'
import type { EligibilityDimension, Study, StudyCreateInput, StudyEligibilityInput } from '../types'
import { extractErrorMessage } from '../sections/eligibilityDrafts'
import type { EditSectionContext } from '../sections/SectionContext'

interface StudyWorkspaceProps {
  dimensions: EligibilityDimension[]
  isLoadingDimensions: boolean
  dimensionsError: string
  refreshDimensions: () => Promise<void>
  onStudyUpdated: (study: Study) => void
}

export function StudyWorkspace({
  dimensions,
  isLoadingDimensions,
  dimensionsError,
  refreshDimensions,
  onStudyUpdated,
}: StudyWorkspaceProps) {
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

  const replaceStudy = useCallback(
    async (input: StudyCreateInput) => {
      const updated = await replaceStudyApi(studyId, input)
      setStudy(updated)
      onStudyUpdated(updated)
      return updated
    },
    [onStudyUpdated, studyId],
  )

  const updateEligibility = useCallback(
    async (input: StudyEligibilityInput) => {
      const updated = await updateStudyEligibility(studyId, input)
      setStudy(updated)
      onStudyUpdated(updated)
      return updated
    },
    [onStudyUpdated, studyId],
  )

  const context: EditSectionContext = {
    mode: 'edit',
    studyId,
    study,
    isLoadingStudy,
    loadError,
    dimensions,
    isLoadingDimensions,
    dimensionsError,
    refreshDimensions,
    replaceStudy,
    updateEligibility,
  }

  return <Outlet context={context} />
}
