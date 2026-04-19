import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { listEligibilityDimensions, listStudies } from './api'
import './App.css'
import { NewStudyLayout } from './newStudy/NewStudyLayout'
import { AllStudiesPage } from './pages/AllStudiesPage'
import { StudyWorkspace } from './pages/StudyWorkspace'
import { SummaryScreen } from './pages/SummaryScreen'
import { EligibilityCriteriaScreen } from './sections/EligibilityCriteriaScreen'
import { EndpointsScreen } from './sections/EndpointsScreen'
import { extractErrorMessage } from './sections/eligibilityDrafts'
import { ObjectivesScreen } from './sections/ObjectivesScreen'
import { StudyInformationScreen } from './sections/StudyInformationScreen'
import { AppShell } from './shell/AppShell'
import type { EligibilityDimension, Study } from './types'

function App() {
  const [studies, setStudies] = useState<Study[]>([])
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [dimensions, setDimensions] = useState<EligibilityDimension[]>([])
  const [isLoadingDimensions, setIsLoadingDimensions] = useState(true)
  const [dimensionsError, setDimensionsError] = useState('')

  const refreshStudies = useCallback(async (): Promise<Study[]> => {
    setIsLoadingList(true)
    setLoadError('')
    try {
      const loadedStudies = await listStudies()
      setStudies(loadedStudies)
      return loadedStudies
    } catch (error) {
      setLoadError(extractErrorMessage(error, 'Failed to load studies.'))
      return []
    } finally {
      setIsLoadingList(false)
    }
  }, [])

  const refreshDimensions = useCallback(async (): Promise<void> => {
    setIsLoadingDimensions(true)
    setDimensionsError('')
    try {
      const loadedDimensions = await listEligibilityDimensions()
      setDimensions(loadedDimensions)
    } catch (error) {
      setDimensionsError(extractErrorMessage(error, 'Failed to load eligibility dimensions.'))
    } finally {
      setIsLoadingDimensions(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshStudies()
      void refreshDimensions()
    }, 0)
    return () => {
      window.clearTimeout(timer)
    }
  }, [refreshDimensions, refreshStudies])

  const sortedStudies = useMemo(() => [...studies].reverse(), [studies])

  const upsertStudyInList = useCallback((study: Study) => {
    setStudies((currentStudies) => {
      const existingIndex = currentStudies.findIndex(
        (currentStudy) => currentStudy.id === study.id,
      )
      if (existingIndex === -1) {
        return [...currentStudies, study]
      }
      return currentStudies.map((currentStudy) =>
        currentStudy.id === study.id ? study : currentStudy,
      )
    })
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/studies" replace />} />
          <Route
            path="/studies"
            element={
              <AllStudiesPage
                studies={sortedStudies}
                isLoadingList={isLoadingList}
                loadError={loadError}
                onRefreshStudies={refreshStudies}
              />
            }
          />

          <Route
            path="/studies/new"
            element={
              <NewStudyLayout
                dimensions={dimensions}
                isLoadingDimensions={isLoadingDimensions}
                dimensionsError={dimensionsError}
                refreshDimensions={refreshDimensions}
                onStudyCreated={upsertStudyInList}
              />
            }
          >
            <Route index element={<Navigate to="study-information" replace />} />
            <Route path="study-information" element={<StudyInformationScreen />} />
            <Route path="objectives" element={<ObjectivesScreen />} />
            <Route path="endpoints" element={<EndpointsScreen />} />
            <Route path="eligibility" element={<EligibilityCriteriaScreen />} />
            <Route path="summary" element={<SummaryScreen />} />
          </Route>

          <Route
            path="/studies/:studyId"
            element={
              <StudyWorkspace
                dimensions={dimensions}
                isLoadingDimensions={isLoadingDimensions}
                dimensionsError={dimensionsError}
                refreshDimensions={refreshDimensions}
                onStudyUpdated={upsertStudyInList}
              />
            }
          >
            <Route index element={<Navigate to="summary" replace />} />
            <Route path="summary" element={<SummaryScreen />} />
            <Route path="study-information" element={<StudyInformationScreen />} />
            <Route path="objectives" element={<ObjectivesScreen />} />
            <Route path="endpoints" element={<EndpointsScreen />} />
            <Route path="eligibility" element={<EligibilityCriteriaScreen />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
