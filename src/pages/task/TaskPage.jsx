import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import AppDrawer from '../../components/common/AppDrawer'
import AppConfirmDialog from '../../components/common/AppConfirmDialog'
import Icon from '../../components/Icon'
import { useCreateTeam } from '../../hooks/useCreateTeam'
import { useTask } from '../../hooks/useTask'
import { useTeam } from '../../hooks/useTeam'
import { useTeamMember } from '../../hooks/useTeamMember'
import { useProject } from '../../hooks/useProject'
import { useTaskTime } from '../../hooks/useTaskTime'
import { useAuthStore } from '../../stores/auth'
import { getMemberId, getMemberLabel, getTeamId, getTeamLabel, membersForTeam, groupMembersByTeam } from '../../utils/teamRelations'

/* ─────────────────────────────── constants ─────────────────────────────── */
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const STATUSES   = ['To Do', 'In Progress', 'Blocked', 'Done']
const VIEWS      = ['Board', 'List']
const TASK_TYPES = ['Bug', 'Feature', 'Meeting', 'Sales', 'Marketing', 'Development', 'Support']
const PERIODS    = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027', 'Q3 2027', 'Q4 2027']

const PRIORITY_META = {
  Low:      { cls: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400',    icon: 'mdi:arrow-down',             gradient: 'from-gray-400 to-gray-500' },
  Medium:   { cls: 'bg-blue-50 text-blue-700',     dot: 'bg-blue-500',    icon: 'mdi:minus',                  gradient: 'from-blue-400 to-blue-600' },
  High:     { cls: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500',  icon: 'mdi:arrow-up',               gradient: 'from-orange-400 to-orange-600' },
  Critical: { cls: 'bg-red-50 text-red-700',       dot: 'bg-red-500',     icon: 'mdi:alert-circle-outline',   gradient: 'from-red-400 to-rose-600' },
}

const STATUS_META = {
  'To Do':       { bg: 'bg-slate-50/80',      border: 'border-slate-200',   header: 'bg-white',            dot: 'bg-slate-400',    badge: 'bg-slate-100 text-slate-600',      headerDot: '#94a3b8', accent: '#6366f1' },
  'In Progress': { bg: 'bg-blue-50/60',       border: 'border-blue-200',    header: 'bg-blue-50',          dot: 'bg-blue-500',     badge: 'bg-blue-100 text-blue-700',        headerDot: '#3b82f6', accent: '#3b82f6' },
  'Blocked':     { bg: 'bg-red-50/50',        border: 'border-red-200',     header: 'bg-red-50',           dot: 'bg-red-500',      badge: 'bg-red-100 text-red-700',          headerDot: '#ef4444', accent: '#ef4444' },
  'Done':        { bg: 'bg-emerald-50/50',    border: 'border-emerald-200', header: 'bg-emerald-50',       dot: 'bg-emerald-500',  badge: 'bg-emerald-100 text-emerald-700',  headerDot: '#10b981', accent: '#10b981' },
}

const TYPE_ICONS = {
  Bug: 'mdi:bug-outline', Feature: 'mdi:star-outline', Meeting: 'mdi:calendar-account',
  Sales: 'mdi:handshake-outline', Marketing: 'mdi:bullhorn-outline',
  Development: 'mdi:code-tags', Support: 'mdi:lifebuoy',
}

const TYPE_COLORS = {
  Bug: 'bg-rose-100 text-rose-700', Feature: 'bg-violet-100 text-violet-700',
  Meeting: 'bg-amber-100 text-amber-700', Sales: 'bg-green-100 text-green-700',
  Marketing: 'bg-pink-100 text-pink-700', Development: 'bg-indigo-100 text-indigo-700',
  Support: 'bg-cyan-100 text-cyan-700',
}

const EMPTY_FORM = {
  taskName: '', taskAssignedTeam: '', taskAssignedMember: '',
  taskPriority: 'Medium', taskAssign: 'To Do',
  taskStartDate: '', taskDueDate: '',
  taskPercentageCompleted: 0, taskRelatedTo: '', taskDescription: '',
  taskType: 'Feature', taskPhone: '', taskEmail: '',
  taskProjectId: '', taskExpectedCompletion: '', taskPeriod: '', taskCreatedBy: ''
}

function genId(task) { return task?.taskId ?? task?.id ?? '' }

/* ─────────────────────────────── helpers ────────────────────────────────── */
function isOverdue(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

/* ─────────────────────────────── components ─────────────────────────────── */
function Avatar({ name, size = 7 }) {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const colors = ['from-indigo-500 to-purple-600', 'from-blue-500 to-cyan-600', 'from-emerald-500 to-teal-600', 'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600']
  const color  = colors[(initials.charCodeAt(0) || 0) % colors.length]
  return (
    <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold shrink-0`}
         style={{ fontSize: size < 8 ? '10px' : '12px' }}>
      {initials}
    </div>
  )
}

function PriorityBadge({ priority }) {
  const m = PRIORITY_META[priority] || PRIORITY_META.Medium
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${m.cls}`}>
      <Icon name={m.icon} className="w-2.5 h-2.5" />
      {priority}
    </span>
  )
}

function TypeBadge({ type }) {
  if (!type) return null
  const iconName = TYPE_ICONS[type] || 'mdi:label-outline'
  const colorCls = TYPE_COLORS[type] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${colorCls}`}>
      <Icon name={iconName} className="w-2.5 h-2.5" />
      {type}
    </span>
  )
}

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold animate-fade-in ${
      toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
    }`}>
      <Icon name={toast.type === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'} className="w-5 h-5" />
      {toast.msg}
    </div>
  )
}

/* ═══════════════════════════════ KANBAN CARD ════════════════════════════ */
function KanbanCard({ task, memberById, onEdit, onDelete, onDragStart, isDragging }) {
  const member = memberById.get(Number(task.taskAssignedMember || task.taskAssignedTo))
  const pct    = task.taskPercentageCompleted || 0
  const due    = task.taskDueDate
  const overdue = isOverdue(due) && task.taskAssign !== 'Done'
  const taskRef = `TK-${String(genId(task)).padStart(3, '0')}`
  const pm = PRIORITY_META[task.taskPriority] || PRIORITY_META.Medium

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onEdit(task)}
      className={`bg-white rounded-xl border shadow-sm transition-all duration-150 p-3.5 group cursor-grab active:cursor-grabbing select-none
        ${isDragging ? 'opacity-40 scale-95 shadow-none border-indigo-300' : 'border-gray-100 hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-200/60'}`}
      style={{ borderLeftWidth: '3px', borderLeftColor: pm.dot.replace('bg-', '').includes('-') ? `var(--tw-${pm.dot})` : '#6366f1' }}
    >
      {/* Priority stripe + drag handle */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-indigo-400 tracking-wide">{taskRef}</span>
          <PriorityBadge priority={task.taskPriority || 'Medium'} />
          <TypeBadge type={task.taskType} />
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
          <button className="p-1 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors" onClick={() => onEdit(task)} title="Edit">
            <Icon name="mdi:pencil-outline" className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" onClick={() => onDelete(task)} title="Delete">
            <Icon name="mdi:trash-can-outline" className="w-3.5 h-3.5" />
          </button>
          <div className="p-1 text-gray-300 cursor-grab" title="Drag to move">
            <Icon name="mdi:drag-vertical" className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Task name */}
      <p className={`text-sm font-semibold leading-snug mb-2.5 ${task.taskAssign === 'Done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
        {task.taskName}
      </p>

      {/* Meta info */}
      {task.taskRelatedTo && (
        <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1 truncate">
          <Icon name="mdi:link-variant" className="w-3 h-3 shrink-0" />
          {task.taskRelatedTo}
        </p>
      )}
      {task.taskCreatedBy && (
        <p className="text-[10px] text-gray-400 mb-2">by {task.taskCreatedBy}</p>
      )}

      {/* Progress */}
      {pct > 0 && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400 font-medium">Progress</span>
            <span className="text-[10px] text-gray-700 font-bold">{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-50">
        <div className="flex items-center gap-1.5 min-w-0">
          {member ? (
            <>
              <Avatar name={getMemberLabel(member)} size={6} />
              <span className="text-xs text-gray-500 truncate max-w-[90px]">{getMemberLabel(member)}</span>
            </>
          ) : (
            <span className="text-xs text-gray-300 italic">Unassigned</span>
          )}
        </div>
        {due && (
          <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
            overdue ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
          }`}>
            {overdue && <Icon name="mdi:alert-circle" className="w-2.5 h-2.5" />}
            <Icon name="mdi:calendar-outline" className="w-2.5 h-2.5" />
            {new Date(due).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════ KANBAN COLUMN ══════════════════════════ */
function KanbanColumn({ status, tasks, memberById, onEdit, onDelete, onAddTask, onDragStart, onDrop, onDragOver, onDragLeave, isDropTarget, draggingId }) {
  const meta = STATUS_META[status] || STATUS_META['To Do']
  const statusIcons = {
    'To Do': 'mdi:circle-outline',
    'In Progress': 'mdi:progress-clock',
    'Blocked': 'mdi:cancel',
    'Done': 'mdi:check-circle-outline',
  }

  return (
    <div
      className={`flex flex-col rounded-2xl border-2 transition-all duration-200 ${
        isDropTarget
          ? 'border-indigo-400 shadow-lg shadow-indigo-100 scale-[1.01]'
          : `${meta.border} ${meta.bg}`
      }`}
      style={{ minWidth: '280px', maxWidth: '310px', flex: '0 0 292px' }}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
    >
      {/* Column header */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl ${isDropTarget ? 'bg-indigo-50' : meta.header} border-b ${isDropTarget ? 'border-indigo-300' : meta.border}`}>
        <div className="flex items-center gap-2.5">
          <Icon name={statusIcons[status]} className="w-4 h-4" style={{ color: meta.headerDot }} />
          <span className="text-sm font-bold text-gray-800">{status}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>{tasks.length}</span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-white hover:text-indigo-600 transition-colors"
          title={`Add task to ${status}`}
        >
          <Icon name="mdi:plus" className="w-4 h-4" />
        </button>
      </div>

      {/* Drop zone indicator */}
      {isDropTarget && (
        <div className="mx-2 mt-2 h-1.5 bg-indigo-300 rounded-full animate-pulse" />
      )}

      {/* Cards */}
      <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 310px)' }}>
        {tasks.map(task => (
          <KanbanCard
            key={genId(task)}
            task={task}
            memberById={memberById}
            onEdit={onEdit}
            onDelete={onDelete}
            onDragStart={onDragStart}
            isDragging={draggingId && genId(task) === draggingId}
          />
        ))}
        {tasks.length === 0 && !isDropTarget && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <Icon name="mdi:clipboard-text-outline" className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-xs text-gray-400 font-medium">No tasks here</p>
            <button onClick={() => onAddTask(status)} className="mt-2 text-xs text-indigo-500 hover:underline font-semibold">+ Add task</button>
          </div>
        )}
        {tasks.length === 0 && isDropTarget && (
          <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-indigo-300 rounded-xl bg-indigo-50/50">
            <Icon name="mdi:arrow-down-circle-outline" className="w-8 h-8 text-indigo-400 mb-2" />
            <p className="text-xs text-indigo-600 font-semibold">Drop here</p>
          </div>
        )}
      </div>

      {/* Bottom add button */}
      <div className="px-2.5 pb-2.5">
        <button
          onClick={() => onAddTask(status)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-400 hover:bg-white/80 hover:text-indigo-600 transition-colors font-medium"
        >
          <Icon name="mdi:plus" className="w-4 h-4" />
          Add task
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════ TASK FORM DRAWER ═══════════════════════ */
function TaskFormDrawer({ open, onClose, editingTask, teams, members, assignments, projects, currentUser, saving, onSave, isAdmin }) {
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const { startTimer, stopTimer, getLogsByTask, loading: timeLoading } = useTaskTime()
  const [logs, setLogs] = useState([])
  const [activeLog, setActiveLog] = useState(null)
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    if (open) {
      setActiveTab('details')
    }
  }, [open])

  useEffect(() => {
    if (open && (editingTask?.taskId || editingTask?.id)) {
      const id = editingTask.taskId || editingTask.id
      getLogsByTask(id).then(data => {
        setLogs(data)
        setActiveLog(data.find(l => !l.endTime) || null)
      }).catch(console.error)
    } else if (open) {
      setLogs([])
      setActiveLog(null)
    }
  }, [open, editingTask?.taskId, editingTask?.id, getLogsByTask])

  useEffect(() => {
    if (open) {
      if (editingTask) {
        setForm({
          taskName: editingTask.taskName || '',
          taskAssignedTeam: editingTask.taskAssignedTeam || '',
          taskAssignedMember: editingTask.taskAssignedMember || editingTask.taskAssignedTo || '',
          taskPriority: editingTask.taskPriority || 'Medium',
          taskAssign: editingTask.taskAssign || 'To Do',
          taskStartDate: editingTask.taskStartDate || '',
          taskDueDate: editingTask.taskDueDate || '',
          taskPercentageCompleted: editingTask.taskPercentageCompleted || 0,
          taskRelatedTo: editingTask.taskRelatedTo || '',
          taskDescription: editingTask.taskDescription || '',
          taskType: editingTask.taskType || 'Feature',
          taskPhone: editingTask.taskPhone || '',
          taskEmail: editingTask.taskEmail || '',
          taskProjectId: editingTask.taskProjectId || '',
          taskExpectedCompletion: editingTask.taskExpectedCompletion || '',
          taskPeriod: editingTask.taskPeriod || '',
        })
      } else {
        setForm({ ...EMPTY_FORM })
      }
    }
  }, [open, editingTask])

  function setF(k, v) {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      if (k === 'taskAssignedTeam') next.taskAssignedMember = ''
      return next
    })
  }

  const availableMembers = useMemo(
    () => form.taskAssignedTeam ? membersForTeam(Number(form.taskAssignedTeam), members, assignments) : members,
    [form.taskAssignedTeam, members, assignments]
  )

  const groupedTaskMembers = useMemo(
    () => groupMembersByTeam(teams, members, assignments),
    [teams, members, assignments]
  )

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.taskName.trim()) return
    const memberId = form.taskAssignedMember ? Number(form.taskAssignedMember) : null
    onSave({
      taskName: form.taskName.trim(),
      taskAssignedTeam: form.taskAssignedTeam ? Number(form.taskAssignedTeam) : null,
      taskAssignedMember: memberId,
      taskAssignedTo: memberId,
      taskPriority: form.taskPriority,
      taskAssign: form.taskAssign,
      taskStartDate: form.taskStartDate || null,
      taskDueDate: form.taskDueDate || null,
      taskRelatedTo: form.taskRelatedTo,
      taskDescription: form.taskDescription,
      taskPercentageCompleted: Number(form.taskPercentageCompleted || 0),
      taskType: form.taskType,
      taskPhone: form.taskPhone,
      taskEmail: form.taskEmail,
      taskProjectId: form.taskProjectId ? Number(form.taskProjectId) : null,
      taskExpectedCompletion: form.taskExpectedCompletion || null,
      taskPeriod: form.taskPeriod,
      taskCreatedBy: editingTask?.taskCreatedBy || currentUser?.username
    })
  }

  async function handleToggleTimer() {
    try {
      if (activeLog) {
        const updated = await stopTimer(activeLog.timeLogId || activeLog.id)
        setActiveLog(null)
        setLogs(logs.map(l => (l.timeLogId || l.id) === (updated.timeLogId || updated.id) ? updated : l))
      } else {
        const log = await startTimer(editingTask.taskId || editingTask.id, 'Working')
        setActiveLog(log)
        setLogs([...logs, log])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const lbl = "block text-xs font-semibold text-gray-600 mb-1.5"
  const inp = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder-gray-300 transition-colors"
  const sel = `${inp} text-gray-700 cursor-pointer`

  const tabs = [
    { id: 'details', label: 'Details', icon: 'mdi:form-select' },
    { id: 'assign', label: 'Assignment', icon: 'mdi:account-group-outline' },
    { id: 'tracking', label: 'Tracking', icon: 'mdi:timer-outline' },
  ]

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={editingTask?.taskId || editingTask?.id ? 'Edit Task' : 'Create New Task'}
      subtitle={editingTask?.taskId || editingTask?.id ? 'Update task details and tracking' : 'Create and assign a new task'}
      icon="mdi:clipboard-text-outline"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button
            form="task-form"
            type="submit"
            disabled={saving || !form.taskName.trim()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 hover:scale-105 transition-transform"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            {saving ? <Icon name="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon name="mdi:check-circle-outline" className="w-4 h-4" />}
            {saving ? 'Saving…' : (editingTask?.taskId || editingTask?.id) ? 'Update Task' : 'Create Task'}
          </button>
        </>
      }
    >
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === t.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon name={t.icon} className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
        {/* ─── TAB: Details ─── */}
        {activeTab === 'details' && (
          <div className="space-y-4">
            <div>
              <label className={lbl}>Task Title <span className="text-red-500">*</span></label>
              <input value={form.taskName} onChange={e => setF('taskName', e.target.value)} placeholder="What needs to be done?" className={inp} autoFocus required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className={lbl}>Status</label>
                <select value={form.taskAssign} onChange={e => setF('taskAssign', e.target.value)} className={sel}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Priority</label>
                <select value={form.taskPriority} onChange={e => setF('taskPriority', e.target.value)} className={sel}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Task Type</label>
                <select value={form.taskType} onChange={e => setF('taskType', e.target.value)} className={sel}>
                  {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Project</label>
                <select value={form.taskProjectId} onChange={e => setF('taskProjectId', e.target.value)} className={sel}>
                  <option value="">No Project</option>
                  {projects.map(p => <option key={p.projectId || p.id} value={p.projectId || p.id}>{p.projectName}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Start Date</label>
                <input type="date" value={form.taskStartDate} onChange={e => setF('taskStartDate', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Due Date</label>
                <input type="date" value={form.taskDueDate} onChange={e => setF('taskDueDate', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Period</label>
                <select value={form.taskPeriod} onChange={e => setF('taskPeriod', e.target.value)} className={sel}>
                  <option value="">Select Period</option>
                  {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Expected Completion</label>
                <input type="date" value={form.taskExpectedCompletion} onChange={e => setF('taskExpectedCompletion', e.target.value)} className={inp} />
              </div>
              <div>
                <label className={lbl}>Related To</label>
                <input value={form.taskRelatedTo} onChange={e => setF('taskRelatedTo', e.target.value)} placeholder="Lead, Project, Deal..." className={inp} />
              </div>
            </div>

            <div>
              <label className={lbl}>Description</label>
              <textarea
                value={form.taskDescription}
                onChange={e => setF('taskDescription', e.target.value)}
                placeholder="Add more context or details..."
                rows={3}
                className={`${inp} resize-none`}
              />
            </div>

            <div>
              <label className={lbl}>Completion % — <span className="text-indigo-600 font-bold">{form.taskPercentageCompleted}%</span></label>
              <input
                type="range" min="0" max="100" step="5"
                value={form.taskPercentageCompleted}
                onChange={e => setF('taskPercentageCompleted', e.target.value)}
                className="w-full accent-indigo-600"
              />
              <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${form.taskPercentageCompleted >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                  style={{ width: `${form.taskPercentageCompleted}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: Assignment ─── */}
        {activeTab === 'assign' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {isAdmin && (
              <div>
                <label className={lbl}>Assign to Team</label>
                <select value={form.taskAssignedTeam} onChange={e => setF('taskAssignedTeam', e.target.value)} className={sel}>
                  <option value="">No specific team</option>
                  {teams.map(t => <option key={getTeamId(t)} value={getTeamId(t)}>{getTeamLabel(t)}</option>)}
                </select>
              </div>
            )}

            {isAdmin && (
              <div>
                <label className={lbl}>Assign to Member</label>
                <select value={form.taskAssignedMember} onChange={e => setF('taskAssignedMember', e.target.value)} className={sel}>
                  <option value="">Unassigned</option>
                  {form.taskAssignedTeam ? (
                    availableMembers.map(m => (
                      <option key={getMemberId(m)} value={getMemberId(m)}>{getMemberLabel(m)}</option>
                    ))
                  ) : (
                    <>
                      {groupedTaskMembers.groupedTeams.map(({ team, members: mems }) => (
                        <optgroup key={getTeamId(team)} label={`📁 ${getTeamLabel(team)}`}>
                          {mems.map(m => (
                            <option key={getMemberId(m)} value={getMemberId(m)}>{getMemberLabel(m)}</option>
                          ))}
                        </optgroup>
                      ))}
                      {groupedTaskMembers.unassigned.length > 0 && (
                        <optgroup label="👤 General Members">
                          {groupedTaskMembers.unassigned.map(m => (
                            <option key={getMemberId(m)} value={getMemberId(m)}>{getMemberLabel(m)}</option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  )}
                </select>
              </div>
            )}

            <div>
              <label className={lbl}>Contact Phone</label>
              <input type="tel" value={form.taskPhone} onChange={e => setF('taskPhone', e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Contact Email</label>
              <input type="email" value={form.taskEmail} onChange={e => setF('taskEmail', e.target.value)} className={inp} />
            </div>
          </div>
        )}

        {/* ─── TAB: Time Tracking ─── */}
        {activeTab === 'tracking' && (
          <>
            {(editingTask?.taskId || editingTask?.id) ? (
              <>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Time Tracking</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {logs.length} sessions · Total: <span className="font-bold text-indigo-700">{logs.reduce((a, l) => a + (l.durationMinutes || 0), 0)} mins</span>
                    </p>
                    {activeLog && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold mt-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        Timer running...
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleTimer}
                    disabled={timeLoading}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 hover:scale-105 ${
                      activeLog ? 'bg-red-500 hover:bg-red-600 shadow-red-200 shadow-sm' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 shadow-sm'
                    }`}
                  >
                    {timeLoading ? <Icon name="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon name={activeLog ? 'mdi:stop-circle-outline' : 'mdi:play-circle-outline'} className="w-4 h-4" />}
                    {activeLog ? 'Stop Timer' : 'Start Timer'}
                  </button>
                </div>

                {logs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sessions</h4>
                    {logs.map((log, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div>
                          <p className="text-xs font-semibold text-gray-700">{log.note || 'Session'}</p>
                          <p className="text-[10px] text-gray-400">{log.startTime ? new Date(log.startTime).toLocaleString() : '—'}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${log.endTime ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {log.endTime ? `${log.durationMinutes || 0} min` : '⏱ Active'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Icon name="mdi:timer-sand" className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-sm text-gray-500 font-medium">Save task first to enable time tracking</p>
              </div>
            )}
          </>
        )}
      </form>
    </AppDrawer>
  )
}

/* ═══════════════════════════════ LIST VIEW ══════════════════════════════ */
function ListView({ tasks, memberById, onEdit, onDelete, onStatusChange, isAdmin }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mb-4">
            <Icon name="mdi:clipboard-check-outline" className="w-8 h-8 text-gray-200" />
          </div>
          <p className="text-base font-semibold text-gray-400">No tasks yet</p>
          <p className="text-sm text-gray-300">Create your first task to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '900px' }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['#', 'Task', 'Type', 'Status', 'Priority', 'Assignee', 'Due Date', 'Progress', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tasks.map((task, i) => {
                const member = memberById.get(Number(task.taskAssignedMember || task.taskAssignedTo))
                const pct = task.taskPercentageCompleted || 0
                const overdue = isOverdue(task.taskDueDate) && task.taskAssign !== 'Done'
                const pm = PRIORITY_META[task.taskPriority] || PRIORITY_META.Medium
                const sm = STATUS_META[task.taskAssign] || STATUS_META['To Do']
                return (
                  <tr
                    key={genId(task)}
                    className="hover:bg-indigo-50/20 transition-colors cursor-pointer group"
                    onClick={() => onEdit(task)}
                  >
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-indigo-400 font-bold">TK-{String(genId(task)).padStart(3,'0')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <p className={`font-semibold text-gray-900 truncate max-w-[200px] ${task.taskAssign === 'Done' ? 'line-through text-gray-400' : ''}`}>{task.taskName}</p>
                        {task.taskRelatedTo && <p className="text-xs text-gray-400 truncate">{task.taskRelatedTo}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={task.taskType} />
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {isAdmin ? (
                        <select
                          value={task.taskAssign || 'To Do'}
                          onChange={e => onStatusChange(task, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer outline-none ${sm.badge}`}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${sm.badge}`}>{task.taskAssign || 'To Do'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={task.taskPriority || 'Medium'} />
                    </td>
                    <td className="px-4 py-3">
                      {member ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={getMemberLabel(member)} size={6} />
                          <span className="text-xs text-gray-600 truncate max-w-[90px]">{getMemberLabel(member)}</span>
                        </div>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {task.taskDueDate ? (
                        <span className={`flex items-center gap-1 text-xs font-medium ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
                          {overdue && <Icon name="mdi:alert-circle" className="w-3 h-3" />}
                          {new Date(task.taskDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 shrink-0 w-7 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEdit(task)} className="p-1.5 rounded-lg text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"><Icon name="mdi:pencil-outline" className="w-3.5 h-3.5" /></button>
                        <button onClick={() => onDelete(task)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Icon name="mdi:trash-can-outline" className="w-3.5 h-3.5" /></button>
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
  )
}

/* ═══════════════════════════════ MAIN PAGE ══════════════════════════════ */
export default function TaskPage() {
  const taskHook       = useTask()
  const teamHook       = useTeam()
  const teamMemberHook = useTeamMember()
  const createTeamHook = useCreateTeam()
  const projectHook    = useProject()

  const isAdmin     = useAuthStore(s => s.isAdmin())
  const currentUser = useAuthStore(s => s.user)

  const [tasks,       setTasks]       = useState([])
  const [teams,       setTeams]       = useState([])
  const [members,     setMembers]     = useState([])
  const [assignments, setAssignments] = useState([])
  const [projects,    setProjects]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)

  const [view,            setView]           = useState('Board')
  const [query,           setQuery]          = useState('')
  const [filterPriority,  setFilterPriority] = useState('')
  const [filterStatus,    setFilterStatus]   = useState('')
  const [filterTeam,      setFilterTeam]     = useState('')
  const [filterType,      setFilterType]     = useState('')
  const [filterAssignee,  setFilterAssignee] = useState('')

  const [modalOpen,    setModalOpen]    = useState(false)
  const [editingTask,  setEditingTask]  = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast,        setToast]        = useState(null)

  // Drag & drop state
  const [draggingTask,    setDraggingTask]   = useState(null)
  const [dropTargetCol,   setDropTargetCol]  = useState(null)
  const dragCounterRef = useRef({})

  const toastTimer = useRef(null)

  function showToast(type, msg) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ type, msg })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  /* ─── load ─── */
  async function loadData() {
    setLoading(true)
    try {
      const [taskData, teamData, memberData, assignmentData, projectData] = await Promise.all([
        taskHook.getAll(),
        teamHook.getAll(),
        teamMemberHook.getAll(),
        createTeamHook.getAll(),
        projectHook.getAll(),
      ])
      setTasks(Array.isArray(taskData) ? taskData : [])
      setTeams(Array.isArray(teamData) ? teamData : [])
      setMembers(Array.isArray(memberData) ? memberData : [])
      setAssignments(Array.isArray(assignmentData) ? assignmentData : [])
      setProjects(Array.isArray(projectData) ? projectData : [])
    } catch {
      setTasks([]); setTeams([]); setMembers([]); setAssignments([]); setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, []) // eslint-disable-line

  /* ─── lookup maps ─── */
  const memberById = useMemo(() => new Map(members.map(m => [Number(getMemberId(m)), m])), [members])
  const teamById   = useMemo(() => new Map(teams.map(t => [Number(getTeamId(t)), t])), [teams])

  /* ─── filtered tasks ─── */
  const filteredTasks = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tasks.filter(t => {
      if (filterPriority && t.taskPriority !== filterPriority)                        return false
      if (filterStatus   && t.taskAssign   !== filterStatus)                          return false
      if (filterTeam     && String(t.taskAssignedTeam) !== String(filterTeam))        return false
      if (filterType     && t.taskType     !== filterType)                             return false
      if (filterAssignee && String(t.taskAssignedMember || t.taskAssignedTo) !== String(filterAssignee)) return false
      if (!q) return true
      const member = memberById.get(Number(t.taskAssignedMember || t.taskAssignedTo))
      return [t.taskName, t.taskRelatedTo, t.taskPriority, t.taskType, getMemberLabel(member)]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    })
  }, [tasks, query, filterPriority, filterStatus, filterTeam, filterType, filterAssignee, memberById])

  /* ─── grouped for kanban ─── */
  const grouped = useMemo(() => {
    const map = {}
    STATUSES.forEach(s => { map[s] = [] })
    filteredTasks.forEach(t => {
      const s = t.taskAssign || 'To Do'
      if (!map[s]) map[s] = []
      map[s].push(t)
    })
    return map
  }, [filteredTasks])

  /* ─── stats ─── */
  const stats = useMemo(() => ({
    total:      tasks.length,
    todo:       tasks.filter(t => t.taskAssign === 'To Do').length,
    inProgress: tasks.filter(t => t.taskAssign === 'In Progress').length,
    blocked:    tasks.filter(t => t.taskAssign === 'Blocked').length,
    done:       tasks.filter(t => t.taskAssign === 'Done').length,
    overdue:    tasks.filter(t => isOverdue(t.taskDueDate) && t.taskAssign !== 'Done').length,
    critical:   tasks.filter(t => t.taskPriority === 'Critical').length,
  }), [tasks])

  /* ─── drag & drop handlers ─── */
  const handleDragStart = useCallback((e, task) => {
    setDraggingTask(task)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(genId(task)))
  }, [])

  const handleDragOver = useCallback((e, status) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetCol(status)
  }, [])

  const handleDragLeave = useCallback((e, status) => {
    // Only clear if leaving the actual column element
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTargetCol(null)
    }
  }, [])

  const handleDrop = useCallback(async (e, status) => {
    e.preventDefault()
    setDropTargetCol(null)
    if (!draggingTask) return
    const taskId = genId(draggingTask)
    if (draggingTask.taskAssign === status) { setDraggingTask(null); return }

    // Optimistic UI update
    setTasks(prev => prev.map(t => (genId(t) === taskId ? { ...t, taskAssign: status } : t)))
    setDraggingTask(null)
    try {
      await taskHook.update(taskId, { ...draggingTask, taskAssign: status })
      showToast('success', `Moved to "${status}"`)
    } catch {
      showToast('error', 'Failed to move task')
      await loadData()
    }
  }, [draggingTask, taskHook]) // eslint-disable-line

  const handleDragEnd = useCallback(() => {
    setDraggingTask(null)
    setDropTargetCol(null)
  }, [])

  /* ─── handlers ─── */
  function openCreate(defaultStatus) {
    setEditingTask(defaultStatus ? { ...EMPTY_FORM, taskAssign: defaultStatus } : null)
    setModalOpen(true)
  }

  function openEdit(task) {
    setEditingTask(task)
    setModalOpen(true)
  }

  async function handleSave(payload) {
    setSaving(true)
    try {
      if (editingTask?.taskId || editingTask?.id) {
        await taskHook.update(editingTask.taskId || editingTask.id, payload)
        showToast('success', 'Task updated successfully.')
      } else {
        await taskHook.create(payload)
        showToast('success', 'Task created successfully.')
      }
      setModalOpen(false)
      setEditingTask(null)
      await loadData()
    } catch {
      showToast('error', 'Failed to save task.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(task, newStatus) {
    try {
      const id = task.taskId || task.id
      await taskHook.update(id, { ...task, taskAssign: newStatus })
      setTasks(prev => prev.map(t => (t.taskId || t.id) === id ? { ...t, taskAssign: newStatus } : t))
    } catch {
      showToast('error', 'Could not update status.')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await taskHook.remove(deleteTarget.taskId || deleteTarget.id)
      showToast('success', 'Task deleted.')
      setDeleteTarget(null)
      await loadData()
    } catch {
      showToast('error', 'Failed to delete task.')
      setDeleteTarget(null)
    }
  }

  const hasFilters = query || filterPriority || filterStatus || filterTeam || filterType || filterAssignee
  const clearFilters = () => { setQuery(''); setFilterPriority(''); setFilterStatus(''); setFilterTeam(''); setFilterType(''); setFilterAssignee('') }

  /* ─── completion percentage ─── */
  const completionPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

  /* ────────────────────────────── RENDER ──────────────────────────────── */
  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-8" onDragEnd={handleDragEnd}>

      {/* ── Header Banner ── */}
      <div className="hero-dark-card rounded-2xl overflow-hidden shadow-sm" style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)' }}>
        <div className="px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <Icon name="mdi:clipboard-list-outline" className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Task Management</h1>
              <p className="text-indigo-200 text-sm mt-0.5">{stats.total} total tasks · {completionPct}% complete</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-3 mr-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{loading ? '–' : stats.inProgress}</p>
                <p className="text-[10px] text-indigo-300 font-medium">In Progress</p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-300">{loading ? '–' : stats.overdue}</p>
                <p className="text-[10px] text-indigo-300 font-medium">Overdue</p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-300">{loading ? '–' : stats.done}</p>
                <p className="text-[10px] text-indigo-300 font-medium">Done</p>
              </div>
            </div>
            <button
              onClick={() => openCreate()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-indigo-900 hover:scale-105 transition-transform shadow-sm shrink-0"
              style={{ background: 'linear-gradient(135deg, #a5f3fc, #e0e7ff)' }}
            >
              <Icon name="mdi:plus" className="w-4 h-4" />
              New Task
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="text-xs text-white/70 font-medium shrink-0">{completionPct}% done</span>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Total',      value: stats.total,      icon: 'mdi:clipboard-list-outline', bg: 'bg-indigo-50',  text: 'text-indigo-600',  action: '' },
          { label: 'To Do',      value: stats.todo,       icon: 'mdi:circle-outline',         bg: 'bg-slate-50',   text: 'text-slate-600',   action: 'To Do' },
          { label: 'Progress',   value: stats.inProgress, icon: 'mdi:progress-clock',         bg: 'bg-blue-50',    text: 'text-blue-600',    action: 'In Progress' },
          { label: 'Blocked',    value: stats.blocked,    icon: 'mdi:cancel',                 bg: 'bg-red-50',     text: 'text-red-600',     action: 'Blocked' },
          { label: 'Done',       value: stats.done,       icon: 'mdi:check-circle-outline',   bg: 'bg-emerald-50', text: 'text-emerald-600', action: 'Done' },
          { label: 'Overdue',    value: stats.overdue,    icon: 'mdi:alert-circle-outline',   bg: 'bg-amber-50',   text: 'text-amber-600',   action: '' },
          { label: 'Critical',   value: stats.critical,   icon: 'mdi:fire',                   bg: 'bg-rose-50',    text: 'text-rose-600',    action: '' },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => s.action ? setFilterStatus(filterStatus === s.action ? '' : s.action) : null}
            className={`bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-3 flex items-center gap-2.5 transition-all hover:shadow-md ${
              filterStatus === s.action && s.action ? 'ring-2 ring-indigo-400' : ''
            } ${s.action ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
              <Icon name={s.icon} className={`w-4 h-4 ${s.text}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 font-medium leading-none mb-0.5 truncate">{s.label}</p>
              <p className="text-lg font-bold text-gray-900 leading-none">{loading ? '…' : s.value}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Icon name="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white">
              <option value="">All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white">
              <option value="">All Types</option>
              {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white">
              <option value="">All Teams</option>
              {teams.map(t => <option key={getTeamId(t)} value={getTeamId(t)}>📁 {getTeamLabel(t)}</option>)}
            </select>

            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white">
              <option value="">All Assignees</option>
              {members.map(m => <option key={getMemberId(m)} value={getMemberId(m)}>{getMemberLabel(m)}</option>)}
            </select>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-xs text-red-500 hover:bg-red-50 font-semibold rounded-xl transition-colors border border-red-100"
              >
                <Icon name="mdi:close-circle" className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>

          {/* Filters count badge */}
          {hasFilters && (
            <span className="text-xs text-gray-500 shrink-0">
              <span className="font-bold text-indigo-600">{filteredTasks.length}</span> / {tasks.length} tasks
            </span>
          )}

          {/* View switcher */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 shrink-0 ml-auto">
            {VIEWS.map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  view === v ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon name={v === 'Board' ? 'mdi:view-column-outline' : 'mdi:format-list-bulleted'} className="w-3.5 h-3.5" />
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
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center">
              <Icon name="mdi:loading" className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Loading tasks...</p>
          </div>
        </div>
      ) : view === 'Board' ? (
        /* ─ KANBAN BOARD ─ */
        <div>
          {draggingTask && (
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl text-sm text-indigo-700 font-medium mb-3 border border-indigo-100">
              <Icon name="mdi:drag" className="w-4 h-4" />
              Dragging: <span className="font-bold">"{draggingTask.taskName}"</span> — Drop it in a column to move
            </div>
          )}
          <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '500px' }}>
            {STATUSES.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={grouped[status] || []}
                memberById={memberById}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onAddTask={openCreate}
                onDragStart={handleDragStart}
                onDrop={(e) => handleDrop(e, status)}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={(e) => handleDragLeave(e, status)}
                isDropTarget={dropTargetCol === status && draggingTask?.taskAssign !== status}
                draggingId={draggingTask ? genId(draggingTask) : null}
              />
            ))}
          </div>
        </div>
      ) : (
        /* ─ LIST VIEW ─ */
        <ListView
          tasks={filteredTasks}
          memberById={memberById}
          teamById={teamById}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          onStatusChange={handleStatusChange}
          isAdmin={isAdmin}
        />
      )}

      {/* ── Task Form Drawer ── */}
      <TaskFormDrawer
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTask(null) }}
        editingTask={editingTask?.taskId || editingTask?.id ? editingTask : (editingTask?.taskAssign ? { taskAssign: editingTask.taskAssign } : null)}
        teams={teams}
        members={members}
        assignments={assignments}
        projects={projects}
        currentUser={currentUser}
        saving={saving}
        onSave={handleSave}
        isAdmin={isAdmin}
      />

      {/* ── Delete Confirm ── */}
      <AppConfirmDialog
        open={deleteTarget !== null}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteTarget?.taskName}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Toast ── */}
      <Toast toast={toast} />
    </div>
  )
}
