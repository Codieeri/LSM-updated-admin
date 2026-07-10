import { useState, useEffect, useCallback } from 'react'
import { FileText, Briefcase, UserPlus, TrendingUp, RefreshCw, AlertCircle, Inbox } from 'lucide-react'
import { format } from 'date-fns'
import styles from './DashboardPage.module.css'

type Job = {
  id: string;
  title: string;
  category: string;
  description: string;
  location: string;
  salary: string;
  experience: string;
  employmentType: string;
  skills: string[];
  customQuestions: string[];
  openings: number;
  isOpen: boolean;
  createdAt: string;
};

type User = {
  name: string;
  email: string;
  role: string;
};

type AppRow = {
  id: string;
  phone: string;
  resume: string;
  linkedin: string;
  github: string;
  portfolio?: string | null;
  status: "PENDING" | "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED";
  createdAt: string;
  user: User;
  job: { title: string; category: string };
  location?: string | null;
  yearsExperience?: string | null;
  currentCompany?: string | null;
  expectedSalary?: string | null;
  coverLetter?: string | null;
};

type SelectedMetricType = 'total_applications' | 'open_positions' | 'new_applicants' | 'hired_analytics' | null;

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [applications, setApplications] = useState<AppRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [selectedMetric, setSelectedMetric] = useState<SelectedMetricType>('total_applications')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const timestamp = Date.now()
      const [jobsRes, appsRes] = await Promise.all([
        fetch(`/api/admin/jobs?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/admin/applications?t=${timestamp}`, { cache: 'no-store' }),
      ])

      if (!jobsRes.ok) throw new Error('Failed to load jobs')
      if (!appsRes.ok) throw new Error('Failed to load applications')

      const loadedJobs = await jobsRes.json()
      const loadedApps = await appsRes.json()

      setJobs(loadedJobs)
      setApplications(loadedApps)
      setLastUpdated(new Date())
    } catch (err: any) {
      console.error('Dashboard load error:', err)
      setError(err.message || 'An error occurred while loading dashboard metrics.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-refresh lifecycle
  useEffect(() => {
    // Initial load
    void load()

    // 5 second polling interval
    const intervalId = window.setInterval(() => {
      void load()
    }, 5000)

    // Window focus / Visibility change reload
    const handleFocus = () => {
      void load()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [load])

  // Derive metrics
  const totalApplications = applications.length
  const openPositions = jobs.filter(j => j.isOpen).length
  
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
  const newApplicantsCount = applications.filter(app => {
    const createdTime = new Date(app.createdAt).getTime()
    return Number.isFinite(createdTime) && Date.now() - createdTime < SEVEN_DAYS_MS
  }).length

  const hiredCount = applications.filter(app => app.status === 'HIRED').length
  const hiredRate = Math.round((hiredCount / Math.max(1, applications.length)) * 100)

  // Filter list data based on selected metric card
  const getSelectedMetricData = () => {
    switch (selectedMetric) {
      case 'total_applications':
        return {
          title: 'Total Applications',
          subtitle: 'List of all job applications received',
          headers: ['Applicant', 'Job Title', 'Applied Date', 'Status'],
          data: applications.map(app => ({
            id: app.id,
            col1: app.user?.name || 'Unknown',
            subcol1: app.user?.email || '',
            col2: app.job?.title || 'General',
            subcol2: app.job?.category || '',
            col3: format(new Date(app.createdAt), 'MMM d, yyyy'),
            status: app.status
          }))
        }
      case 'open_positions':
        return {
          title: 'Open Positions',
          subtitle: 'Active job openings currently accepting candidates',
          headers: ['Role Title', 'Category', 'Location / Type', 'Experience / Openings'],
          data: jobs.filter(j => j.isOpen).map(j => ({
            id: j.id,
            col1: j.title,
            subcol1: j.salary,
            col2: j.category,
            subcol2: j.employmentType.replace('_', ' '),
            col3: j.location,
            status: `Openings: ${j.openings}`
          }))
        }
      case 'new_applicants':
        return {
          title: 'New Applicants (Last 7 Days)',
          subtitle: 'Applicants who applied within the last rolling week',
          headers: ['Applicant', 'Job Applied', 'Applied Date', 'Status'],
          data: applications
            .filter(app => {
              const createdTime = new Date(app.createdAt).getTime()
              return Number.isFinite(createdTime) && Date.now() - createdTime < SEVEN_DAYS_MS
            })
            .map(app => ({
              id: app.id,
              col1: app.user?.name || 'Unknown',
              subcol1: app.user?.email || '',
              col2: app.job?.title || 'General',
              subcol2: app.job?.category || '',
              col3: format(new Date(app.createdAt), 'MMM d, yyyy'),
              status: app.status
            }))
        }
      case 'hired_analytics':
        return {
          title: 'Hired Candidates',
          subtitle: 'List of applicants successfully hired',
          headers: ['Candidate Name', 'Position Hired For', 'Hired Date', 'Status'],
          data: applications
            .filter(app => app.status === 'HIRED')
            .map(app => ({
              id: app.id,
              col1: app.user?.name || 'Unknown',
              subcol1: app.user?.email || '',
              col2: app.job?.title || 'General',
              subcol2: app.job?.category || '',
              col3: format(new Date(app.createdAt), 'MMM d, yyyy'),
              status: app.status
            }))
        }
      default:
        return null
    }
  }

  const metricDetails = getSelectedMetricData()

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'HIRED':
        return styles.badgeSuccess
      case 'SHORTLISTED':
      case 'REVIEWING':
        return styles.badgeWarning
      case 'REJECTED':
        return styles.badgeDanger
      case 'PENDING':
      default:
        if (status.startsWith('Openings:')) {
          return styles.badgeSuccess
        }
        return styles.badgeSecondary
    }
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageTitleInfo}>
          <h1 className={styles.pageTitle}>Admin Dashboard</h1>
          <p className="text-secondary text-sm">
            Hiring activity live snap • {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.lastUpdated}>
            Last sync: {format(lastUpdated, 'h:mm:ss a')}
          </span>
          <button 
            className={styles.refreshBtn} 
            onClick={load} 
            disabled={loading}
            title="Refresh dashboard stats manually"
          >
            <RefreshCw size={14} className={loading ? styles.spinning : ''} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card flex items-center gap-3 mb-6" style={{ borderColor: 'var(--color-danger)', background: 'hsl(0, 72%, 51%, 0.05)' }}>
          <AlertCircle className="text-danger" size={20} />
          <div>
            <div className="font-semibold text-danger">Connection Error</div>
            <div className="text-sm text-secondary">{error}</div>
          </div>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className={styles.kpiGrid}>
        {/* Total Applications Card */}
        <div 
          className={`${styles.kpiCard} ${selectedMetric === 'total_applications' ? styles.kpiCardActive : ''}`}
          onClick={() => setSelectedMetric('total_applications')}
        >
          <div className={`${styles.kpiIconWrapper} ${styles.icon_total}`}>
            <FileText size={20} />
          </div>
          <div className={styles.kpiValue}>{totalApplications}</div>
          <div className={styles.kpiLabel}>Total applications</div>
        </div>

        {/* Open Positions Card */}
        <div 
          className={`${styles.kpiCard} ${selectedMetric === 'open_positions' ? styles.kpiCardActive : ''}`}
          onClick={() => setSelectedMetric('open_positions')}
        >
          <div className={`${styles.kpiIconWrapper} ${styles.icon_open}`}>
            <Briefcase size={20} />
          </div>
          <div className={styles.kpiValue}>{openPositions}</div>
          <div className={styles.kpiLabel}>Open positions</div>
        </div>

        {/* New Applicants Card */}
        <div 
          className={`${styles.kpiCard} ${selectedMetric === 'new_applicants' ? styles.kpiCardActive : ''}`}
          onClick={() => setSelectedMetric('new_applicants')}
        >
          <div className={`${styles.kpiIconWrapper} ${styles.icon_new}`}>
            <UserPlus size={20} />
          </div>
          <div className={styles.kpiValue}>{newApplicantsCount}</div>
          <div className={styles.kpiLabel}>New applicants</div>
        </div>

        {/* Hiring Analytics Card */}
        <div 
          className={`${styles.kpiCard} ${selectedMetric === 'hired_analytics' ? styles.kpiCardActive : ''}`}
          onClick={() => setSelectedMetric('hired_analytics')}
        >
          <div className={`${styles.kpiIconWrapper} ${styles.icon_hired}`}>
            <TrendingUp size={20} />
          </div>
          <div className={styles.kpiValue}>{hiredRate}%</div>
          <div className={styles.kpiLabel}>Hiring analytics</div>
        </div>
      </div>

      {/* Interactive Detail Section */}
      {metricDetails && (
        <div className={styles.detailsContainer}>
          <div className={styles.detailsHeader}>
            <div>
              <h3 className={styles.detailsTitle}>{metricDetails.title}</h3>
              <p className={styles.detailsSubtitle}>{metricDetails.subtitle}</p>
            </div>
            <div className="text-muted text-xs font-medium">
              Showing {metricDetails.data.length} items
            </div>
          </div>

          <div className={styles.listWrapper}>
            {metricDetails.data.length === 0 ? (
              <div className={styles.emptyState}>
                <Inbox size={32} strokeWidth={1.5} />
                <div className={styles.emptyText}>No records found matching this metric</div>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    {metricDetails.headers.map((h, index) => (
                      <th key={index}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metricDetails.data.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          {row.subcol1 ? (
                            <div className={styles.avatar}>
                              {row.col1.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                          ) : (
                            <div className={`${styles.avatar} ${styles.avatarJob}`}>💼</div>
                          )}
                          <div>
                            <div className="font-semibold text-sm">{row.col1}</div>
                            {row.subcol1 && <div className="text-muted text-xs">{row.subcol1}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="font-medium text-sm">{row.col2}</div>
                        {row.subcol2 && <div className="text-muted text-xs">{row.subcol2}</div>}
                      </td>
                      <td className="text-secondary text-sm">{row.col3}</td>
                      <td>
                        <span className={`${styles.badge} ${getStatusClass(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
