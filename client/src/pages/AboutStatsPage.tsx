import { useState, useEffect, useRef } from 'react'
import { Plus, Edit3, Trash2, AlertCircle, X, Image as ImageIcon } from 'lucide-react'
import styles from './AboutStatsPage.module.css'

type AboutStat = {
  _id?: string;
  id?: string;
  value: string;
  label: string;
  image: string;
  imageHeight: string;
  imagePosition: string;
  order: number;
};

const emptyForm = {
  value: "",
  label: "",
  imageHeight: "",
  imagePosition: "",
  order: 0,
};

export default function AboutStatsPage() {
  const [stats, setStats] = useState<AboutStat[]>([])
  const [statForm, setStatForm] = useState(emptyForm)
  const [editingStatId, setEditingStatId] = useState<string | null>(null)
  const [statToDelete, setStatToDelete] = useState<AboutStat | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/about-stats?t=${Date.now()}`, { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch stats")
      const data = await res.json()
      setStats(data.map((s: any) => ({ ...s, id: s._id })))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingStatId && !selectedFile) {
      alert("Image is required when creating a new stat.");
      return;
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("value", statForm.value)
      formData.append("label", statForm.label)
      formData.append("imageHeight", statForm.imageHeight)
      formData.append("imagePosition", statForm.imagePosition)
      formData.append("order", statForm.order.toString())
      
      if (selectedFile) {
        formData.append("image", selectedFile)
      }

      const isEditing = !!editingStatId
      const url = isEditing ? `/api/admin/about-stats/${editingStatId}` : "/api/admin/about-stats"
      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        body: formData,
      })

      if (!res.ok) throw new Error("Failed to save stat")
      
      await fetchStats()
      resetForm()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (stat: AboutStat) => {
    setEditingStatId(stat.id!)
    setStatForm({
      value: stat.value,
      label: stat.label,
      imageHeight: stat.imageHeight || "",
      imagePosition: stat.imagePosition || "",
      order: stat.order,
    })
    setSelectedFile(null)
    setPreviewImage(stat.image)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const confirmDeleteStat = async () => {
    if (!statToDelete) return
    try {
      const res = await fetch(`/api/admin/about-stats/${statToDelete.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete stat")
      setStats(stats.filter(s => s.id !== statToDelete.id))
      setStatToDelete(null)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const resetForm = () => {
    setStatForm(emptyForm)
    setEditingStatId(null)
    setSelectedFile(null)
    setPreviewImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>About Stats</h1>
          <p>Manage the stats section displayed on the Hiring Portal</p>
        </div>
      </header>

      {error && (
        <div className={styles.errorMessage}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className={styles.splitLayout}>
        {/* FORM SIDE */}
        <div className={styles.formSection}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                {editingStatId ? "Edit Stat" : "Create New Stat"}
              </h2>
              {editingStatId && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={resetForm}>
                  Cancel Edit
                </button>
              )}
            </div>
            <form onSubmit={handleCreateOrUpdate} className={styles.cardBody}>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Value (e.g. 12+, 40%) *</label>
                <input
                  type="text"
                  required
                  className={styles.input}
                  value={statForm.value}
                  onChange={e => setStatForm({ ...statForm, value: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Label (e.g. Interns Onboarded) *</label>
                <input
                  type="text"
                  required
                  className={styles.input}
                  value={statForm.label}
                  onChange={e => setStatForm({ ...statForm, label: e.target.value })}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Order</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={statForm.order}
                    onChange={e => setStatForm({ ...statForm, order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Image Height (Optional CSS)</label>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="e.g. 200px"
                    value={statForm.imageHeight}
                    onChange={e => setStatForm({ ...statForm, imageHeight: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Image Position (Optional CSS)</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="e.g. center"
                  value={statForm.imagePosition}
                  onChange={e => setStatForm({ ...statForm, imagePosition: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Image {!editingStatId && "*"}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className={styles.fileInput}
                  required={!editingStatId && !selectedFile}
                />
                {previewImage && (
                  <div className={styles.imagePreview}>
                    <img src={previewImage} alt="Preview" />
                  </div>
                )}
              </div>

              <div className={styles.formActions}>
                <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                  {submitting ? "Saving..." : editingStatId ? "Update Stat" : "Create Stat"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* LIST SIDE */}
        <div className={styles.listSection}>
          {loading ? (
            <div className={styles.loadingState}>Loading stats...</div>
          ) : stats.length === 0 ? (
            <div className={styles.emptyState}>
              <ImageIcon size={48} className={styles.emptyIcon} />
              <h3>No Stats Found</h3>
              <p>Create your first stat using the form.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {stats.map(stat => (
                <div key={stat.id} className={styles.statCard}>
                  <div className={styles.statImageWrapper}>
                    <img src={stat.image} alt={stat.label} style={{ objectPosition: stat.imagePosition, height: stat.imageHeight || '150px' }} />
                  </div>
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>{stat.value}</div>
                    <div className={styles.statLabel}>{stat.label}</div>
                    <div className={styles.statOrder}>Order: {stat.order}</div>
                    
                    <div className={styles.statActions}>
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(stat)}>
                        <Edit3 size={16} /> Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => setStatToDelete(stat)}>
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {statToDelete && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Confirm Delete</h3>
              <button className={styles.modalClose} onClick={() => setStatToDelete(null)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.alertBox}>
                <AlertCircle size={24} className={styles.alertIcon} />
                <div>
                  <p>Are you sure you want to delete the stat <strong>"{statToDelete.label}"</strong>?</p>
                  <p className={styles.alertSubtitle}>This action cannot be undone.</p>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className="btn btn-ghost" onClick={() => setStatToDelete(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDeleteStat}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
