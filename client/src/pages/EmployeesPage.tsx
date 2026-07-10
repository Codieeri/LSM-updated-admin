import { useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, CheckSquare, Square, Trash2, Mail, Phone, MapPin, RefreshCw, AlertCircle, Inbox, KanbanSquare, CheckCircle, Edit3, UserPlus, X } from 'lucide-react'
import { format } from 'date-fns'
import styles from './EmployeesPage.module.css'

type Task = {
  _id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
};

type EmployeeProgress = {
  applicationId: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
  job: {
    title: string;
    category: string;
  };
  currentProject: string;
  tasks: Task[];
  phone: string;
  location: string;
  createdAt: string;
  dbDepartment?: string;
  dbRole?: string;
};

const defaultDepts = ["Web Development", "App Development", "Graphics Design"];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeProgress[]>([])
  
  // Dynamic categories/departments loaded from localStorage (shared with Job Management)
  const [departments, setDepartments] = useState<string[]>(() => {
    const saved = localStorage.getItem("admin_categories");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse categories:', e);
      }
    }
    return defaultDepts;
  });

  const [selectedDept, setSelectedDept] = useState('All')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  
  // Progress edit states
  const [projectEditValue, setProjectEditValue] = useState('')
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [newTaskText, setNewTaskText] = useState('')

  // Employee details inline edit overrides
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editDeptValue, setEditDeptValue] = useState('')
  const [editRoleValue, setEditRoleValue] = useState('')
  
  // Create Employee modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newEmpName, setNewEmpName] = useState('')
  const [newEmpEmail, setNewEmpEmail] = useState('')
  const [newEmpPhone, setNewEmpPhone] = useState('')
  const [newEmpLocation, setNewEmpLocation] = useState('')
  const [newEmpDept, setNewEmpDept] = useState('Web Development')
  const [newEmpRole, setNewEmpRole] = useState('')
  const [newEmpProject, setNewEmpProject] = useState('Onboarding & Training')
  const [isCreatingEmp, setIsCreatingEmp] = useState(false)
  
  // Department Modal State
  const [showAddDeptModal, setShowAddDeptModal] = useState(false)
  const [newDeptInput, setNewDeptInput] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  // Load hired employees & progress records
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/employees/progress?t=${Date.now()}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to load employee records')
      const data = await response.json()
      setEmployees(data)
      setError(null)
      setLastUpdated(new Date())

      // Fetch departments from database
      const deptRes = await fetch('/api/admin/departments');
      if (deptRes.ok) {
        const dbDepts = await deptRes.json();
        // Sync categories dynamically from loaded job categories if any are missing
        const fromJobsCategories = Array.from(
          new Set(data.map((emp: any) => emp.job.category).filter(Boolean))
        ) as string[];
        
        setDepartments(prev => {
          const merged = Array.from(new Set([...dbDepts, ...fromJobsCategories]));
          if (merged.length === 0) return defaultDepts;
          localStorage.setItem("admin_categories", JSON.stringify(merged));
          return merged;
        });
      }
    } catch (err: any) {
      console.error('Error fetching progress:', err)
      setError(err.message || 'Could not load employees records.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-refresh polling
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

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (selectedDept === 'All') return true
      return emp.job.category.toLowerCase().includes(selectedDept.toLowerCase())
    })
  }, [employees, selectedDept])

  // Auto-select first employee in list if none selected
  useEffect(() => {
    if (filteredEmployees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(filteredEmployees[0].applicationId)
    } else if (filteredEmployees.length === 0) {
      setSelectedEmployeeId(null)
    }
  }, [filteredEmployees, selectedEmployeeId])

  // Current active employee record
  const activeEmployee = useMemo(() => {
    return employees.find(e => e.applicationId === selectedEmployeeId) || null
  }, [employees, selectedEmployeeId])

  // Reset project and profile edit fields when active employee changes
  useEffect(() => {
    if (activeEmployee) {
      setProjectEditValue(activeEmployee.currentProject)
      setEditDeptValue(activeEmployee.dbDepartment || activeEmployee.job.category)
      setEditRoleValue(activeEmployee.dbRole || activeEmployee.job.title)
      setIsEditingProject(false)
      setIsEditingProfile(false)
    }
  }, [activeEmployee])

  // Post update helper
  const updateProgress = async (body: any) => {
    try {
      const response = await fetch('/api/admin/employees/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: selectedEmployeeId, ...body })
      })
      if (!response.ok) throw new Error('Failed to update employee progress')
      await load()
    } catch (err) {
      alert('Error updating progress records.')
    }
  }

  // Update current project title
  const handleSaveProject = async () => {
    const trimmed = projectEditValue.trim()
    if (!trimmed) return
    await updateProgress({ currentProject: trimmed })
    setIsEditingProject(false)
  }

  // Update employee department/role profile overrides
  const handleSaveProfile = async () => {
    const roleVal = editRoleValue.trim()
    const deptVal = editDeptValue.trim()
    if (!roleVal || !deptVal) return
    await updateProgress({ role: roleVal, department: deptVal })
    setIsEditingProfile(false)
  }

  // Add new checklist task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newTaskText.trim()
    if (!trimmed) return
    await updateProgress({ newTaskText: trimmed })
    setNewTaskText('')
  }

  // Toggle task completion checkbox
  const handleToggleTask = async (taskId: string) => {
    await updateProgress({ toggleTaskId: taskId })
  }

  // Delete task from checklist
  const handleDeleteTask = async (taskId: string) => {
    await updateProgress({ deleteTaskId: taskId })
  }

  // Add new department/domain category
  const handleOpenAddDeptModal = () => {
    setNewDeptInput('')
    setShowAddDeptModal(true)
  }

  const handleSaveNewDepartment = async (e: React.FormEvent) => {
    e.preventDefault()
    const newDept = newDeptInput.trim()
    if (!newDept) return
    try {
      const res = await fetch('/api/admin/departments/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', newName: newDept })
      });
      if (!res.ok) throw new Error('Failed to add department');

      const merged = Array.from(new Set([...departments, newDept]));
      setDepartments(merged);
      localStorage.setItem("admin_categories", JSON.stringify(merged));
      setSelectedDept(newDept);
      setSelectedEmployeeId(null);
      setShowAddDeptModal(false);
      setNewDeptInput('');
      await load();
    } catch (err: any) {
      alert(err.message || 'Error adding department.');
    }
  }
  // Rename department/domain category
  const handleEditDepartment = async () => {
    if (selectedDept === 'All') return;
    const newDeptName = prompt("Rename department to:", selectedDept)?.trim();
    if (!newDeptName || newDeptName === selectedDept) return;

    try {
      const res = await fetch('/api/admin/departments/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', oldName: selectedDept, newName: newDeptName })
      });
      if (!res.ok) throw new Error('Failed to rename department');

      // Update local storage
      const updated = departments.map(d => d === selectedDept ? newDeptName : d);
      setDepartments(updated);
      localStorage.setItem("admin_categories", JSON.stringify(updated));
      setSelectedDept(newDeptName);
      await load();
      alert(`Successfully renamed "${selectedDept}" to "${newDeptName}".`);
    } catch (err: any) {
      alert(err.message || 'Error renaming department.');
    }
  }

  // Delete department/domain category
  const handleDeleteDepartment = async () => {
    if (selectedDept === 'All') return;
    if (!confirm(`Are you sure you want to delete the "${selectedDept}" department? Associated jobs will revert to Web Development.`)) return;

    try {
      const res = await fetch('/api/admin/departments/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', oldName: selectedDept })
      });
      if (!res.ok) throw new Error('Failed to delete department');

      // Update local storage
      const updated = departments.filter(d => d !== selectedDept);
      setDepartments(updated);
      localStorage.setItem("admin_categories", JSON.stringify(updated));
      setSelectedDept('All');
      await load();
      alert(`Successfully deleted department.`);
    } catch (err: any) {
      alert(err.message || 'Error deleting department.');
    }
  }

  // Create manual employee record
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newEmpName.trim();
    const email = newEmpEmail.trim();
    const phone = newEmpPhone.trim();
    const location = newEmpLocation.trim() || 'Remote';
    const department = newEmpDept;
    const role = newEmpRole.trim() || 'Intern';
    const currentProject = newEmpProject.trim() || 'Onboarding & Training';

    if (!name || !email || !phone) return;

    setIsCreatingEmp(true);
    try {
      const response = await fetch('/api/admin/employees/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, location, department, role, currentProject })
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => null);
        throw new Error(errPayload?.error || 'Failed to create employee');
      }

      const created = await response.json();
      
      // Reset form & close modal
      setNewEmpName('');
      setNewEmpEmail('');
      setNewEmpPhone('');
      setNewEmpLocation('');
      setNewEmpRole('');
      setNewEmpProject('Onboarding & Training');
      setIsCreateModalOpen(false);
      
      await load();
      setSelectedEmployeeId(created.applicationId);
      alert('Intern/Employee added successfully!');
    } catch (err: any) {
      alert(err.message || 'Error onboarding employee.');
    } finally {
      setIsCreatingEmp(false);
    }
  }

  // Calculate task percentage
  const calculateProgressStats = (tasks: Task[]) => {
    if (!tasks || tasks.length === 0) return { percent: 0, completed: 0, total: 0 }
    const completed = tasks.filter(t => t.completed).length
    const total = tasks.length
    const percent = Math.round((completed / total) * 100)
    return { percent, completed, total }
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Employees & Interns</h1>
          <p className={styles.subtitle}>Track active project status, pending tasks, and completion metrics</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Sync: {format(lastUpdated, 'h:mm:ss a')}
          </span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={load} disabled={loading} title="Sync Records">
            <RefreshCw size={14} className={loading ? styles.spinning : ''} />
          </button>
          
          {/* Onboard manual Employee Button */}
          <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <UserPlus size={15} /> Add Employee
          </button>
        </div>
      </div>

      {error && (
        <div className="card flex items-center gap-3 mb-6" style={{ borderColor: 'var(--color-danger)', background: 'hsl(0, 72%, 51%, 0.05)' }}>
          <AlertCircle className="text-danger" size={20} />
          <div className="text-sm text-secondary">{error}</div>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.toolbar}>
        <button
          className={`${styles.tabBtn} ${selectedDept === 'All' ? styles.activeTabBtn : ''}`}
          onClick={() => {
            setSelectedDept('All');
            setSelectedEmployeeId(null);
          }}
        >
          All
        </button>
        {departments.map(dept => (
          <button
            key={dept}
            className={`${styles.tabBtn} ${selectedDept === dept ? styles.activeTabBtn : ''}`}
            onClick={() => {
              setSelectedDept(dept);
              setSelectedEmployeeId(null);
            }}
          >
            {dept}
          </button>
        ))}
        {/* + Add Department */}
        <button
          className={styles.addDeptBtn}
          onClick={handleOpenAddDeptModal}
          title="Add a new department/domain"
        >
          <Plus size={13} /> Add Department
        </button>
      </div>

      {/* Department Actions Block (Rename/Delete) */}
      {selectedDept !== 'All' && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', marginTop: '-1rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleEditDepartment} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '11px', padding: '0.3rem 0.6rem' }}>
            <Edit3 size={11} /> Rename Category
          </button>
          <button className="btn btn-ghost btn-sm text-danger" onClick={handleDeleteDepartment} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '11px', padding: '0.3rem 0.6rem' }}>
            <Trash2 size={11} /> Delete Category
          </button>
        </div>
      )}

      {/* Layout Grid */}
      {employees.length === 0 ? (
        <div className={styles.emptyState}>
          <Inbox size={42} strokeWidth={1.5} />
          <div className={styles.emptyText}>No employees marked as "Hired" in database. Onboard staff above or shortlist candidates from Applicants first.</div>
        </div>
      ) : (
        <div className={styles.layout}>
          {/* Left Sidebar employee list */}
          <div className={styles.sidebarList}>
            {filteredEmployees.length === 0 ? (
              <div className={styles.emptyState} style={{ padding: '2rem 0' }}>
                <Inbox size={24} strokeWidth={1.5} />
                <div className={styles.emptyText} style={{ fontSize: '12px' }}>No active hires in this category</div>
              </div>
            ) : (
              filteredEmployees.map(emp => {
                const stats = calculateProgressStats(emp.tasks)
                return (
                  <div
                    key={emp.applicationId}
                    className={`${styles.employeeCard} ${selectedEmployeeId === emp.applicationId ? styles.activeEmployeeCard : ''}`}
                    onClick={() => setSelectedEmployeeId(emp.applicationId)}
                  >
                    <div className={styles.avatar}>
                      {emp.user.name.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase()}
                    </div>
                    <div className={styles.employeeInfo}>
                      <div className={styles.employeeName}>{emp.user.name}</div>
                      <div className={styles.employeeRole}>{emp.job.title}</div>
                      <div className={styles.progressBarContainer} style={{ marginTop: '0.2rem' }}>
                        <div className={styles.progressBarOutline} style={{ height: '4px' }}>
                          <div className={styles.progressBarFill} style={{ width: `${stats.percent}%` }} />
                        </div>
                        <span style={{ fontSize: '10px' }}>{stats.percent}%</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Right detail checklist panel */}
          {activeEmployee ? (
            <div className={styles.detailSection}>
              {/* Profile Card Header */}
              <div className={styles.detailHeader}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
                  <div className={styles.avatar} style={{ width: '64px', height: '64px', fontSize: '24px' }}>
                    {activeEmployee.user.name.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{activeEmployee.user.name}</h2>
                    
                    {/* Position and Department edit controls */}
                    {isEditingProfile ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          className={styles.projectInput}
                          style={{ maxWidth: '160px', padding: '0.3rem 0.5rem', fontSize: '12px' }}
                          value={editRoleValue}
                          onChange={(e) => setEditRoleValue(e.target.value)}
                          placeholder="Position/Role"
                        />
                        <select
                          className={styles.projectInput}
                          style={{ maxWidth: '160px', padding: '0.3rem 0.5rem', fontSize: '12px', height: '28px' }}
                          value={editDeptValue}
                          onChange={(e) => setEditDeptValue(e.target.value)}
                        >
                          {departments.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        <button className="btn btn-primary btn-sm" onClick={handleSaveProfile} style={{ fontSize: '11px', padding: '0.2rem 0.5rem' }}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setIsEditingProfile(false)} style={{ fontSize: '11px', padding: '0.2rem 0.5rem' }}>Cancel</button>
                      </div>
                    ) : (
                      <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>💼 {activeEmployee.job.title} ({activeEmployee.job.category})</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => setIsEditingProfile(true)} style={{ padding: '0.2rem' }} title="Change role or department">
                          <Edit3 size={11} />
                        </button>
                      </p>
                    )}
                    
                    <div className={styles.metaInfo}>
                      <span className={styles.metaItem}>
                        <Mail size={11} /> {activeEmployee.user.email}
                      </span>
                      <span className={styles.metaItem}>
                        <Phone size={11} /> {activeEmployee.phone}
                      </span>
                      <span className={styles.metaItem}>
                        <MapPin size={11} /> {activeEmployee.location}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="badge badge-success">HIRED</div>
              </div>

              {/* Current Project Board */}
              <div className={styles.projectTracker}>
                <span className={styles.projectLabel}>Current Project Workspace</span>
                
                {isEditingProject ? (
                  <div className={styles.projectInputWrapper}>
                    <input
                      type="text"
                      className={styles.projectInput}
                      value={projectEditValue}
                      onChange={(e) => setProjectEditValue(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={handleSaveProject}>Save</button>
                    <button className="btn btn-ghost" onClick={() => setIsEditingProject(false)}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--foreground)' }}>
                      📁 {activeEmployee.currentProject}
                    </span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setIsEditingProject(true)}>
                      Change Project
                    </button>
                  </div>
                )}

                {/* Progress Indicators */}
                {activeEmployee.tasks.length > 0 && (
                  <div>
                    <div className={styles.progressBarContainer}>
                      <span className={styles.projectLabel} style={{ textTransform: 'none', letterSpacing: 'normal' }}>
                        Tasks Completion Summary:
                      </span>
                      <div className={styles.progressBarOutline}>
                        <div
                          className={styles.progressBarFill}
                          style={{ width: `${calculateProgressStats(activeEmployee.tasks).percent}%` }}
                        />
                      </div>
                      <span>
                        {calculateProgressStats(activeEmployee.tasks).percent}% ({calculateProgressStats(activeEmployee.tasks).completed}/{calculateProgressStats(activeEmployee.tasks).total})
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tasks List Board */}
              <div className={styles.tasksContainer}>
                <span className={styles.projectLabel}>Workspace Checklist & Progress Tasks</span>

                <div className={styles.tasksList}>
                  {activeEmployee.tasks.length === 0 ? (
                    <div className={styles.emptyState} style={{ padding: '2rem 0' }}>
                      <CheckCircle size={28} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
                      <div className={styles.emptyText} style={{ fontSize: 'var(--text-sm)' }}>Checklist is empty. Assign onboarding or project tasks below.</div>
                    </div>
                  ) : (
                    activeEmployee.tasks.map((task) => (
                      <div key={task._id} className={styles.taskItem}>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, cursor: 'pointer' }}
                          onClick={() => handleToggleTask(task._id)}
                        >
                          {task.completed ? (
                            <CheckSquare size={16} className="text-success" />
                          ) : (
                            <Square size={16} className="text-muted" />
                          )}
                          <span className={`${styles.taskContent} ${task.completed ? styles.taskCompleted : ''}`}>
                            {task.text}
                          </span>
                        </div>
                        <button
                          className={styles.taskDeleteBtn}
                          onClick={() => handleDeleteTask(task._id)}
                          title="Remove task"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Task input */}
                <form onSubmit={handleAddTask} className={styles.addTaskForm}>
                  <input
                    required
                    type="text"
                    placeholder="Enter project task description..."
                    className={styles.addTaskInput}
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Plus size={14} /> Add Task
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className={styles.detailSection} style={{ alignItems: 'center', justifyContent: 'center' }}>
              <KanbanSquare size={42} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
              <div className={styles.emptyText}>Select an employee/intern from the list to view their progress dashboard</div>
            </div>
          )}
        </div>
      )}

      {/* Manual Employee Onboarding Modal */}
      {isCreateModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCreateModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <button className={styles.modalCloseBtn} onClick={() => setIsCreateModalOpen(false)}>
              <X size={18} />
            </button>

            <h3 className={styles.modalTitle} style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)' }}>
              Add New Employee / Intern
            </h3>
            
            <form onSubmit={handleCreateEmployee} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-fg)' }}>FULL NAME *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  className={styles.addTaskInput}
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  disabled={isCreatingEmp}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-fg)' }}>EMAIL ADDRESS *</label>
                <input
                  required
                  type="email"
                  placeholder="e.g. rahul@example.com"
                  className={styles.addTaskInput}
                  value={newEmpEmail}
                  onChange={(e) => setNewEmpEmail(e.target.value)}
                  disabled={isCreatingEmp}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-fg)' }}>PHONE NUMBER *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. +91 9876543210"
                  className={styles.addTaskInput}
                  value={newEmpPhone}
                  onChange={(e) => setNewEmpPhone(e.target.value)}
                  disabled={isCreatingEmp}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-fg)' }}>LOCATION</label>
                <input
                  type="text"
                  placeholder="e.g. Bangalore, India"
                  className={styles.addTaskInput}
                  value={newEmpLocation}
                  onChange={(e) => setNewEmpLocation(e.target.value)}
                  disabled={isCreatingEmp}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-fg)' }}>DEPARTMENT *</label>
                  <select
                    className={styles.addTaskInput}
                    style={{ height: '38px', background: 'var(--card)' }}
                    value={newEmpDept}
                    onChange={(e) => setNewEmpDept(e.target.value)}
                    disabled={isCreatingEmp}
                  >
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-fg)' }}>POSITION / ROLE</label>
                  <input
                    type="text"
                    placeholder="e.g. Frontend Intern"
                    className={styles.addTaskInput}
                    value={newEmpRole}
                    onChange={(e) => setNewEmpRole(e.target.value)}
                    disabled={isCreatingEmp}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-fg)' }}>ASSIGN PROJECT</label>
                <input
                  type="text"
                  placeholder="e.g. Onboarding & Training"
                  className={styles.addTaskInput}
                  value={newEmpProject}
                  onChange={(e) => setNewEmpProject(e.target.value)}
                  disabled={isCreatingEmp}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsCreateModalOpen(false)} disabled={isCreatingEmp}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCreatingEmp}>
                  {isCreatingEmp ? 'Creating...' : 'Onboard Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showAddDeptModal && (
        <div className={styles.modalOverlay} onClick={(e) => {
          if (e.target === e.currentTarget) setShowAddDeptModal(false)
        }}>
          <div className={styles.modalContent} style={{ maxWidth: '400px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--fg)' }}>Add New Department</h3>
            <form onSubmit={handleSaveNewDepartment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted-fg)' }}>DEPARTMENT NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Finance"
                  className={styles.addTaskInput}
                  value={newDeptInput}
                  onChange={(e) => setNewDeptInput(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddDeptModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={!newDeptInput.trim()}>
                  Add Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
