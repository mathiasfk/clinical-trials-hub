import { useLocation } from 'react-router-dom'

import { isSectionSlug } from '../sections/constants'
import type { SectionSlug } from '../sections/constants'

export type ActiveContext =
  | { kind: 'none' }
  | { kind: 'new'; currentSection: SectionSlug | null }
  | { kind: 'edit'; studyId: string; currentSection: SectionSlug | null }

export function useActiveContext(): ActiveContext {
  const location = useLocation()
  return parseActiveContext(location.pathname)
}

export function parseActiveContext(pathname: string): ActiveContext {
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'studies') {
    return { kind: 'none' }
  }
  if (parts.length === 1) {
    return { kind: 'none' }
  }
  if (parts[1] === 'new') {
    const section = parts[2]
    return { kind: 'new', currentSection: isSectionSlug(section) ? section : null }
  }
  const studyId = parts[1]
  const section = parts[2]
  return {
    kind: 'edit',
    studyId,
    currentSection: isSectionSlug(section) ? section : null,
  }
}
