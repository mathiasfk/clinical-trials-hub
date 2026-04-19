import { NavLink } from 'react-router-dom'

import { EDIT_SECTION_ORDER, SECTION_LABELS, SECTION_ORDER } from '../sections/constants'
import type { SectionSlug } from '../sections/constants'
import { useActiveContext } from './useActiveContext'

export function Sidebar() {
  const active = useActiveContext()

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="sidebar-block">
        <p className="eyebrow">Clinical Trials Hub</p>
        <h1>Studies</h1>
      </div>

      <nav className="sidebar-nav" aria-label="All studies">
        <p className="sidebar-section-label">All studies</p>
        <NavLink to="/studies" end>
          All studies
        </NavLink>
      </nav>

      {active.kind !== 'none' ? (
        <nav className="sidebar-nav" aria-label="Study outline">
          <p className="sidebar-section-label">Study outline</p>
          {renderOutlineLinks(active)}
          {active.kind === 'new' ? (
            <p className="sidebar-draft-indicator">Unpublished draft</p>
          ) : null}
        </nav>
      ) : null}
    </aside>
  )
}

function renderOutlineLinks(
  active: Exclude<ReturnType<typeof useActiveContext>, { kind: 'none' }>,
) {
  const order: SectionSlug[] = active.kind === 'new' ? [...SECTION_ORDER] : EDIT_SECTION_ORDER
  const basePath = active.kind === 'new' ? '/studies/new' : `/studies/${active.studyId}`

  return order.map((section) => (
    <NavLink key={section} to={`${basePath}/${section}`}>
      {SECTION_LABELS[section]}
    </NavLink>
  ))
}
