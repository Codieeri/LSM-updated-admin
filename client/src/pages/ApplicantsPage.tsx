import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, Mail, Phone, ExternalLink, FileText, Download, User, MapPin, Briefcase, DollarSign, Clock, X, AlertCircle, RefreshCw, Inbox, ClipboardList, Trash2, Archive } from 'lucide-react'
import { format } from 'date-fns'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import styles from './ApplicantsPage.module.css'

type Note = { id: string; note: string };

type AppRow = {
  id: string;
  phone: string;
  resume: string;
  linkedin: string;
  github: string;
  portfolio?: string | null;
  status: "PENDING" | "REVIEWING" | "SHORTLISTED" | "REJECTED" | "HIRED";
  createdAt: string;
  user: { name: string; email: string };
  job: { title: string; category: string };
  notes: Note[];
  location?: string | null;
  yearsExperience?: string | null;
  currentCompany?: string | null;
  expectedSalary?: string | null;
  coverLetter?: string | null;
  customAnswers?: { question: string; answer: string }[];
  applicantName?: string;
  applicantEmail?: string;
};

const statusOptions = ["PENDING", "REVIEWING", "SHORTLISTED", "REJECTED", "HIRED"] as const;


function CandidateProfileModal({
  selected,
  setSelected,
  load,
  handleAddNoteBase
}: {
  selected: AppRow;
  setSelected: (app: AppRow | null) => void;
  load: () => Promise<void>;
  handleAddNoteBase: (note: string) => Promise<void>;
}) {
  const [noteDraft, setNoteDraft] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    applicantName: selected.user?.name || "",
    applicantEmail: selected.user?.email || "",
    phone: selected.phone || "",
    location: selected.location || "",
    yearsExperience: selected.yearsExperience || "",
    currentCompany: selected.currentCompany || "",
    expectedSalary: selected.expectedSalary || "",
    linkedin: selected.linkedin || "",
    github: selected.github || "",
    portfolio: selected.portfolio || "",
    coverLetter: selected.coverLetter || ""
  });
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteDraft.trim()) return;
    setIsSavingNote(true);
    await handleAddNoteBase(noteDraft);
    setNoteDraft("");
    setIsSavingNote(false);
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDetails(true);
    try {
      const res = await fetch(`/api/admin/applications/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Failed to update details");
      }
      const data = await res.json();
      
      // Update selected with new details
      const updatedUser = { ...selected.user, name: editForm.applicantName, email: editForm.applicantEmail };
      setSelected({
        ...selected,
        user: updatedUser,
        phone: editForm.phone,
        location: editForm.location,
        yearsExperience: editForm.yearsExperience,
        currentCompany: editForm.currentCompany,
        expectedSalary: editForm.expectedSalary,
        linkedin: editForm.linkedin,
        github: editForm.github,
        portfolio: editForm.portfolio,
        coverLetter: editForm.coverLetter
      });
      setIsEditing(false);
      await load();
    } catch (err: any) {
      alert(err.message || 'Failed to save details.');
    } finally {
      setIsSavingDetails(false);
    }
  };

  return createPortal(
    <div className={styles.modalOverlay} onClick={() => setSelected(null)}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalCloseBtn} onClick={() => setSelected(null)}>
          <X size={18} />
        </button>

        {isEditing ? (
          <form onSubmit={handleSaveDetails} className="p-2">
            <h3 className={styles.modalTitle} style={{ marginBottom: '1rem' }}>Edit Candidate Details</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold mb-1">Name</label>
                <input required className="w-full px-3 py-2 border rounded text-sm" value={editForm.applicantName} onChange={e => setEditForm({...editForm, applicantName: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Email</label>
                <input required type="email" className="w-full px-3 py-2 border rounded text-sm" value={editForm.applicantEmail} onChange={e => setEditForm({...editForm, applicantEmail: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Phone</label>
                <input required className="w-full px-3 py-2 border rounded text-sm" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Location</label>
                <input className="w-full px-3 py-2 border rounded text-sm" value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Years Experience</label>
                <input type="number" className="w-full px-3 py-2 border rounded text-sm" value={editForm.yearsExperience} onChange={e => setEditForm({...editForm, yearsExperience: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Current Company</label>
                <input className="w-full px-3 py-2 border rounded text-sm" value={editForm.currentCompany} onChange={e => setEditForm({...editForm, currentCompany: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Expected Salary</label>
                <input className="w-full px-3 py-2 border rounded text-sm" value={editForm.expectedSalary} onChange={e => setEditForm({...editForm, expectedSalary: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-bold mb-1">LinkedIn</label>
                <input className="w-full px-3 py-2 border rounded text-sm" value={editForm.linkedin} onChange={e => setEditForm({...editForm, linkedin: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">GitHub</label>
                <input className="w-full px-3 py-2 border rounded text-sm" value={editForm.github} onChange={e => setEditForm({...editForm, github: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Portfolio</label>
                <input className="w-full px-3 py-2 border rounded text-sm" value={editForm.portfolio} onChange={e => setEditForm({...editForm, portfolio: e.target.value})} />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-xs font-bold mb-1">Cover Letter</label>
              <textarea className="w-full px-3 py-2 border rounded text-sm" rows={4} value={editForm.coverLetter} onChange={e => setEditForm({...editForm, coverLetter: e.target.value})} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSavingDetails}>{isSavingDetails ? 'Saving...' : 'Save Details'}</button>
            </div>
          </form>
        ) : (
          <>
            {/* Profile Header */}
            <div className={styles.candidateHeader}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 className={styles.modalTitle}>Candidate Profile</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(true)}>Edit Details</button>
              </div>
              <p style={{ marginTop: '0.4rem', fontSize: 'var(--text-sm)' }}>
                <strong>{selected.user?.name || 'Candidate'}</strong> • {selected.user?.email} • {selected.phone}
              </p>
              
              {/* Social Links */}
              <div className={styles.candidateLinks}>
                <a className={styles.linkItem} href={selected.linkedin} target="_blank" rel="noopener noreferrer">
                  LinkedIn <ExternalLink size={11} />
                </a>
                <a className={styles.linkItem} href={selected.github} target="_blank" rel="noopener noreferrer">
                  GitHub <ExternalLink size={11} />
                </a>
                {selected.portfolio && (
                  <a className={styles.linkItem} href={selected.portfolio} target="_blank" rel="noopener noreferrer">
                    Portfolio <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>

            {/* Resume Links */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <a
                className={styles.linkItem}
                href={`/api/admin/applications/${selected.id}/resume`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText size={13} /> Preview Resume
              </a>
              <a
                className={styles.linkItem}
                href={`/api/admin/applications/${selected.id}/resume?download=1`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download size={13} /> Download Resume File
              </a>
            </div>

            {/* Candidate Metadata Details */}
            <div className={styles.detailsGrid}>
              <div>
                <span className={styles.detailLabel}>📍 Current Location:</span>
                <div style={{ marginTop: '0.15rem' }}>{selected.location || "—"}</div>
              </div>
              <div>
                <span className={styles.detailLabel}>⏱ Experience:</span>
                <div style={{ marginTop: '0.15rem' }}>{selected.yearsExperience ? `${selected.yearsExperience} Year(s)` : "—"}</div>
              </div>
              <div>
                <span className={styles.detailLabel}>🏢 Current Company:</span>
                <div style={{ marginTop: '0.15rem' }}>{selected.currentCompany || "—"}</div>
              </div>
              <div>
                <span className={styles.detailLabel}>💵 Expected Salary:</span>
                <div style={{ marginTop: '0.15rem' }}>{selected.expectedSalary ? `₹ ${selected.expectedSalary}` : "—"}</div>
              </div>
            </div>

            {/* Custom Answers */}
            {selected.customAnswers && selected.customAnswers.length > 0 && (
              <div className={styles.coverLetterSection}>
                <span className={styles.sectionTitle}>Application Questions</span>
                <div className={styles.coverLetterContent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {selected.customAnswers.map((ca, i) => (
                    <div key={i}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-dark)' }}>Q: {ca.question}</div>
                      <div style={{ color: 'var(--text-secondary)' }}>A: {ca.answer || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cover Letter */}
            <div className={styles.coverLetterSection}>
              <span className={styles.sectionTitle}>Cover Letter</span>
              <div className={styles.coverLetterContent}>
                {selected.coverLetter || "—"}
              </div>
            </div>

            {/* Internal Admin Notes */}
            <div className={styles.notesSection}>
              <span className={styles.sectionTitle}>Recruiter Internal Notes</span>
              
              <div className={styles.notesList}>
                {selected.notes.length === 0 ? (
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No notes added yet for this candidate.</p>
                ) : (
                  selected.notes.map((n) => (
                    <div key={n.id} className={styles.noteItem}>
                      • {n.note}
                    </div>
                  ))
                )}
              </div>

              {/* Note Submission Form */}
              <form className={styles.noteForm} onSubmit={handleAddNote}>
                <input
                  required
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  className={styles.noteInput}
                  placeholder="Write a recruiter note about this candidate..."
                  disabled={isSavingNote}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingNote || !noteDraft.trim()}
                >
                  {isSavingNote ? 'Saving...' : 'Add Note'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function ApplicantsPage() {

  const [applications, setApplications] = useState<AppRow[]>([])
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [selected, setSelected] = useState<AppRow | null>(null)
  const [noteDraft, setNoteDraft] = useState("")
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  
  // Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isZipping, setIsZipping] = useState(false)

  // Fetch applications from server
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/applications?t=${Date.now()}`, { cache: "no-store" })
      if (!response.ok) throw new Error('Failed to load applications')
      const data = await response.json()
      setApplications(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (err: any) {
      console.error('Error loading applications:', err)
      setError(err.message || 'Could not load applications from backend.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-refresh lifecycle
  useEffect(() => {
    void load()

    const intervalId = window.setInterval(() => {
      void load()
    }, 5000)

    const handleFocus = () => {
      void load()
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleFocus)
    }
  }, [load])

  // Sync selected candidate inside modal if the list updates
  useEffect(() => {
    if (!selected) return
    const updated = applications.find(a => a.id === selected.id)
    if (updated) {
      setSelected(updated)
    }
  }, [applications, selected])

  // Derived filter list
  const filteredApplications = useMemo(() => {
    const q = query.trim().toLowerCase()
    return applications.filter((a) => {
      const matchesQ = !q ||
        a.user.name.toLowerCase().includes(q) ||
        a.user.email.toLowerCase().includes(q) ||
        a.job.title.toLowerCase().includes(q)
      
      const matchesS = !statusFilter || a.status === statusFilter
      return matchesQ && matchesS
    })
  }, [applications, query, statusFilter])

  // Update applicant status
  const handleStatusChange = async (app: AppRow, nextStatus: AppRow["status"]) => {
    // Optimistic UI update
    const previousApplications = [...applications]
    setApplications((prev) =>
      prev.map((row) => (row.id === app.id ? { ...row, status: nextStatus } : row))
    )

    try {
      const res = await fetch(`/api/admin/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })

      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(payload?.error || "Failed to update status")
      }


      await load()
    } catch (err: any) {
      alert(err.message || 'An error occurred while updating status.')
      // Rollback on error
      setApplications(previousApplications)
      await load()
    }
  }

  // Delete applicant
  const handleDelete = async (app: AppRow) => {
    if (!window.confirm(`Are you sure you want to delete the application for ${app.user?.name}?`)) {
      return
    }
    
    // Optimistic update
    const previousApplications = [...applications]
    setApplications(prev => prev.filter(row => row.id !== app.id))
    
    try {
      const res = await fetch(`/api/admin/applications/${app.id}`, {
        method: "DELETE"
      })
      
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || "Failed to delete application")
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete application.')
      setApplications(previousApplications)
    }
  }

  // Add notes handler
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    
    const note = noteDraft.trim()
    if (!note) return

    setIsSavingNote(true)
    try {
      const res = await fetch(`/api/admin/applications/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error || "Failed to add note")
      }

      setNoteDraft("")
      // Optimistic note append
      setSelected((prev) =>
        prev
          ? {
              ...prev,
              notes: [...prev.notes, { id: `tmp-${Date.now()}`, note }]
            }
          : prev
      )
      
      await load()
    } catch (err: any) {
      alert(err.message || 'Failed to save note.')
    } finally {
      setIsSavingNote(false)
    }
  }

  // Selection Handlers
  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredApplications.map(a => a.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // CSV Generator Logic
  const generateCSV = (apps: AppRow[], filename: string) => {
    if (apps.length === 0) {
      alert("No applications to export.");
      return;
    }
    const headers = [
      "Name", "Email", "Phone", "Status", "Job Title", "Category", 
      "Location", "Years Experience", "Current Company", "Expected Salary", 
      "LinkedIn", "GitHub", "Portfolio", "Applied At"
    ];

    const escapeCSV = (value: any) => {
      if (value === null || value === undefined || value === "") return '""';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = apps.map(app => [
      escapeCSV(app.user?.name || app.applicantName || 'Unknown Candidate'),
      escapeCSV(app.user?.email || app.applicantEmail || 'N/A'),
      escapeCSV(app.phone ? `="${app.phone}"` : 'N/A'),
      escapeCSV(app.status),
      escapeCSV(app.job?.title || 'General Position'),
      escapeCSV(app.job?.category || 'General'),
      escapeCSV(app.location || 'N/A'),
      escapeCSV(app.yearsExperience || 'N/A'),
      escapeCSV(app.currentCompany || 'N/A'),
      escapeCSV(app.expectedSalary || 'N/A'),
      escapeCSV(app.linkedin || 'N/A'),
      escapeCSV(app.github || 'N/A'),
      escapeCSV(app.portfolio || 'N/A'),
      escapeCSV(app.createdAt ? new Date(app.createdAt).toLocaleString() : 'N/A')
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    generateCSV(filteredApplications, `applicants_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
  };

  const handleExportSelectedCSV = () => {
    const selectedApps = filteredApplications.filter(a => selectedIds.has(a.id));
    generateCSV(selectedApps, `selected_applicants_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
  };

  // Download Resumes
  const handleDownloadResumes = async () => {
    if (selectedIds.size === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("Resumes");
      const selectedApps = filteredApplications.filter(a => selectedIds.has(a.id));
      
      let successCount = 0;
      for (const app of selectedApps) {
        try {
          const response = await fetch(`/api/admin/applications/${app.id}/resume?download=1`);
          if (response.ok) {
            const blob = await response.blob();
            let filename = `resume_${app.user?.name || app.applicantName || app.id}.pdf`.replace(/[^a-z0-9.-]/gi, '_');
            const contentDisposition = response.headers.get('content-disposition');
            if (contentDisposition && contentDisposition.includes('filename=')) {
              filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
            }
            folder?.file(filename, blob);
            successCount++;
          }
        } catch (e) {
          console.error(`Failed to download resume for ${app.id}`, e);
        }
      }
      
      if (successCount > 0) {
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `resumes_${format(new Date(), 'yyyyMMdd_HHmmss')}.zip`);
      } else {
        alert("Failed to download any resumes.");
      }
    } catch (e: any) {
      alert("Error generating zip: " + e.message);
    } finally {
      setIsZipping(false);
    }
  };

  const getBadgeClass = (status: AppRow["status"]) => {
    switch (status) {
      case 'HIRED': return styles.badge_hired
      case 'SHORTLISTED': return styles.badge_shortlisted
      case 'REVIEWING': return styles.badge_reviewing
      case 'REJECTED': return styles.badge_rejected
      case 'PENDING':
      default: return styles.badge_pending
    }
  }

  return (
    <div className="fade-in">
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Applicants</h1>
          <p className={styles.subtitle}>Review candidate applications and shortlist matches</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Sync: {format(lastUpdated, 'h:mm:ss a')}
          </span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={load} disabled={loading} title="Sync Applicants">
            <RefreshCw size={14} className={loading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="card flex items-center gap-3 mb-6" style={{ borderColor: 'var(--color-danger)', background: 'hsl(0, 72%, 51%, 0.05)' }}>
          <AlertCircle className="text-danger" size={20} />
          <div className="text-sm text-secondary">{error}</div>
        </div>
      )}

      {/* Toolbar filters */}
      <div className={styles.toolbar}>
        <div className={styles.searchInputWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search candidate, email, role..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        
        {selectedIds.size > 0 ? (
          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, alignSelf: 'center', marginRight: '0.5rem', color: 'var(--text-secondary)' }}>
              {selectedIds.size} selected
            </span>
            <button 
              className="btn btn-outline btn-sm" 
              onClick={handleExportSelectedCSV} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
            >
              <Download size={14} /> Export Selected CSV
            </button>
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleDownloadResumes} 
              disabled={isZipping}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
            >
              <Archive size={14} /> {isZipping ? 'Zipping...' : 'Download Resumes'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', marginLeft: 'auto' }}>
            <button 
              className="btn btn-outline btn-sm" 
              onClick={handleExportCSV} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}
              title="Export current view to CSV"
            >
              <Download size={14} /> Export View CSV
            </button>
          </div>
        )}
      </div>

      {/* Applications Table */}
      <div className={styles.tableContainer}>
        <div className={styles.tableWrap}>
          {filteredApplications.length === 0 ? (
            <div className={styles.emptyState}>
              <Inbox size={36} strokeWidth={1.5} />
              <div className={styles.emptyText}>No applications found matching filters</div>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      onChange={handleToggleSelectAll} 
                      checked={filteredApplications.length > 0 && selectedIds.size === filteredApplications.length}
                    />
                  </th>
                  <th>Candidate</th>
                  <th>Field</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Resume</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => (
                  <tr key={app.id} style={{ backgroundColor: selectedIds.has(app.id) ? 'var(--bg-muted)' : '' }}>
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(app.id)} 
                        onChange={() => handleToggleSelect(app.id)}
                      />
                    </td>
                    <td>
                      <div className={styles.candidateCell}>
                        <span className={styles.candidateName}>{app.user?.name || 'Unknown Candidate'}</span>
                        <div className={styles.candidateSubtext}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Mail size={10} /> {app.user?.email || '—'}
                          </span>
                          <br />
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Phone size={10} /> {app.phone}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <span className="badge badge-muted">{app.job?.category || 'General'}</span>
                    </td>
                    <td style={{ verticalAlign: 'middle', fontWeight: 500 }}>
                      {app.job?.title || 'General Position'}
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <span className={`${styles.badge} ${getBadgeClass(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <a
                        href={`/api/admin/applications/${app.id}/resume?download=1`}
                        className={styles.linkItem}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Download candidate resume file"
                      >
                        <Download size={13} /> Download
                      </a>
                    </td>
                    <td style={{ verticalAlign: 'middle' }}>
                      <div className={styles.actionsCell}>
                        <select
                          className={styles.statusDropdown}
                          value={app.status}
                          onChange={(e) => handleStatusChange(app, e.target.value as AppRow["status"])}
                        >
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button
                          className={styles.profileBtn}
                          onClick={() => { setSelected(app); setNoteDraft(""); }}
                        >
                          Profile
                        </button>
                        <button
                          className="btn btn-ghost btn-sm text-danger"
                          style={{ padding: '0.25rem' }}
                          onClick={() => handleDelete(app)}
                          title="Delete Application"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Candidate Profile Modal */}
      {selected && (
        <CandidateProfileModal
          selected={selected}
          setSelected={setSelected}
          load={load}
          handleAddNoteBase={async (note) => {
            const res = await fetch(`/api/admin/applications/${selected.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ note }),
            });
            if (!res.ok) {
              const payload = await res.json().catch(() => null);
              throw new Error(payload?.error || "Failed to add note");
            }
            setSelected((prev) =>
              prev
                ? {
                    ...prev,
                    notes: [...prev.notes, { id: `tmp-${Date.now()}`, note }]
                  }
                : prev
            );
            await load();
          }}
        />
      )}

    </div>
  )
}
