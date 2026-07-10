import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Briefcase, ClipboardList, Users, LogOut, ChevronRight, X, BarChart, Bell
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import styles from './Sidebar.module.css'
const NAV_ITEMS = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',   roles: ['admin','hr','manager','employee'] },
  { to: '/jobs',        icon: Briefcase,       label: 'Job Management', roles: ['admin','hr','manager'] },
  { to: '/applicants',  icon: ClipboardList,   label: 'Applicants',  roles: ['admin','hr','manager'] },
  { to: '/employees',   icon: Users,           label: 'Employees',   roles: ['admin','hr','manager'] },
  { to: '/about-stats', icon: BarChart,        label: 'About Stats', roles: ['admin','hr','manager'] },
  { to: '/notifications', icon: Bell,          label: 'Notifications', roles: ['admin','hr'] },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const visibleItems = NAV_ITEMS.filter(item =>
    user && item.roles.includes(user.role)
  )

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U'

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      {/* Logo row with mobile close button */}
      <div className={styles.logo}>
        <div className={styles.logoIcon} style={{ background: 'white', boxShadow: 'none', padding: '2px' }}>
          <img src="/logo.png" alt="LocalSM" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} />
        </div>
        <div className={styles.logoText}>
          <div className={styles.logoName}>LocalSM</div>
          <div className={styles.logoTagline}>Hiring Panel</div>
        </div>
        {/* Close button — only visible on mobile */}
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <div className={styles.divider} />

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navSection}>
          <span className={styles.navLabel}>Menu</span>
          {visibleItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={17} />
              <span>{label}</span>
              <ChevronRight size={13} className={styles.chevron} />
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User card at bottom */}
      <div className={styles.userSection}>
        <div className={styles.divider} />
        <div className={styles.userCard}>
          <div className={`avatar avatar-sm ${styles.avatar}`}>{initials}</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.name}</div>
            <div className={styles.userRole}>{user?.role.toUpperCase()}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Logout">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
