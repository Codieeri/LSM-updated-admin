import re

with open("client/src/pages/ApplicantsPage.tsx", "r") as f:
    content = f.read()

# Add customAnswers to AppRow
content = content.replace(
    "coverLetter?: string | null;",
    "coverLetter?: string | null;\n  customAnswers?: { question: string; answer: string }[];"
)

# Define CandidateProfileModal component
modal_component = """
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

  return (
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
    </div>
  );
}

export default function ApplicantsPage() {
"""

content = content.replace("export default function ApplicantsPage() {", modal_component)

inline_modal_pattern = re.compile(r"\{\/\* Candidate Profile Modal \*\/\}.*?(?=\<\/div\>\s*\<\/div\>\s*\)\s*\}\s*export)", re.DOTALL)

# In ApplicantsPage we need to replace the inline modal rendering:
# From `{/* Candidate Profile Modal */}` to the end of that block.
# Let's just find where it is and replace it.
old_modal_start = "{/* Candidate Profile Modal */}"
start_idx = content.find(old_modal_start)
if start_idx != -1:
    end_idx = content.find("      )}", start_idx) + 8
    
    # Wait, we need to pass handleAddNoteBase. 
    # Let's extract the old handleAddNote logic to be handleAddNoteBase
    
    replacement = """{/* Candidate Profile Modal */}
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
      )}"""
    
    content = content[:start_idx] + replacement + content[end_idx:]

with open("client/src/pages/ApplicantsPage.tsx", "w") as f:
    f.write(content)
