import { Outlet } from 'react-router-dom'

import { ContentHeader } from './ContentHeader'
import { Sidebar } from './Sidebar'

export function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <section className="workspace-content">
        <ContentHeader />
        <Outlet />
      </section>
    </div>
  )
}
