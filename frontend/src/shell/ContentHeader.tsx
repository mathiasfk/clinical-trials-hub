import { SECTION_LABELS } from '../sections/constants'
import { useActiveContext } from './useActiveContext'

export function ContentHeader() {
  const active = useActiveContext()

  if (active.kind === 'none') {
    return (
      <header className="content-header">
        <p className="eyebrow">Study registration</p>
        <h1>All studies</h1>
      </header>
    )
  }

  const subtitle = active.currentSection ? SECTION_LABELS[active.currentSection] : ''
  const identifier = active.kind === 'new' ? 'New study' : active.studyId
  const isDraft = active.kind === 'new'
  const combinedTitle = subtitle ? `${identifier} > ${subtitle}` : identifier

  return (
    <header className="content-header">
      <div>
        <p className="eyebrow">Study</p>
        <h1>
          {combinedTitle}
          {isDraft ? <span className="draft-badge">Unpublished draft</span> : null}
        </h1>
      </div>
    </header>
  )
}
