import { useState, useEffect } from 'react'
import { Mail, MessageSquare, Bell, Save, CheckCircle2, Send, AlertCircle } from 'lucide-react'
import styles from './NotificationsPage.module.css'

type NotificationSettings = {
  enabled: boolean
  hrEmail: string
  hrPhone: string
  notifyByEmail: boolean
  notifyByMessage: boolean
}

const emptySettings: NotificationSettings = {
  enabled: true,
  hrEmail: 'riyasonara079@gmail.com',
  hrPhone: '9512506193',
  notifyByEmail: true,
  notifyByMessage: true,
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(emptySettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)
  const [testMsg, setTestMsg] = useState<string | null>(null)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/notification-settings?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch notification settings')
      const data = await res.json()
      setSettings({
        enabled: data.enabled,
        hrEmail: data.hrEmail,
        hrPhone: data.hrPhone,
        notifyByEmail: data.notifyByEmail,
        notifyByMessage: data.notifyByMessage,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSavedMsg(null)
    try {
      const res = await fetch('/api/admin/notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error('Failed to save notification settings')
      setSavedMsg('Settings saved. HR will be notified automatically for every new candidate.')
      setTimeout(() => setSavedMsg(null), 4000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestMsg(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/notification-settings/test', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send test notification')
      const parts = []
      parts.push(`Email: ${data.email?.ok ? `sent (${data.email.provider})` : 'not sent (check provider config)'}`)
      parts.push(`Message: ${data.message?.ok ? `sent (${data.message.provider})` : 'not sent (Twilio not configured)'}`)
      setTestMsg(parts.join(' · '))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return <div className={styles.container}><div className={styles.loadingState}>Loading notification settings...</div></div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Notifications</h1>
          <p>Automatically alert HR by email and personal message whenever a new candidate applies.</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleRow}>
            <Bell size={18} />
            <span className={styles.cardTitle}>New Candidate Alerts</span>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            />
            <span className={styles.slider} />
          </label>
        </div>

        <form onSubmit={handleSave} className={styles.form}>
          <p className={styles.helperText}>
            When enabled, HR receives all the details of a new candidate (name, contact info, resume link,
            cover letter, and answers) the moment they apply — no need to check the Applicants page manually.
          </p>

          <div className={styles.channelRow}>
            <div className={styles.channelHeader}>
              <Mail size={16} />
              <span>Email Notification</span>
              <label className={styles.toggleSmall}>
                <input
                  type="checkbox"
                  checked={settings.notifyByEmail}
                  onChange={(e) => setSettings({ ...settings, notifyByEmail: e.target.checked })}
                />
                <span className={styles.sliderSmall} />
              </label>
            </div>
            <div className={styles.formGroup}>
              <label className="label">HR Email Address</label>
              <input
                type="email"
                className="input"
                required
                value={settings.hrEmail}
                onChange={(e) => setSettings({ ...settings, hrEmail: e.target.value })}
                placeholder="hr@company.com"
              />
            </div>
          </div>

          <div className={styles.channelRow}>
            <div className={styles.channelHeader}>
              <MessageSquare size={16} />
              <span>Personal Message (SMS / WhatsApp)</span>
              <label className={styles.toggleSmall}>
                <input
                  type="checkbox"
                  checked={settings.notifyByMessage}
                  onChange={(e) => setSettings({ ...settings, notifyByMessage: e.target.checked })}
                />
                <span className={styles.sliderSmall} />
              </label>
            </div>
            <div className={styles.formGroup}>
              <label className="label">HR Phone Number</label>
              <input
                type="tel"
                className="input"
                required
                value={settings.hrPhone}
                onChange={(e) => setSettings({ ...settings, hrPhone: e.target.value })}
                placeholder="9512506193"
              />
              <p className={styles.fieldHint}>
                Indian numbers are sent with the +91 prefix automatically. Requires SMS/WhatsApp
                provider credentials (Twilio) to be configured on the backend — email alerts work independently.
              </p>
            </div>
          </div>

          {error && (
            <div className={styles.alertBox}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          {savedMsg && (
            <div className={styles.successBox}>
              <CheckCircle2 size={16} />
              <span>{savedMsg}</span>
            </div>
          )}
          {testMsg && (
            <div className={styles.infoBox}>
              <Send size={16} />
              <span>{testMsg}</span>
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className="btn btn-secondary" onClick={handleTest} disabled={testing}>
              <Send size={16} />
              {testing ? 'Sending test...' : 'Send Test Notification'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
