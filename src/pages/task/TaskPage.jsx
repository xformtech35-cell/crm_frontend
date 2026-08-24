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
  taskType: 'Sales', taskPhone: '', taskEmail: '',
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

/* ═══════════════════════════════ DONE CHECKLIST MODAL ════════════════════ */
function DoneChecklistModal({ open, onConfirm, onCancel, taskTitle }) {
  const [checked1, setChecked1] = useState(false)
  const [checked2, setChecked2] = useState(false)
  const [checked3, setChecked3] = useState(false)

  useEffect(() => {
    if (open) {
      setChecked1(false); setChecked2(false); setChecked3(false)
    }
  }, [open])

  if (!open) return null
  const allChecked = checked1 && checked2 && checked3

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100">
        <div className="flex items-center gap-3 mb-4 text-emerald-600">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Icon name="mdi:clipboard-check-outline" className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Done Completion Verification</h3>
            <p className="text-xs text-gray-400">Task: "{taskTitle}"</p>
          </div>
        </div>

        <p className="text-xs text-gray-600 mb-4 bg-amber-50 border border-amber-100 p-3 rounded-xl font-medium">
          Please verify all 3 mandatory completion steps before marking this task as <strong>Done</strong>.
        </p>

        <div className="space-y-3 mb-6">
          <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
            <input type="checkbox" checked={checked1} onChange={e => setChecked1(e.target.checked)} className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
            <span className="text-xs text-gray-700 font-semibold">1. Did you speak with the client / stakeholder?</span>
          </label>
          <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
            <input type="checkbox" checked={checked2} onChange={e => setChecked2(e.target.checked)} className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
            <span className="text-xs text-gray-700 font-semibold">2. Was the final outcome recorded in the description/notes?</span>
          </label>
          <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
            <input type="checkbox" checked={checked3} onChange={e => setChecked3(e.target.checked)} className="mt-0.5 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
            <span className="text-xs text-gray-700 font-semibold">3. Have you reviewed if any follow-up task is needed?</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
          <button
            type="button"
            disabled={!allChecked}
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all"
          >
            Confirm & Mark Done
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════ KANBAN CARD ════════════════════════════ */
function KanbanCard({ task, memberById, activeTimerLog, onQuickTimer, onEdit, onDelete, onDragStart, isDragging }) {
  const member = memberById.get(Number(task.taskAssignedMember || task.taskAssignedTo))
  const pct    = task.taskPercentageCompleted || 0
  const due    = task.taskDueDate
  const overdue = isOverdue(due) && task.taskAssign !== 'Done'
  const taskRef = `TK-${String(genId(task)).padStart(3, '0')}`
  const pm = PRIORITY_META[task.taskPriority] || PRIORITY_META.Medium
  const taskId = genId(task)
  const isTimerActive = activeTimerLog && (Number(activeTimerLog.taskId) === Number(taskId) || Number(activeTimerLog.id) === Number(taskId))
  const spentMins = task.taskTimeSpentMinutes || 0

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onEdit(task)}
      className={`bg-white rounded-xl border shadow-sm transition-all duration-150 p-3.5 group cursor-grab active:cursor-grabbing select-none relative
        ${isDragging ? 'opacity-40 scale-95 shadow-none border-indigo-300' : isTimerActive ? 'border-emerald-300 ring-2 ring-emerald-100 shadow-md' : 'border-gray-100 hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-200/60'}`}
      style={{ borderLeftWidth: '3px', borderLeftColor: isTimerActive ? '#10b981' : pm.dot.replace('bg-', '').includes('-') ? `var(--tw-${pm.dot})` : '#6366f1' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-indigo-400 tracking-wide">{taskRef}</span>
          <PriorityBadge priority={task.taskPriority || 'Medium'} />
          <TypeBadge type={task.taskType} />
          {isTimerActive && (
            <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 bg-white rounded-full" />
              ⏱ Running
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => onQuickTimer(task, e)}
            title={isTimerActive ? 'Stop Timer' : 'Start Timer'}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
              isTimerActive
                ? 'bg-red-500 text-white shadow-sm hover:bg-red-600'
                : spentMins > 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            }`}
          >
            <Icon name={isTimerActive ? 'mdi:stop-circle-outline' : 'mdi:play-circle-outline'} className="w-3.5 h-3.5" />
            {isTimerActive ? 'Stop' : spentMins > 0 ? `${spentMins}m` : 'Timer'}
          </button>
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

      <p className={`text-sm font-semibold leading-snug mb-2.5 ${task.taskAssign === 'Done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
        {task.taskName}
      </p>

      {task.taskRelatedTo && (
        <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1 truncate">
          <Icon name="mdi:link-variant" className="w-3 h-3 shrink-0" />
          {task.taskRelatedTo}
        </p>
      )}
      {task.taskCreatedBy && (
        <p className="text-[10px] text-gray-400 mb-2">by {task.taskCreatedBy}</p>
      )}

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

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-50">
        <div className="flex items-center gap-1.5 min-w-0">
          {member ? (
            <>
              <Avatar name={getMemberLabel(member)} size={6} />
              <span className="text-xs text-gray-500 truncate max-w-[90px]">{getMemberLabel(member)}</span>
            </>
          ) : (
            <span className="text-xs text-red-500 font-semibold italic">Unassigned *</span>
          )}
        </div>
        {due ? (
          <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
            overdue ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
          }`}>
            {overdue && <Icon name="mdi:alert-circle" className="w-2.5 h-2.5" />}
            <Icon name="mdi:calendar-outline" className="w-2.5 h-2.5" />
            {new Date(due).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">No Date *</span>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════ KANBAN COLUMN ══════════════════════════ */
function KanbanColumn({ status, tasks, memberById, activeTimerLog, onQuickTimer, onEdit, onDelete, onAddTask, onDragStart, onDrop, onDragOver, onDragLeave, isDropTarget, draggingId }) {
  const meta = STATUS_META[status] || STATUS_META['To Do']
  const statusIcons = {
    'To Do': 'mdi:circle-outline',
    'In Progress': 'mdi:progress-clock',
    'Blocked': 'mdi:cancel',
    'Done': 'mdi:check-circle-outline',
  }

  return (
    <div
      onDragOver={(e) => onDragOver(e, status)}
      onDragLeave={(e) => onDragLeave(e, status)}
      onDrop={(e) => onDrop(e, status)}
      className={`flex flex-col rounded-2xl border transition-all duration-200 min-w-[280px] max-w-[340px] flex-1 ${meta.bg} ${
        isDropTarget ? 'border-indigo-400 ring-2 ring-indigo-200/50 scale-[1.01]' : meta.border
      }`}
    >
      <div className={`p-3.5 rounded-t-2xl border-b flex items-center justify-between ${meta.header} ${meta.border}`}>
        <div className="flex items-center gap-2">
          <Icon name={statusIcons[status] || 'mdi:circle-outline'} className="w-4 h-4" style={{ color: meta.headerDot }} />
          <span className="text-xs font-bold text-gray-800 tracking-wide uppercase">{status}</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white text-gray-600 shadow-sm border border-gray-100">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          className="p-1 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-white transition-colors"
          title={`Add task to ${status}`}
        >
          <Icon name="mdi:plus" className="w-4 h-4" />
        </button>
      </div>

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
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <Icon name="mdi:clipboard-text-outline" className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-xs text-gray-400 font-medium">No tasks here</p>
            <button onClick={() => onAddTask(status)} className="mt-2 text-xs text-indigo-500 hover:underline font-semibold">+ Add task</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════ TASK FORM DRAWER ═══════════════════════ */
function TaskFormDrawer({ open, onClose, editingTask, teams, members, assignments, projects, currentUser, saving, onSave, isAdmin, onTimerStateChange }) {
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [formErrors, setFormErrors] = useState({})
  const { startTimer, stopTimer, getLogsByTask, actionLoading, fetchLoading } = useTaskTime()
  const [logs, setLogs] = useState([])
  const [activeLog, setActiveLog] = useState(null)
  const [activeTab, setActiveTab] = useState('details')
  const [elapsedSecs, setElapsedSecs] = useState(0)

  useEffect(() => {
    if (open) {
      setActiveTab('details')
      setFormErrors({})
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
    let interval = null
    if (activeLog && activeLog.startTime) {
      const startMs = new Date(activeLog.startTime).getTime()
      setElapsedSecs(Math.max(0, Math.floor((Date.now() - startMs) / 1000)))
      interval = setInterval(() => {
        setElapsedSecs(Math.max(0, Math.floor((Date.now() - startMs) / 1000)))
      }, 1000)
    } else {
      setElapsedSecs(0)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeLog])

  const elapsedStr = useMemo(() => {
    const hrs = Math.floor(elapsedSecs / 3600)
    const mins = Math.floor((elapsedSecs % 3600) / 60)
    const secs = elapsedSecs % 60
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, [elapsedSecs])

  const totalMins = useMemo(() => {
    let sum = 0
    logs.forEach(l => {
      if (l.durationMinutes) sum += l.durationMinutes
    })
    if (editingTask?.taskTimeSpentMinutes) {
      sum = Math.max(sum, editingTask.taskTimeSpentMinutes)
    }
    return sum
  }, [logs, editingTask?.taskTimeSpentMinutes])

  useEffect(() => {
    if (open) {
      const defaultProjId = projects && projects.length > 0 ? (projects[0].projectId || projects[0].id) : ''
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
          taskType: editingTask.taskType || 'Sales',
          taskPhone: editingTask.taskPhone || '',
          taskEmail: editingTask.taskEmail || '',
          taskProjectId: editingTask.taskProjectId || defaultProjId,
          taskExpectedCompletion: editingTask.taskExpectedCompletion || '',
          taskPeriod: editingTask.taskPeriod || '',
        })
      } else {
        setForm({ ...EMPTY_FORM, taskProjectId: defaultProjId })
      }
    }
  }, [open, editingTask, projects])

  function setF(k, v) {
    setForm(prev => {
      const next = { ...prev, [k]: v }
      if (k === 'taskAssignedTeam') next.taskAssignedMember = ''
      return next
    })
    if (formErrors[k]) {
      setFormErrors(prev => ({ ...prev, [k]: null }))
    }
  }

  const availableMembers = useMemo(
    () => form.taskAssignedTeam ? membersForTeam(Number(form.taskAssignedTeam), members, assignments) : members,
    [form.taskAssignedTeam, members, assignments]
  )

  const groupedTaskMembers = useMemo(
    () => groupMembersByTeam(teams, members, assignments),
    [teams, members, assignments]
  )

  function validateForm() {
    const errs = {}
    if (!form.taskName.trim()) errs.taskName = 'Task Title is mandatory'
    if (!form.taskAssignedMember) errs.taskAssignedMember = 'Assignee is mandatory'
    if (!form.taskDueDate) errs.taskDueDate = 'Due Date is mandatory'
    if (!form.taskType) errs.taskType = 'Task Type is mandatory'
    if (!form.taskRelatedTo.trim()) errs.taskRelatedTo = 'Related Lead/Project reference is mandatory'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validateForm()) {
      if (formErrors.taskAssignedMember && !form.taskName.trim()) setActiveTab('details')
      return
    }
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
      taskRelatedTo: form.taskRelatedTo.trim(),
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
      const taskId = editingTask.taskId || editingTask.id
      if (activeLog) {
        const updated = await stopTimer(activeLog.timeLogId || activeLog.id)
        setActiveLog(null)
        setLogs(logs.map(l => (l.timeLogId || l.id) === (updated.timeLogId || updated.id) ? updated : l))
      } else {
        const log = await startTimer(taskId, 'Working')
        setActiveLog(log)
        setLogs([...logs, log])
      }
      if (onTimerStateChange) onTimerStateChange()
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
        <div className="flex items-center justify-between w-full gap-3 flex-wrap sm:flex-nowrap">
          {(editingTask?.taskId || editingTask?.id) ? (
            <div className="flex items-center gap-2.5 bg-indigo-50/60 border border-indigo-100/80 rounded-2xl px-3 py-1.5 shrink-0 shadow-sm">
              <button
                type="button"
                onClick={handleToggleTimer}
                disabled={actionLoading}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-sm hover:scale-105 active:scale-95 ${
                  activeLog ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                }`}
              >
                {actionLoading ? (
                  <Icon name="mdi:loading" className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <Icon name={activeLog ? 'mdi:stop' : 'mdi:play'} className="w-3.5 h-3.5 shrink-0 text-white" />
                )}
                <span>{activeLog ? 'Stop Timer' : 'Start Timer'}</span>
              </button>
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-semibold text-gray-700">
                  {logs.length} sessions · Total: <span className="font-bold text-indigo-700">{totalMins} mins</span>
                </span>
                {activeLog && (
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                    ⏱ Running ({elapsedStr})
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 text-[11px] font-medium text-gray-400">
              <Icon name="mdi:timer-outline" className="w-3.5 h-3.5 text-gray-300" />
              <span>Save task to enable timer</span>
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button
              form="task-form"
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 hover:scale-105 transition-transform"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              {saving ? <Icon name="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon name="mdi:check-circle-outline" className="w-4 h-4" />}
              {saving ? 'Saving…' : (editingTask?.taskId || editingTask?.id) ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </div>
      }
    >


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
        {activeTab === 'details' && (
          <div className="space-y-4">
            <div>
              <label className={lbl}>Task Title <span className="text-red-500">*</span></label>
              <input value={form.taskName} onChange={e => setF('taskName', e.target.value)} placeholder="What needs to be done?" className={`${inp} ${formErrors.taskName ? 'border-red-400 ring-2 ring-red-100' : ''}`} autoFocus />
              {formErrors.taskName && <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1"><Icon name="mdi:alert-circle" className="w-3 h-3" />{formErrors.taskName}</p>}
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
                <label className={lbl}>Task Type <span className="text-red-500">*</span></label>
                <select value={form.taskType} onChange={e => setF('taskType', e.target.value)} className={`${sel} ${formErrors.taskType ? 'border-red-400' : ''}`}>
                  {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {formErrors.taskType && <p className="text-[11px] text-red-500 font-semibold mt-1">{formErrors.taskType}</p>}
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
                <label className={lbl}>Due Date <span className="text-red-500">*</span></label>
                <input type="date" value={form.taskDueDate} onChange={e => setF('taskDueDate', e.target.value)} className={`${inp} ${formErrors.taskDueDate ? 'border-red-400' : ''}`} />
                {formErrors.taskDueDate && <p className="text-[11px] text-red-500 font-semibold mt-1">{formErrors.taskDueDate}</p>}
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
                <label className={lbl}>Related To <span className="text-red-500">*</span></label>
                <input value={form.taskRelatedTo} onChange={e => setF('taskRelatedTo', e.target.value)} placeholder="Lead #4966, Client..." className={`${inp} ${formErrors.taskRelatedTo ? 'border-red-400' : ''}`} />
                {formErrors.taskRelatedTo && <p className="text-[11px] text-red-500 font-semibold mt-1">{formErrors.taskRelatedTo}</p>}
              </div>
            </div>

            <div>
              <label className={lbl}>Description</label>
              <textarea
                value={form.taskDescription}
                onChange={e => setF('taskDescription', e.target.value)}
                placeholder="Add context or notes..."
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
            </div>
          </div>
        )}

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

            <div>
              <label className={lbl}>Assign to Member <span className="text-red-500">*</span></label>
              <select value={form.taskAssignedMember} onChange={e => setF('taskAssignedMember', e.target.value)} className={`${sel} ${formErrors.taskAssignedMember ? 'border-red-400' : ''}`}>
                <option value="">Select Assignee</option>
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
              {formErrors.taskAssignedMember && <p className="text-[11px] text-red-500 font-semibold mt-1">{formErrors.taskAssignedMember}</p>}
            </div>

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
function ListView({ tasks, memberById, selectedTaskIds, setSelectedTaskIds, activeTimerLog, onQuickTimer, onEdit, onDelete, onStatusChange, onBulkApply, members, isAdmin }) {
  const [bulkMember, setBulkMember]     = useState('')
  const [bulkDueDate, setBulkDueDate]   = useState('')
  const [bulkPriority, setBulkPriority] = useState('')
  const [bulkStatus, setBulkStatus]     = useState('')
  const [bulkApplying, setBulkApplying] = useState(false)

  const allSelected = tasks.length > 0 && selectedTaskIds.length === tasks.length

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedTaskIds([])
    } else {
      setSelectedTaskIds(tasks.map(t => genId(t)))
    }
  }

  function toggleSelectRow(taskId) {
    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId))
    } else {
      setSelectedTaskIds([...selectedTaskIds, taskId])
    }
  }

  async function handleApplyBulk() {
    if (selectedTaskIds.length === 0) return
    setBulkApplying(true)
    try {
      await onBulkApply({
        taskIds: selectedTaskIds,
        taskAssignedMember: bulkMember ? Number(bulkMember) : null,
        taskDueDate: bulkDueDate || null,
        taskPriority: bulkPriority || null,
        taskAssign: bulkStatus || null,
      })
      setSelectedTaskIds([])
      setBulkMember(''); setBulkDueDate(''); setBulkPriority(''); setBulkStatus('')
    } finally {
      setBulkApplying(false)
    }
  }

  return (
    <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
          <table className="w-full text-sm" style={{ minWidth: '1000px' }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
                </th>
                {['#', 'Task', 'Type', 'Status', 'Priority', 'Assignee', 'Due Date', 'Progress', 'Time Track', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tasks.map((task) => {
                const taskId = genId(task)
                const isSelected = selectedTaskIds.includes(taskId)
                const member = memberById.get(Number(task.taskAssignedMember || task.taskAssignedTo))
                const pct = task.taskPercentageCompleted || 0
                const overdue = isOverdue(task.taskDueDate) && task.taskAssign !== 'Done'
                const sm = STATUS_META[task.taskAssign] || STATUS_META['To Do']
                const isTimerActive = activeTimerLog && (Number(activeTimerLog.taskId) === Number(taskId) || Number(activeTimerLog.id) === Number(taskId))
                const spentMins = task.taskTimeSpentMinutes || 0

                return (
                  <tr
                    key={taskId}
                    className={`hover:bg-indigo-50/20 transition-colors cursor-pointer group ${isSelected ? 'bg-indigo-50/40' : ''}`}
                    onClick={() => onEdit(task)}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelectRow(taskId)} className="w-4 h-4 text-indigo-600 rounded cursor-pointer" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-indigo-400 font-bold">TK-{String(taskId).padStart(3,'0')}</span>
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
                      ) : <span className="text-xs text-red-500 font-semibold italic">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3">
                      {task.taskDueDate ? (
                        <span className={`flex items-center gap-1 text-xs font-medium ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
                          {overdue && <Icon name="mdi:alert-circle" className="w-3 h-3" />}
                          {new Date(task.taskDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                      ) : <span className="text-red-500 text-xs font-semibold">No Date</span>}
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
                      <button
                        onClick={(e) => onQuickTimer(task, e)}
                        title={isTimerActive ? 'Stop Timer' : 'Start Timer'}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                          isTimerActive
                            ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-200'
                            : spentMins > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
                        }`}
                      >
                        <Icon name={isTimerActive ? 'mdi:stop-circle-outline' : 'mdi:play-circle-outline'} className="w-3.5 h-3.5" />
                        {isTimerActive ? 'Stop Timer' : spentMins > 0 ? `${spentMins} mins` : 'Start Timer'}
                      </button>
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

      {/* Fix 4: Floating Bulk Action Toolbar */}
      {selectedTaskIds.length > 0 && (
        <div className="sticky bottom-4 mx-4 mb-4 p-3 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-fade-in border border-indigo-500/30 z-40">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold text-xs">
              {selectedTaskIds.length}
            </span>
            <span className="text-xs font-semibold text-indigo-200">Tasks Selected for Bulk Edit</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select value={bulkMember} onChange={e => setBulkMember(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 focus:outline-none">
              <option value="">Reassign To...</option>
              {members.map(m => <option key={getMemberId(m)} value={getMemberId(m)}>{getMemberLabel(m)}</option>)}
            </select>

            <input type="date" value={bulkDueDate} onChange={e => setBulkDueDate(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 focus:outline-none" />

            <select value={bulkPriority} onChange={e => setBulkPriority(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 focus:outline-none">
              <option value="">Priority...</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="bg-slate-800 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 focus:outline-none">
              <option value="">Status...</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <button
              onClick={handleApplyBulk}
              disabled={bulkApplying || (!bulkMember && !bulkDueDate && !bulkPriority && !bulkStatus)}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold transition-transform hover:scale-105 shadow-sm flex items-center gap-1"
            >
              {bulkApplying ? <Icon name="mdi:loading" className="w-3.5 h-3.5 animate-spin" /> : <Icon name="mdi:check-all" className="w-3.5 h-3.5" />}
              Apply Bulk Edit
            </button>

            <button onClick={() => setSelectedTaskIds([])} className="p-1 text-slate-400 hover:text-white" title="Deselect All">
              <Icon name="mdi:close-circle" className="w-4 h-4" />
            </button>
          </div>
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
  const { startTimer, stopTimer, getActiveTimer } = useTaskTime()

  const isAdmin     = useAuthStore(s => s.isAdmin())
  const currentUser = useAuthStore(s => s.user)

  const [tasks,           setTasks]           = useState([])
  const [teams,           setTeams]           = useState([])
  const [members,         setMembers]         = useState([])
  const [assignments,     setAssignments]     = useState([])
  const [projects,        setProjects]        = useState([])
  const [loading,         setLoading]         = useState(true)
  const [saving,          setSaving]          = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState([])
  const [activeTimerLog,  setActiveTimerLog]  = useState(null)

  const [view,            setView]           = useState('Board')
  const [query,           setQuery]          = useState('')
  const [filterPriority,  setFilterPriority] = useState('')
  const [filterStatus,    setFilterStatus]   = useState('')
  const [filterTeam,      setFilterTeam]     = useState('')
  const [filterType,      setFilterType]     = useState('')
  const [filterAssignee,  setFilterAssignee] = useState('')

  const [modalOpen,            setModalOpen]            = useState(false)
  const [editingTask,          setEditingTask]          = useState(null)
  const [deleteTarget,         setDeleteTarget]         = useState(null)
  const [doneModalOpen,        setDoneModalOpen]        = useState(false)
  const [pendingDoneTaskAction, setPendingDoneTaskAction] = useState(null)
  const [toast,                setToast]                = useState(null)

  const [draggingTask,    setDraggingTask]   = useState(null)
  const [dropTargetCol,   setDropTargetCol]  = useState(null)

  const toastTimer = useRef(null)

  function showToast(type, msg) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ type, msg })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  const fetchActiveTimer = useCallback(() => {
    getActiveTimer().then(data => {
      setActiveTimerLog(data)
    }).catch(console.error)
  }, [getActiveTimer])

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
      fetchActiveTimer()
    } catch {
      setTasks([]); setTeams([]); setMembers([]); setAssignments([]); setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, []) // eslint-disable-line

  const handleQuickTimer = useCallback(async (task, e) => {
    if (e) e.stopPropagation()
    const taskId = genId(task)
    try {
      if (activeTimerLog && (Number(activeTimerLog.taskId) === Number(taskId) || Number(activeTimerLog.id) === Number(taskId))) {
        await stopTimer(activeTimerLog.timeLogId || activeTimerLog.id)
        setActiveTimerLog(null)
        showToast('success', `Stopped timer for "${task.taskName}"`)
      } else {
        const log = await startTimer(taskId, 'Quick timer from Task page')
        setActiveTimerLog(log)
        showToast('success', `Started timer for "${task.taskName}"`)
      }
      loadData()
    } catch (err) {
      showToast('error', err?.response?.data?.message || err.message || 'Timer action failed')
    }
  }, [activeTimerLog, startTimer, stopTimer])

  const memberById = useMemo(() => new Map(members.map(m => [Number(getMemberId(m)), m])), [members])
  const teamById   = useMemo(() => new Map(teams.map(t => [Number(getTeamId(t)), t])), [teams])

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

  const stats = useMemo(() => ({
    total:      tasks.length,
    todo:       tasks.filter(t => t.taskAssign === 'To Do').length,
    inProgress: tasks.filter(t => t.taskAssign === 'In Progress').length,
    blocked:    tasks.filter(t => t.taskAssign === 'Blocked').length,
    done:       tasks.filter(t => t.taskAssign === 'Done').length,
    overdue:    tasks.filter(t => isOverdue(t.taskDueDate) && t.taskAssign !== 'Done').length,
    critical:   tasks.filter(t => t.taskPriority === 'Critical').length,
  }), [tasks])

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

    // Fix 6: If moving to Done, require verification checklist modal
    if (status === 'Done') {
      setPendingDoneTaskAction({ type: 'drag', task: draggingTask, newStatus: status })
      setDoneModalOpen(true)
      setDraggingTask(null)
      return
    }

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

  function openCreate(defaultStatus) {
    const defaultProjId = projects && projects.length > 0 ? (projects[0].projectId || projects[0].id) : ''
    setEditingTask(defaultStatus ? { ...EMPTY_FORM, taskAssign: defaultStatus, taskProjectId: defaultProjId } : { ...EMPTY_FORM, taskProjectId: defaultProjId })
    setModalOpen(true)
  }

  function openEdit(task) {
    setEditingTask(task)
    setModalOpen(true)
  }

  async function handleSave(payload) {
    // Fix 6: If saving task with status Done, require verification checklist
    if (payload.taskAssign === 'Done' || payload.taskPercentageCompleted >= 100) {
      setPendingDoneTaskAction({ type: 'save', payload })
      setDoneModalOpen(true)
      return
    }
    await executeSave(payload)
  }

  async function executeSave(payload) {
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
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to save task.'
      showToast('error', msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmDoneChecklist() {
    setDoneModalOpen(false)
    if (!pendingDoneTaskAction) return

    const nowStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    const userName = currentUser?.username || 'User'
    const auditRecord = `\n\n[Done Checklist Verified on ${nowStr} by ${userName}: 1. Spoke with client=YES, 2. Outcome recorded=YES, 3. Follow-up task needed=NO]`

    if (pendingDoneTaskAction.type === 'drag') {
      const { task, newStatus } = pendingDoneTaskAction
      const taskId = genId(task)
      const updatedDesc = (task.taskDescription || '') + auditRecord
      setTasks(prev => prev.map(t => (genId(t) === taskId ? { ...t, taskAssign: newStatus, taskPercentageCompleted: 100, taskDescription: updatedDesc } : t)))
      try {
        await taskHook.update(taskId, { ...task, taskAssign: newStatus, taskPercentageCompleted: 100, taskDescription: updatedDesc })
        showToast('success', 'Task verified and marked Done! 🎉')
      } catch {
        showToast('error', 'Failed to update task status.')
        await loadData()
      }
    } else if (pendingDoneTaskAction.type === 'save') {
      const { payload } = pendingDoneTaskAction
      payload.taskAssign = 'Done'
      payload.taskPercentageCompleted = 100
      payload.taskDescription = (payload.taskDescription || '') + auditRecord
      await executeSave(payload)
    }
    setPendingDoneTaskAction(null)
  }

  async function handleStatusChange(task, newStatus) {
    if (newStatus === 'Done') {
      setPendingDoneTaskAction({ type: 'drag', task, newStatus })
      setDoneModalOpen(true)
      return
    }
    try {
      const id = task.taskId || task.id
      await taskHook.update(id, { ...task, taskAssign: newStatus })
      setTasks(prev => prev.map(t => (t.taskId || t.id) === id ? { ...t, taskAssign: newStatus } : t))
      showToast('success', `Status updated to ${newStatus}`)
    } catch {
      showToast('error', 'Could not update status.')
    }
  }

  async function handleBulkApply(payload) {
    try {
      await taskHook.bulkUpdate(payload)
      showToast('success', `${payload.taskIds.length} tasks bulk updated!`)
      await loadData()
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to bulk update tasks.'
      showToast('error', msg)
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
  const completionPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-8" onDragEnd={handleDragEnd}>

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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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

          {hasFilters && (
            <span className="text-xs text-gray-500 shrink-0">
              <span className="font-bold text-indigo-600">{filteredTasks.length}</span> / {tasks.length} tasks
            </span>
          )}

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
                activeTimerLog={activeTimerLog}
                onQuickTimer={handleQuickTimer}
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
        <ListView
          tasks={filteredTasks}
          memberById={memberById}
          members={members}
          selectedTaskIds={selectedTaskIds}
          setSelectedTaskIds={setSelectedTaskIds}
          activeTimerLog={activeTimerLog}
          onQuickTimer={handleQuickTimer}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          onStatusChange={handleStatusChange}
          onBulkApply={handleBulkApply}
          isAdmin={isAdmin}
        />
      )}

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
        onTimerStateChange={fetchActiveTimer}
      />

      <DoneChecklistModal
        open={doneModalOpen}
        onConfirm={handleConfirmDoneChecklist}
        onCancel={() => { setDoneModalOpen(false); setPendingDoneTaskAction(null) }}
        taskTitle={pendingDoneTaskAction?.task?.taskName || pendingDoneTaskAction?.payload?.taskName || 'Task'}
      />

      <AppConfirmDialog
        open={deleteTarget !== null}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteTarget?.taskName}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Toast toast={toast} />
    </div>
  )
}

