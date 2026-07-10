import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import styles from './AppLayout.module.css'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const openSidebar  = useCallback(() => setSidebarOpen(true),  [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  return (
    <div className={styles.layout}>
      {/* Mobile overlay — tap to close */}
      {sidebarOpen && (
        <div className={styles.overlay} onClick={closeSidebar} aria-hidden="true" />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className={`${styles.main} ${sidebarOpen ? styles.mainShifted : ''}`}>
        <Header onMenuClick={openSidebar} />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
