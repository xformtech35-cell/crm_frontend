import { useEffect, useMemo, useRef, useState } from 'react'
import AppDrawer from '../../components/common/AppDrawer'
import AppConfirmDialog from '../../components/common/AppConfirmDialog'
import Icon from '../../components/Icon'
import { useProject } from '../../hooks/useProject'
import { useAuthStore } from '../../stores/auth'

/* ─── constants ─── */
const PROJECT_STATUSES = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled']
const PROJECT_PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const VIEWS = ['Cards', 'Table']

const STATUS_META = {
  Planning:   { cls: 'bg-purple-100 text-purple-700',   dot: 'bg-purple-500',   icon: 'mdi:pencil-ruler',          border: 'border-purple-200' },
  Active:     { cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500',  icon: 'mdi:play-circle-outline',   border: 'border-emerald-200' },
  'On Hold':  { cls: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500',    icon: 'mdi:pause-circle-outline',  border: 'border-amber-200' },
  Completed:  { cls: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500',     icon: 'mdi:check-circle-outline',  border: 'border-blue-200' },
  Cancelled:  { cls: 'bg-red-100 text-red-700',         dot: 'bg-red-500',      icon: 'mdi:close-circle-outline',  border: 'border-red-200' },
}

const PRIORITY_META = {
  Low:      { cls: 'bg-gray-100 text-gray-600',    icon: 'mdi:arrow-down' },
  Medium:   { cls: 'bg-blue-50 text-blue-700',     icon: 'mdi:minus' },
  High:     { cls: 'bg-orange-50 text-orange-700', icon: 'mdi:arrow-up' },
  Critical: { cls: 'bg-red-50 text-red-700',       icon: 'mdi:fire' },
}

const CARD_GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-violet-500 to-fuchsia-600',
]

const EMPTY_FORM = {
  projectName: '', projectStatus: 'Planning', projectPriority: 'Medium',
  projectDescription: '', projectStartDate: '', projectEndDate: '',
  projectBudget: '', projectManager: '', projectClient: '', projectTeam: ''
}

/* ─── helpers ─── */
function getId(p) { return p?.projectId ?? p?.id ?? '' }
function isOverdue(endDate, status) {
  if (!endDate || status === 'Completed' || status === 'Cancelled') return false
  return new Date(endDate) < new Date()
}

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold ${
      toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
    }`}>
      <Icon name={toast.type === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'} className="w-5 h-5" />
      {toast.msg}
    </div>
  )
}

/* ─── ProjectCard ─── */
function ProjectCard({ project, onEdit, onDelete, gradient }) {
  const sm = STATUS_META[project.projectStatus] || STATUS_META.Planning
  const pm = PRIORITY_META[project.projectPriority] || PRIORITY_META.Medium
  const overdue = isOverdue(project.projectEndDate, project.projectStatus)
  const initials = (project.projectName || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-200 group overflow-hidden hover:-translate-y-1">
      {/* Top gradient bar */}
      <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 text-sm leading-snug truncate max-w-[160px]">{project.projectName}</h3>
              {project.projectClient && (
                <p className="text-xs text-gray-400 truncate">{project.projectClient}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={() => onEdit(project)} className="p-1.5 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors">
              <Icon name="mdi:pencil-outline" className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(project)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors">
              <Icon name="mdi:trash-can-outline" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Description */}
        {project.projectDescription && (
          <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2">{project.projectDescription}</p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${sm.cls}`}>
            <Icon name={sm.icon} className="w-3 h-3" />
            {project.projectStatus || 'Planning'}
          </span>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${pm.cls}`}>
            <Icon name={pm.icon} className="w-3 h-3" />
            {project.projectPriority || 'Medium'}
          </span>
          {overdue && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
              <Icon name="mdi:alert-circle" className="w-3 h-3" />
              Overdue
            </span>
          )}
        </div>

        {/* Meta info */}
        <div className="space-y-1.5 text-xs text-gray-400">
          {project.projectManager && (
            <div className="flex items-center gap-1.5">
              <Icon name="mdi:account-tie-outline" className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{project.projectManager}</span>
            </div>
          )}
          {project.projectStartDate && (
            <div className="flex items-center gap-1.5">
              <Icon name="mdi:calendar-start" className="w-3.5 h-3.5 shrink-0" />
              <span>{new Date(project.projectStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          )}
          {project.projectEndDate && (
            <div className={`flex items-center gap-1.5 ${overdue ? 'text-red-500 font-semibold' : ''}`}>
              <Icon name="mdi:calendar-end" className="w-3.5 h-3.5 shrink-0" />
              <span>{new Date(project.projectEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          )}
          {project.projectBudget && (
            <div className="flex items-center gap-1.5">
              <Icon name="mdi:currency-inr" className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold text-gray-600">{Number(project.projectBudget).toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {project.projectTeam && (
        <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50">
          <div className="flex items-center gap-1.5">
            <Icon name="mdi:account-group-outline" className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500 truncate">{project.projectTeam}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Project Form Drawer ─── */
function ProjectFormDrawer({ open, onClose, editingProject, saving, onSave }) {
  const [form, setForm] = useState({ ...EMPTY_FORM })

  useEffect(() => {
    if (open) {
      setForm(editingProject ? {
        projectName: editingProject.projectName || '',
        projectStatus: editingProject.projectStatus || 'Planning',
        projectPriority: editingProject.projectPriority || 'Medium',
        projectDescription: editingProject.projectDescription || '',
        projectStartDate: editingProject.projectStartDate || '',
        projectEndDate: editingProject.projectEndDate || '',
        projectBudget: editingProject.projectBudget || '',
        projectManager: editingProject.projectManager || '',
        projectClient: editingProject.projectClient || '',
        projectTeam: editingProject.projectTeam || '',
      } : { ...EMPTY_FORM })
    }
  }, [open, editingProject])

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.projectName.trim()) return
    onSave(form)
  }

  const lbl = "block text-xs font-semibold text-gray-600 mb-1.5"
  const inp = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder-gray-300 transition-colors"
  const sel = `${inp} text-gray-700 cursor-pointer`

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={editingProject ? 'Edit Project' : 'New Project'}
      subtitle={editingProject ? 'Update project details' : 'Create a new project'}
      icon="mdi:briefcase-outline"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button
            form="project-form"
            type="submit"
            disabled={saving || !form.projectName.trim()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 hover:scale-105 transition-transform"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            {saving ? <Icon name="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon name="mdi:check-circle-outline" className="w-4 h-4" />}
            {saving ? 'Saving…' : editingProject ? 'Update Project' : 'Create Project'}
          </button>
        </>
      }
    >
      <form id="project-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={lbl}>Project Name <span className="text-red-500">*</span></label>
          <input value={form.projectName} onChange={e => setF('projectName', e.target.value)} placeholder="e.g. Website Redesign" className={inp} autoFocus required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Status</label>
            <select value={form.projectStatus} onChange={e => setF('projectStatus', e.target.value)} className={sel}>
              {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Priority</label>
            <select value={form.projectPriority} onChange={e => setF('projectPriority', e.target.value)} className={sel}>
              {PROJECT_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Start Date</label>
            <input type="date" value={form.projectStartDate} onChange={e => setF('projectStartDate', e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>End Date</label>
            <input type="date" value={form.projectEndDate} onChange={e => setF('projectEndDate', e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>Manager</label>
            <input value={form.projectManager} onChange={e => setF('projectManager', e.target.value)} placeholder="Project manager name" className={inp} />
          </div>
          <div>
            <label className={lbl}>Client</label>
            <input value={form.projectClient} onChange={e => setF('projectClient', e.target.value)} placeholder="Client name" className={inp} />
          </div>
          <div>
            <label className={lbl}>Team</label>
            <input value={form.projectTeam} onChange={e => setF('projectTeam', e.target.value)} placeholder="Assigned team" className={inp} />
          </div>
          <div>
            <label className={lbl}>Budget (₹)</label>
            <input type="number" value={form.projectBudget} onChange={e => setF('projectBudget', e.target.value)} placeholder="0" className={inp} />
          </div>
        </div>
        <div>
          <label className={lbl}>Description</label>
          <textarea value={form.projectDescription} onChange={e => setF('projectDescription', e.target.value)} placeholder="Project overview and goals..." rows={3} className={`${inp} resize-none`} />
        </div>
      </form>
    </AppDrawer>
  )
}

/* ═══════════════════════════════ MAIN PAGE ══════════════════════════════ */
export default function ProjectPage() {
  const { getAll, create, update, remove } = useProject()
  const isAdmin = useAuthStore(s => s.isAdmin())

  const [projects,  setProjects]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [view,      setView]      = useState('Cards')
  const [query,     setQuery]     = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast,     setToast]     = useState(null)
  const toastTimer = useRef(null)

  function showToast(type, msg) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ type, msg })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  async function load() {
    setLoading(true)
    try {
      const data = await getAll()
      setProjects(Array.isArray(data) ? data : [])
    } catch {
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return projects.filter(p => {
      if (filterStatus   && p.projectStatus   !== filterStatus)   return false
      if (filterPriority && p.projectPriority !== filterPriority) return false
      if (!q) return true
      return [p.projectName, p.projectClient, p.projectManager, p.projectDescription, p.projectTeam]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    })
  }, [projects, query, filterStatus, filterPriority])

  const stats = useMemo(() => ({
    total:     projects.length,
    active:    projects.filter(p => p.projectStatus === 'Active').length,
    planning:  projects.filter(p => p.projectStatus === 'Planning').length,
    completed: projects.filter(p => p.projectStatus === 'Completed').length,
    overdue:   projects.filter(p => isOverdue(p.projectEndDate, p.projectStatus)).length,
    onHold:    projects.filter(p => p.projectStatus === 'On Hold').length,
  }), [projects])

  async function handleSave(form) {
    setSaving(true)
    try {
      if (editing?.projectId || editing?.id) {
        await update(editing.projectId || editing.id, form)
        showToast('success', 'Project updated.')
      } else {
        await create(form)
        showToast('success', 'Project created.')
      }
      setDrawerOpen(false)
      setEditing(null)
      await load()
    } catch {
      showToast('error', 'Failed to save project.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await remove(getId(deleteTarget))
      showToast('success', 'Project deleted.')
      setDeleteTarget(null)
      await load()
    } catch {
      showToast('error', 'Failed to delete project.')
      setDeleteTarget(null)
    }
  }

  const hasFilters = query || filterStatus || filterPriority

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-8">

      {/* ── Banner ── */}
      <div className="hero-dark-card rounded-2xl overflow-hidden shadow-sm" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1d4ed8 100%)' }}>
        <div className="px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <Icon name="mdi:briefcase-outline" className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Projects</h1>
              <p className="text-blue-200 text-sm mt-0.5">{stats.total} total · {stats.active} active · {stats.completed} completed</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-4 mr-2">
              {[
                { label: 'Active',    value: stats.active,    color: 'text-emerald-300' },
                { label: 'Overdue',   value: stats.overdue,   color: 'text-amber-300' },
                { label: 'Completed', value: stats.completed, color: 'text-blue-200' },
              ].map((s, i, arr) => (
                <div key={s.label} className="flex items-center gap-4">
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{loading ? '–' : s.value}</p>
                    <p className="text-[10px] text-blue-300 font-medium">{s.label}</p>
                  </div>
                  {i < arr.length - 1 && <div className="w-px h-8 bg-white/20" />}
                </div>
              ))}
            </div>
            {isAdmin && (
              <button
                onClick={() => { setEditing(null); setDrawerOpen(true) }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-blue-900 hover:scale-105 transition-transform shadow-sm"
                style={{ background: 'linear-gradient(135deg, #bfdbfe, #e0e7ff)' }}
              >
                <Icon name="mdi:plus" className="w-4 h-4" />
                New Project
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total',     value: stats.total,     icon: 'mdi:briefcase-outline',       bg: 'bg-indigo-50',  text: 'text-indigo-600',  filter: '' },
          { label: 'Planning',  value: stats.planning,  icon: 'mdi:pencil-ruler',             bg: 'bg-purple-50',  text: 'text-purple-600',  filter: 'Planning' },
          { label: 'Active',    value: stats.active,    icon: 'mdi:play-circle-outline',      bg: 'bg-emerald-50', text: 'text-emerald-600', filter: 'Active' },
          { label: 'On Hold',   value: stats.onHold,    icon: 'mdi:pause-circle-outline',     bg: 'bg-amber-50',   text: 'text-amber-600',   filter: 'On Hold' },
          { label: 'Completed', value: stats.completed, icon: 'mdi:check-circle-outline',     bg: 'bg-blue-50',    text: 'text-blue-600',    filter: 'Completed' },
          { label: 'Overdue',   value: stats.overdue,   icon: 'mdi:alert-circle-outline',     bg: 'bg-red-50',     text: 'text-red-600',     filter: '' },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => s.filter ? setFilterStatus(filterStatus === s.filter ? '' : s.filter) : null}
            className={`bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-3 flex items-center gap-2.5 transition-all hover:shadow-md text-left ${
              filterStatus === s.filter && s.filter ? 'ring-2 ring-indigo-400' : ''
            } ${s.filter ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
              <Icon name={s.icon} className={`w-4 h-4 ${s.text}`} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-medium leading-none mb-0.5">{s.label}</p>
              <p className="text-lg font-bold text-gray-900 leading-none">{loading ? '…' : s.value}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 min-w-[160px]">
            <Icon name="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search projects..."
              className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white">
              <option value="">All Statuses</option>
              {PROJECT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white">
              <option value="">All Priorities</option>
              {PROJECT_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {hasFilters && (
              <button onClick={() => { setQuery(''); setFilterStatus(''); setFilterPriority('') }}
                className="flex items-center gap-1 px-3 py-2 text-xs text-red-500 hover:bg-red-50 font-semibold rounded-xl transition-colors border border-red-100">
                <Icon name="mdi:close-circle" className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
            {hasFilters && (
              <span className="text-xs text-gray-500"><span className="font-bold text-indigo-600">{filtered.length}</span> / {projects.length}</span>
            )}
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 shrink-0 ml-auto">
            {VIEWS.map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  view === v ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <Icon name={v === 'Cards' ? 'mdi:view-grid-outline' : 'mdi:format-list-bulleted'} className="w-3.5 h-3.5" />
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 flex items-center justify-center">
              <Icon name="mdi:loading" className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Loading projects...</p>
          </div>
        </div>
      ) : view === 'Cards' ? (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mb-4">
              <Icon name="mdi:briefcase-off-outline" className="w-8 h-8 text-gray-200" />
            </div>
            <p className="text-base font-semibold text-gray-400">No projects found</p>
            {isAdmin && <button onClick={() => { setEditing(null); setDrawerOpen(true) }} className="mt-3 text-sm text-indigo-600 hover:underline font-semibold">+ Create first project</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((project, i) => (
              <ProjectCard
                key={getId(project)}
                project={project}
                gradient={CARD_GRADIENTS[i % CARD_GRADIENTS.length]}
                onEdit={p => { setEditing(p); setDrawerOpen(true) }}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )
      ) : (
        /* ── Table View ── */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Icon name="mdi:briefcase-off-outline" className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-400">No projects found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: '800px' }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Project', 'Status', 'Priority', 'Manager', 'Client', 'Dates', 'Budget', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((project, i) => {
                    const sm = STATUS_META[project.projectStatus] || STATUS_META.Planning
                    const pm = PRIORITY_META[project.projectPriority] || PRIORITY_META.Medium
                    const overdue = isOverdue(project.projectEndDate, project.projectStatus)
                    return (
                      <tr key={getId(project)} className="hover:bg-indigo-50/20 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                              {(project.projectName || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{project.projectName}</p>
                              {project.projectTeam && <p className="text-xs text-gray-400">{project.projectTeam}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${sm.cls}`}>
                            <Icon name={sm.icon} className="w-3 h-3" />{project.projectStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${pm.cls}`}>
                            <Icon name={pm.icon} className="w-2.5 h-2.5" />{project.projectPriority}
                          </span>
                        </td>
                        <td className="px-4 py-3"><span className="text-xs text-gray-600">{project.projectManager || '—'}</span></td>
                        <td className="px-4 py-3"><span className="text-xs text-gray-600">{project.projectClient || '—'}</span></td>
                        <td className="px-4 py-3">
                          {project.projectEndDate ? (
                            <span className={`text-xs ${overdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                              {overdue && <Icon name="mdi:alert-circle" className="w-3 h-3 inline mr-0.5" />}
                              {new Date(project.projectEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {project.projectBudget
                            ? <span className="text-xs font-semibold text-gray-700">₹{Number(project.projectBudget).toLocaleString('en-IN')}</span>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditing(project); setDrawerOpen(true) }} className="p-1.5 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"><Icon name="mdi:pencil-outline" className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setDeleteTarget(project)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Icon name="mdi:trash-can-outline" className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Drawer ── */}
      <ProjectFormDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditing(null) }}
        editingProject={editing}
        saving={saving}
        onSave={handleSave}
      />

      {/* ── Delete Confirm ── */}
      <AppConfirmDialog
        open={deleteTarget !== null}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteTarget?.projectName}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Toast toast={toast} />
    </div>
  )
}
