import { Bell, Search, Menu } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { format } from 'date-fns'
import styles from './Header.module.css'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth()
  const today = format(new Date(), 'EEEE, MMMM d, yyyy')

  const initials = user?.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()

  return (
    <header className={styles.header}>
      {/* Hamburger — only visible on mobile */}
      <button
        className={styles.menuBtn}
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      <div className={styles.left}>
        <div className={styles.dateText}>{today}</div>
      </div>

      <div className={styles.right}>
        {/* Search — hidden on small mobile, shown on tablet+ */}
        <div className={styles.searchBox}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search employees, reports..."
          />
        </div>

        {/* Notifications */}
        <button className={`btn btn-ghost btn-icon ${styles.notifBtn}`} aria-label="Notifications">
          <Bell size={18} />
          <span className={styles.notifDot} />
        </button>

        {/* User chip */}
        <div className={styles.userChip}>
          <div className={`avatar avatar-sm ${styles.avatar}`}>
            {initials}
          </div>
          <span className={styles.userName}>{user?.name}</span>
          <span className={`badge badge-brand ${styles.roleBadge}`}>{user?.role}</span>
        </div>
      </div>
    </header>
  )
}
