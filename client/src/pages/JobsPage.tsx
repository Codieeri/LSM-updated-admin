import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit3, Trash2, Calendar, MapPin, DollarSign, Award, Users, AlertCircle, RefreshCw, X, HelpCircle, Briefcase, Image as ImageIcon, BarChart } from 'lucide-react'
import styles from './JobsPage.module.css'
import AboutStatsPage from './AboutStatsPage'

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

const defaultCategories = ["Web Development", "App Development", "Graphics Design"];
const experienceOptions = ["Intern", "Fresher", "Mid-level", "Experienced"];
const employmentTypeOptions = ["Part Time", "Full Time"];

const getFallbackImage = (deptName: string) => {
  const map: Record<string, string> = {
    "Marketing": "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&q=80",
    "QA": "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80",
    "Product Management": "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600&q=80",
    "Web Development": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=80",
    "Cybersecurity": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&q=80",
    "Management": "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80",
    "UI/UX Design": "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=600&q=80",
    "Graphics Design": "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&q=80",
  };
  return map[deptName] || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=80";
};

const emptyForm = {
  title: "",
  category: defaultCategories[0],
  description: "",
  location: "",
  salary: "",
  experience: experienceOptions[0],
  employmentType: employmentTypeOptions[1],
  openings: 1,
  skills: "",
  customQuestions: [] as string[]
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobForm, setJobForm] = useState(emptyForm)
  const [categories, setCategories] = useState<string[]>(defaultCategories)
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("")
  const [questionSuggestions, setQuestionSuggestions] = useState<string[]>([])
  const [questionInput, setQuestionInput] = useState("")
  const [editingJobId, setEditingJobId] = useState<string | null>(null)
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  const [activeTab, setActiveTab] = useState<'jobs' | 'categories' | 'about'>('jobs')
  const [departmentsData, setDepartmentsData] = useState<any[]>([])
  const [loadingDepts, setLoadingDepts] = useState(false)

  // Skill parsing utility
  const parseSkills = (value: string) => {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Load jobs and suggestions
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/jobs?t=${Date.now()}`, { cache: "no-store" })
      if (!response.ok) throw new Error('Failed to load jobs')
      
      const loadedJobs: Job[] = await response.json()
      setJobs(loadedJobs)
      
      // Category merging
      const fromJobsCategories = Array.from(new Set(loadedJobs.map((j) => j.category).filter(Boolean)))
      const savedCategories = JSON.parse(localStorage.getItem("admin_categories") || "[]") as string[]
      const mergedCategories = Array.from(new Set([...defaultCategories, ...fromJobsCategories, ...savedCategories]))
      setCategories(mergedCategories)
      
      // Skill suggestions merging
      const fromJobsSkills = Array.from(new Set(loadedJobs.flatMap((j) => j.skills || []).map((s) => s.trim()).filter(Boolean)))
      const savedSkills = JSON.parse(localStorage.getItem("admin_skill_suggestions") || "[]") as string[]
      const mergedSkills = Array.from(new Set([...fromJobsSkills, ...savedSkills]))
      setSkillSuggestions(mergedSkills)
      
      // Custom questions suggestions merging
      const fromJobsQuestions = Array.from(new Set(loadedJobs.flatMap((j) => j.customQuestions || []).map((q) => q.trim()).filter(Boolean)))
      const savedQuestionSuggestions = JSON.parse(localStorage.getItem("admin_question_suggestions") || "[]") as string[]
      const mergedQuestions = Array.from(new Set([...fromJobsQuestions, ...savedQuestionSuggestions]))
      setQuestionSuggestions(mergedQuestions)
      
      // Update local storage
      localStorage.setItem("admin_categories", JSON.stringify(mergedCategories))
      localStorage.setItem("admin_skill_suggestions", JSON.stringify(mergedSkills))
      localStorage.setItem("admin_question_suggestions", JSON.stringify(mergedQuestions))
      setError(null)
    } catch (err: any) {
      console.error('Error fetching jobs:', err)
      setError(err.message || 'Could not connect to the server to fetch job listings.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDepartments = useCallback(async () => {
    try {
      setLoadingDepts(true)
      const res = await fetch('/api/admin/departments/all?t=' + Date.now())
      if (res.ok) {
        const data = await res.json()
        setDepartmentsData(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingDepts(false)
    }
  }, [])

  // Auto-refresh lifecycle
  useEffect(() => {
    void load()
    loadDepartments()

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
  }, [load, loadDepartments])

  // Category select with Add option
  const handleCategoryChange = (value: string) => {
    if (value !== "__add__") {
      setJobForm((prev) => ({ ...prev, category: value }))
      return
    }
    const newCategory = prompt("Add new category")?.trim()
    if (!newCategory) return
    const merged = Array.from(new Set([...categories, newCategory]))
    setCategories(merged)
    localStorage.setItem("admin_categories", JSON.stringify(merged))
    setJobForm((prev) => ({ ...prev, category: newCategory }))
  }

  // Comma-separated skills handling
  const handleSkillsKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return
    e.preventDefault()
    const entered = parseSkills(skillInput)
    if (!entered.length) return
    const mergedSkills = Array.from(new Set([...skillSuggestions, ...entered]))
    setSkillSuggestions(mergedSkills)
    localStorage.setItem("admin_skill_suggestions", JSON.stringify(mergedSkills))
  }

  const addSuggestedSkill = (skill: string) => {
    const current = parseSkills(skillInput)
    if (current.includes(skill)) return
    const next = [...current, skill].join(", ")
    setSkillInput(next)
    setJobForm((prev) => ({ ...prev, skills: next }))
  }

  // Filter skills for suggestion box (exclude current, max 8)
  const currentSkillTokens = parseSkills(skillInput)
  const visibleSkillSuggestions = skillSuggestions
    .filter((s) => !currentSkillTokens.includes(s))
    .slice(0, 8)

  // Custom question helpers
  const addCustomQuestion = () => {
    const question = questionInput.trim()
    if (!question) return
    if (jobForm.customQuestions.includes(question)) {
      setQuestionInput("")
      return
    }
    setJobForm((prev) => ({ ...prev, customQuestions: [...prev.customQuestions, question] }))
    setQuestionInput("")
  }

  const addSuggestedQuestion = (question: string) => {
    if (jobForm.customQuestions.includes(question)) return
    setJobForm((prev) => ({ ...prev, customQuestions: [...prev.customQuestions, question] }))
  }

  const removeCustomQuestion = (question: string) => {
    setJobForm((prev) => ({
      ...prev,
      customQuestions: prev.customQuestions.filter((q) => q !== question)
    }))
  }

  // Filter custom questions suggestions (exclude current, max 8)
  const visibleQuestionSuggestions = questionSuggestions
    .filter((q) => !jobForm.customQuestions.includes(q))
    .slice(0, 8)

  // Submit form (create or edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    const parsedSkills = parseSkills(skillInput || jobForm.skills)
    const openingsVal = Math.max(1, Number(jobForm.openings) || 1)
    
    const payload = {
      ...jobForm,
      openings: openingsVal,
      skills: parsedSkills,
      customQuestions: jobForm.customQuestions,
      isOpen: true // Re-opens edited jobs as per source logic behavior
    }

    const isEditing = Boolean(editingJobId)
    const endpoint = isEditing ? `/api/admin/jobs/${editingJobId}` : "/api/admin/jobs"
    const method = isEditing ? "PATCH" : "POST"

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        throw new Error(errorData?.error || `Failed to ${isEditing ? "update" : "create"} job`)
      }

      // Merge suggestions and update state/local storage
      const mergedSkills = Array.from(new Set([...skillSuggestions, ...parsedSkills]))
      const mergedQuestions = Array.from(new Set([...questionSuggestions, ...jobForm.customQuestions]))
      
      setSkillSuggestions(mergedSkills)
      setQuestionSuggestions(mergedQuestions)
      localStorage.setItem("admin_skill_suggestions", JSON.stringify(mergedSkills))
      localStorage.setItem("admin_question_suggestions", JSON.stringify(mergedQuestions))

      // Reset form
      setJobForm({
        title: "",
        category: categories[0] || defaultCategories[0],
        description: "",
        location: "",
        salary: "",
        experience: experienceOptions[0],
        employmentType: employmentTypeOptions[1],
        openings: 1,
        skills: "",
        customQuestions: []
      })
      setSkillInput("")
      setQuestionInput("")
      setEditingJobId(null)
      
      await load()
    } catch (err: any) {
      alert(err.message || 'An error occurred while saving the job.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCategoryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, categoryName?: string) => {
    const file = e.target.files?.[0];
    const targetCategory = categoryName || jobForm.category;
    if (!file || !targetCategory) return;
    
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      
      const res = await fetch(`/api/admin/departments/${encodeURIComponent(targetCategory)}/image`, {
        method: "POST",
        body: formData
      });
      
      if (res.ok) {
        alert("Category banner image uploaded successfully!");
        loadDepartments();
      } else {
        alert("Failed to upload category image.");
      }
    } catch (error) {
      console.error(error);
      alert("Error uploading image");
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleCategoryFileDelete = async (categoryName: string) => {
    if (!confirm(`Are you sure you want to delete the image for ${categoryName}?`)) return;
    
    setUploadingImage(true);
    try {
      const res = await fetch(`/api/admin/departments/${encodeURIComponent(categoryName)}/image`, {
        method: "DELETE"
      });
      
      if (res.ok) {
        alert("Category banner image deleted successfully!");
        loadDepartments();
      } else {
        alert("Failed to delete category image.");
      }
    } catch (error) {
      console.error(error);
      alert("Error deleting image");
    } finally {
      setUploadingImage(false);
    }
  };

  // Edit action
  const startEditingJob = (job: Job) => {
    setEditingJobId(job.id)
    setJobForm({
      title: job.title,
      category: job.category,
      description: job.description,
      location: job.location,
      salary: job.salary,
      experience: job.experience,
      employmentType: job.employmentType,
      openings: Math.max(1, Number(job.openings) || 1),
      skills: (job.skills || []).join(", "),
      customQuestions: job.customQuestions || [],
    })
    setSkillInput((job.skills || []).join(", "))
    setQuestionInput("")
  }

  const cancelEditingJob = () => {
    setEditingJobId(null)
    setJobForm({
      title: "",
      category: categories[0] || defaultCategories[0],
      description: "",
      location: "",
      salary: "",
      experience: experienceOptions[0],
      employmentType: employmentTypeOptions[1],
      openings: 1,
      skills: "",
      customQuestions: []
    })
    setSkillInput("")
    setQuestionInput("")
  }

  // Toggle open state
  const toggleJobOpenState = async (job: Job) => {
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: !job.isOpen })
      })
      if (!res.ok) throw new Error()
      await load()
    } catch (err) {
      alert('Failed to toggle job status.')
    }
  }

  // Delete action
  const confirmDeleteJob = async () => {
    if (!jobToDelete) return;
    
    try {
      const res = await fetch(`/api/admin/jobs/${jobToDelete.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setJobToDelete(null)
      await load()
    } catch (err) {
      alert('Failed to delete job.')
      setJobToDelete(null)
    }
  }

  return (
    <div className="fade-in">
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Job Management</h1>
          <p className={styles.pageDescription}>Maintain your career portal listings, categories, and about stats</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            className={styles.refreshBtn} 
            onClick={() => { load(); loadDepartments(); }}
            title="Refresh Data"
            disabled={loading || loadingDepts}
          >
            <RefreshCw size={20} className={loading || loadingDepts ? styles.spin : ''} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem' }}>
        <button 
          onClick={() => setActiveTab('jobs')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'jobs' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'jobs' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'jobs' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Briefcase size={18} /> Job Postings
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'categories' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'categories' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'categories' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ImageIcon size={18} /> Category Banners
        </button>
        <button 
          onClick={() => setActiveTab('about')}
          style={{ padding: '0.75rem 1.5rem', background: 'none', border: 'none', borderBottom: activeTab === 'about' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'about' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'about' ? 600 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <BarChart size={18} /> About Stats
        </button>
      </div>

      {activeTab === 'about' && (
        <div style={{ margin: '-2rem' }}>
          <AboutStatsPage />
        </div>
      )}

      {activeTab === 'categories' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Manage Category Banners</h2>
          </div>
          <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {departmentsData.map(dept => (
              <div key={dept._id || dept.name} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ height: '150px', backgroundColor: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {dept.image ? (
                    <>
                      <img src={dept.image} alt={dept.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        onClick={() => handleCategoryFileDelete(dept.name)} 
                        disabled={uploadingImage}
                        style={{ position: 'absolute', top: '10px', right: '10px', background: 'var(--color-danger, #ef4444)', color: 'white', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, zIndex: 2 }}
                        title="Delete Image"
                      >
                        <Trash2 size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Delete
                      </button>
                    </>
                  ) : (
                    <img src={getFallbackImage(dept.name)} alt={`${dept.name} Fallback`} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                  )}
                  <label style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'var(--surface)', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', fontWeight: 500, zIndex: 2 }}>
                    {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleCategoryFileUpload(e, dept.name)}
                      disabled={uploadingImage}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
                <div style={{ padding: '1rem', fontWeight: 600 }}>
                  {dept.name}
                </div>
              </div>
            ))}
            {departmentsData.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                No categories found. Add a job category first to manage its banner.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <>
          {error && (
            <div className="card flex items-center gap-3 mb-6" style={{ borderColor: 'var(--color-danger)', background: 'hsl(0, 72%, 51%, 0.05)' }}>
              <AlertCircle className="text-danger" size={20} />
              <div className="text-sm text-secondary">{error}</div>
            </div>
          )}

      {/* Jobs Editor Form */}
      <div className={styles.formCard}>
        <h2 className={styles.formTitle}>
          {editingJobId ? '📝 Edit Job Posting' : '➕ Create New Job Posting'}
        </h2>
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          {/* Title */}
          <div className={`${styles.inputGroup} ${styles.col4}`}>
            <label className={styles.label}>Job Title *</label>
            <input
              type="text"
              required
              className={styles.inputField}
              placeholder="e.g. Cybersecurity Engineer"
              value={jobForm.title}
              onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
            />
          </div>

            {/* Category */}
            <div className={`${styles.inputGroup} ${styles.col4}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.label}>Category *</label>
              </div>
              <select
                className={styles.selectField}
                value={jobForm.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__add__">+ Add New Category</option>
              </select>
            </div>

          {/* Location */}
          <div className={`${styles.inputGroup} ${styles.col4}`}>
            <label className={styles.label}>Location *</label>
            <input
              type="text"
              required
              className={styles.inputField}
              placeholder="e.g. Remote / Bangalore"
              value={jobForm.location}
              onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
            />
          </div>

          {/* Salary */}
          <div className={`${styles.inputGroup} ${styles.col3}`}>
            <label className={styles.label}>Salary Range *</label>
            <input
              type="text"
              required
              className={styles.inputField}
              placeholder="e.g. 15-20 LPA / Unpaid"
              value={jobForm.salary}
              onChange={(e) => setJobForm({ ...jobForm, salary: e.target.value })}
            />
          </div>

          {/* Openings */}
          <div className={`${styles.inputGroup} ${styles.col3}`}>
            <label className={styles.label}>Openings *</label>
            <input
              type="number"
              required
              min={1}
              step={1}
              className={styles.inputField}
              placeholder="No. of openings"
              value={jobForm.openings}
              onChange={(e) => setJobForm({ ...jobForm, openings: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>

          {/* Experience */}
          <div className={`${styles.inputGroup} ${styles.col3}`}>
            <label className={styles.label}>Experience Level *</label>
            <select
              className={styles.selectField}
              value={jobForm.experience}
              onChange={(e) => setJobForm({ ...jobForm, experience: e.target.value })}
            >
              {experienceOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {/* Employment Type */}
          <div className={`${styles.inputGroup} ${styles.col3}`}>
            <label className={styles.label}>Employment Type *</label>
            <select
              className={styles.selectField}
              value={jobForm.employmentType}
              onChange={(e) => setJobForm({ ...jobForm, employmentType: e.target.value })}
            >
              {employmentTypeOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          {/* Skills comma separated */}
          <div className={`${styles.inputGroup} ${styles.col6}`}>
            <label className={styles.label}>Required Skills (Comma separated)</label>
            <input
              type="text"
              className={styles.inputField}
              placeholder="Press Enter to save chips. e.g. React, TypeScript, Node.js"
              value={skillInput}
              onChange={(e) => {
                setSkillInput(e.target.value);
                setJobForm({ ...jobForm, skills: e.target.value });
              }}
              onKeyDown={handleSkillsKeyDown}
            />
            {visibleSkillSuggestions.length > 0 && (
              <div className={styles.suggestionWrapper}>
                <div className={styles.suggestionLabel}>Suggested Skills (click to add):</div>
                <div className={styles.chipsContainer}>
                  {visibleSkillSuggestions.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      className={styles.chip}
                      onClick={() => addSuggestedSkill(skill)}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Custom Questions */}
          <div className={`${styles.inputGroup} ${styles.col6}`}>
            <label className={styles.label}>Application Custom Questions</label>
            <div className={styles.inputWithBtn}>
              <input
                type="text"
                className={styles.inputField}
                placeholder="Type application question..."
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomQuestion(); } }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={addCustomQuestion}
                style={{ padding: '0 1rem' }}
              >
                Add +
              </button>
            </div>
            
            {/* Added questions list */}
            {jobForm.customQuestions.length > 0 && (
              <div className={styles.suggestionWrapper}>
                <div className={styles.suggestionLabel}>Questions Attached (click to remove):</div>
                <div className={styles.chipsContainer}>
                  {jobForm.customQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className={`${styles.chip} ${styles.activeChip}`}
                      onClick={() => removeCustomQuestion(q)}
                    >
                      {q} <X size={10} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested questions list */}
            {visibleQuestionSuggestions.length > 0 && (
              <div className={styles.suggestionWrapper}>
                <div className={styles.suggestionLabel}>Suggested Questions:</div>
                <div className={styles.chipsContainer}>
                  {visibleQuestionSuggestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className={styles.chip}
                      onClick={() => addSuggestedQuestion(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className={`${styles.inputGroup} ${styles.col12}`}>
            <label className={styles.label}>Detailed Description *</label>
            <textarea
              required
              className={styles.textareaField}
              placeholder="Detailed description of the responsibilities and scope of the job..."
              value={jobForm.description}
              onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
            />
          </div>

          {/* Form Actions */}
          <div className={`${styles.formActions} ${styles.col12}`}>
            <button className="btn btn-primary btn-lg" type="submit" disabled={submitting}>
              {editingJobId ? 'Save Changes' : 'Publish Job'}
            </button>
            {editingJobId && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={cancelEditingJob}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* JobList UI */}
      <div className={styles.listSection}>
        <div className={styles.listHeader}>
          <h3 className={styles.listTitle}>Published Career Openings</h3>
          <span className={styles.subtitle}>Showing {jobs.length} listed jobs</span>
        </div>

        {jobs.length === 0 ? (
          <div className={styles.emptyState}>
            <Briefcase size={36} strokeWidth={1.5} />
            <div className={styles.emptyText}>No career openings published yet. Use the form above to add your first post.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {jobs.map((j) => (
              <div
                key={j.id}
                className={`${styles.jobCard} ${!j.isOpen ? styles.jobCardClosed : ''}`}
              >
                <div className={styles.jobCardHeader}>
                  <div className={styles.jobTitleBlock}>
                    <div className="flex items-center gap-2">
                      <span className={styles.jobTitle}>{j.title}</span>
                      <span className={`badge ${j.isOpen ? styles.badgeOpen : styles.badgeClosed}`}>
                        {j.isOpen ? 'Active' : 'Closed'}
                      </span>
                    </div>
                    <div className={styles.jobMeta}>
                      <span className={styles.jobMetaItem}>
                        📁 {j.category}
                      </span>
                      <span className={styles.jobMetaItem}>
                        📍 {j.location}
                      </span>
                      <span className={styles.jobMetaItem}>
                        💵 {j.salary}
                      </span>
                      <span className={styles.jobMetaItem}>
                        👥 Openings: {j.openings}
                      </span>
                      <span className={styles.jobMetaItem}>
                        💼 {j.employmentType} ({j.experience})
                      </span>
                    </div>
                  </div>

                  <div className={styles.jobActions}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => toggleJobOpenState(j)}
                    >
                      {j.isOpen ? 'Mark Closed' : 'Mark Open'}
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => startEditingJob(j)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ padding: '0.4rem 0.6rem' }}
                      onClick={() => setJobToDelete(j)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {jobToDelete && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Confirm Delete</h3>
              <button className={styles.modalClose} onClick={() => setJobToDelete(null)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.alertBox}>
                <AlertCircle size={24} className={styles.alertIcon} />
                <div>
                  <p>Are you sure you want to delete the job <strong>"{jobToDelete.title}"</strong>?</p>
                  <p className={styles.alertSubtitle}>This action cannot be undone and will permanently delete any related applications.</p>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className="btn btn-ghost" onClick={() => setJobToDelete(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDeleteJob}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}
