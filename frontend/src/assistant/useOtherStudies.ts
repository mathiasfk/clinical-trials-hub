import { useCallback, useEffect, useState } from 'react'

import { listStudies } from '../api'
import { extractErrorMessage } from '../extractErrorMessage'
import type { Study } from '../types'

export interface UseOtherStudiesResult {
  otherStudies: Study[]
  isLoading: boolean
  error: string | null
  reload: () => Promise<void>
}

/**
 * Hook that lazily fetches the full study list and returns the subset that
 * excludes the current study. The first fetch is triggered only when
 * `enabled` flips to `true` so the cost isn't paid on every visit to the
 * section.
 *
 * The assistant's **Suggest criteria based on similar studies** skill does not
 * depend on this list; it calls `GET /api/v1/studies/{id}/similar-suggestions`
 * instead. This hook remains useful to pre-populate `otherStudies` for
 * **Copy criteria from another study** (study picker and duplicate filtering).
 *
 * @param enabled When false the hook performs no network work.
 * @param currentStudyId When not null, the matching study is filtered out.
 */
export function useOtherStudies(
  enabled: boolean,
  currentStudyId: string | null,
): UseOtherStudiesResult {
  const [studies, setStudies] = useState<Study[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  const doFetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const loaded = await listStudies()
      setStudies(loaded)
      setHasFetched(true)
    } catch (caught) {
      setError(extractErrorMessage(caught, 'Failed to load the list of studies.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (enabled && !hasFetched && !isLoading) {
      void doFetch()
    }
  }, [enabled, hasFetched, isLoading, doFetch])

  const reload = useCallback(async () => {
    await doFetch()
  }, [doFetch])

  const otherStudies =
    currentStudyId === null ? studies : studies.filter((study) => study.id !== currentStudyId)

  return { otherStudies, isLoading, error, reload }
}
