import { useEffect, useMemo, useRef, useState } from 'react'
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
import { formatDate } from '../../utils/format'
import { getMemberId, getMemberLabel, getTeamId, getTeamLabel, membersForTeam } from '../../utils/teamRelations'

/* ─────────────────────────────── constants ─────────────────────────────── */
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const STATUSES   = ['To Do', 'In Progress', 'Blocked', 'Done']
const VIEWS      = ['Board', 'List']
const TASK_TYPES = ['Bug', 'Feature', 'Meeting', 'Sales', 'Marketing', 'Development', 'Support']
const PERIODS    = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027', 'Q3 2027', 'Q4 2027']

const PRIORITY_META = {
  Low:      { cls: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400',    icon: 'mdi:arrow-down' },
  Medium:   { cls: 'bg-blue-50 text-blue-700',     dot: 'bg-blue-500',    icon: 'mdi:minus' },
  High:     { cls: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500',  icon: 'mdi:arrow-up' },
  Critical: { cls: 'bg-red-50 text-red-700',       dot: 'bg-red-500',     icon: 'mdi:alert-circle-outline' },
}
const STATUS_META = {
  'To Do':      { bg: 'bg-slate-50',   border: 'border-slate-200',   header: 'bg-slate-100',   dot: 'bg-slate-400',   badge: 'bg-slate-200 text-slate-700'   },
  'In Progress':{ bg: 'bg-blue-50/60', border: 'border-blue-200',    header: 'bg-blue-50',     dot: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700'    },
  'Blocked':    { bg: 'bg-red-50/50',  border: 'border-red-200',     header: 'bg-red-50',      dot: 'bg-red-500',     badge: 'bg-red-100 text-red-700'      },
  'Done':       { bg: 'bg-emerald-50/50', border: 'border-emerald-200', header: 'bg-emerald-50', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
}

const EMPTY_FORM = {
  taskName: '', taskAssignedTeam: '', taskAssignedMember: '',
  taskPriority: 'Medium', taskAssign: 'To Do',
  taskStartDate: '', taskDueDate: '',
  taskPercentageCompleted: 0, taskRelatedTo: '', taskDescription: '',
  taskType: 'Feature', taskPhone: '', taskEmail: '',
  taskProjectId: '', taskExpectedCompletion: '', taskPeriod: '', taskCreatedBy: ''
}

function genId(task) { return task.taskId ?? task.id ?? '' }

/* ─────────────────────────────── helpers ────────────────────────────────── */
function isOverdue(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date() && true
}

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

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold animate-fade-in ${
      toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
    }`}>
      <Icon name={toast.type === 'success' ? 'mdi:check-circle' : 'mdi:alert-circle'} className="w-5 h-5" />
      {toast.msg}
    </div>
  )
}

/* ═══════════════════════════════ KANBAN CARD ════════════════════════════ */
function KanbanCard({ task, memberById, teamById, onEdit, onDelete, onStatusChange, isAdmin }) {
  const member = memberById.get(Number(task.taskAssignedMember || task.taskAssignedTo))
  const pct    = task.taskPercentageCompleted || 0
  const due    = task.taskDueDate
  const overdue = isOverdue(due) && task.taskAssign !== 'Done'
  const taskRef = `TK-${String(genId(task)).padStart(3, '0')}`

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-150 p-3.5 group cursor-pointer select-none"
      onClick={() => onEdit(task)}
    >
      {/* Top row — ID + priority + actions */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-indigo-500 tracking-wide">{taskRef}</span>
          <PriorityBadge priority={task.taskPriority || 'Medium'} />
          {task.taskType && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">{task.taskType}</span>}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
          {isAdmin && (
            <div className="relative">
              <select
                value={task.taskAssign || 'To Do'}
                onChange={e => onStatusChange(task, e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                title="Change status"
              />
              <button className="p-1 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Move">
                <Icon name="mdi:swap-horizontal" className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button className="p-1 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" onClick={() => onDelete(task)} title="Delete">
            <Icon name="mdi:trash-can-outline" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Task name */}
      <p className={`text-sm font-semibold leading-snug mb-2 ${task.taskAssign === 'Done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
        {task.taskName}
      </p>

      {/* Related */}
      {task.taskEmail && (
        <p className="text-xs text-gray-400 mb-1 flex items-center gap-1 truncate">
          <Icon name="mdi:email-outline" className="w-3 h-3 shrink-0" />
          {task.taskEmail}
        </p>
      )}
      {task.taskPhone && (
        <p className="text-xs text-gray-400 mb-1 flex items-center gap-1 truncate">
          <Icon name="mdi:phone-outline" className="w-3 h-3 shrink-0" />
          {task.taskPhone}
        </p>
      )}
      {task.taskCreatedBy && (
        <p className="text-[10px] text-gray-400 mb-2 font-medium">Created by: {task.taskCreatedBy}</p>
      )}
      {task.taskRelatedTo && (
        <p className="text-xs text-gray-400 mb-2 flex items-center gap-1 truncate">
          <Icon name="mdi:link-variant" className="w-3 h-3 shrink-0" />
          {task.taskRelatedTo}
        </p>
      )}

      {/* Progress */}
      {pct > 0 && (
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-gray-400 font-medium">Progress</span>
            <span className="text-[10px] text-gray-600 font-bold">{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer — assignee + due */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-50 mt-2">
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
          <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
            overdue ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
          }`}>
            <Icon name="mdi:calendar-outline" className="w-2.5 h-2.5" />
            {new Date(due).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </span>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════ KANBAN COLUMN ══════════════════════════ */
function KanbanColumn({ status, tasks, memberById, teamById, onEdit, onDelete, onStatusChange, onAddTask, isAdmin }) {
  const meta = STATUS_META[status] || STATUS_META['To Do']
  return (
    <div className={`flex flex-col rounded-2xl border ${meta.border} ${meta.bg} min-h-[200px]`} style={{ minWidth: '280px', maxWidth: '320px', flex: '0 0 290px' }}>
      {/* Column header */}
      <div className={`flex items-center justify-between px-3.5 py-3 rounded-t-2xl ${meta.header} border-b ${meta.border}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
          <span className="text-sm font-bold text-gray-800">{status}</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>{tasks.length}</span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          className="p-1 rounded-lg text-gray-400 hover:bg-white/80 hover:text-indigo-600 transition-colors"
          title={`Add task to ${status}`}
        >
          <Icon name="mdi:plus" className="w-4 h-4" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {tasks.map(task => (
          <KanbanCard
            key={genId(task)}
            task={task}
            memberById={memberById}
            teamById={teamById}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            isAdmin={isAdmin}
          />
        ))}
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Icon name="mdi:clipboard-text-outline" className="w-8 h-8 text-gray-200 mb-2" />
            <p className="text-xs text-gray-400 font-medium">No tasks</p>
            <button onClick={() => onAddTask(status)} className="mt-2 text-xs text-indigo-500 hover:underline font-semibold">+ Add task</button>
          </div>
        )}
      </div>

      {/* Add card button */}
      <div className="px-2.5 pb-2.5">
        <button
          onClick={() => onAddTask(status)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-white/70 hover:text-indigo-600 transition-colors font-medium"
        >
          <Icon name="mdi:plus" className="w-4 h-4" />
          Add task
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════ TASK FORM MODAL ════════════════════════ */
function TaskFormModal({ open, onClose, editingTask, teams, members, assignments, projects, currentUser, saving, onSave, isAdmin }) {
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const { startTimer, stopTimer, getLogsByTask, loading: timeLoading } = useTaskTime()
  const [logs, setLogs] = useState([])
  const [activeLog, setActiveLog] = useState(null)

  useEffect(() => {
    if (open) {
      if (editingTask?.taskId || editingTask?.id) {
        const id = editingTask.taskId || editingTask.id
        getLogsByTask(id).then(data => {
          setLogs(data)
          const running = data.find(l => !l.endTime)
          setActiveLog(running || null)
        }).catch(console.error)
      } else {
        setLogs([])
        setActiveLog(null)
      }
    }
  }, [open, editingTask, getLogsByTask])

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
  const inp = "w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder-gray-300 transition-colors"
  const sel = `${inp} text-gray-700 cursor-pointer`

  return (
    <AppDrawer
      open={open}
      onClose={onClose}
      title={editingTask ? 'Edit Task' : 'Create New Task'}
      subtitle={editingTask ? 'Update task attributes and tracking logs' : 'Create a new task and assign parameters'}
      icon="mdi:clipboard-text-outline"
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            form="task-form"
            type="submit"
            disabled={saving || !form.taskName.trim()}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 hover:scale-105 transition-transform"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            {saving ? <Icon name="mdi:loading" className="w-4 h-4 animate-spin" /> : <Icon name="mdi:check-circle-outline" className="w-4 h-4" />}
            {saving ? 'Saving…' : editingTask ? 'Update Task' : 'Create Task'}
          </button>
        </>
      }
    >
      <form id="task-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className={lbl}>Task Title <span className="text-red-500">*</span></label>
          <input value={form.taskName} onChange={e => setF('taskName', e.target.value)} placeholder="What needs to be done?" className={inp} autoFocus required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Status */}
          <div>
            <label className={lbl}>Status</label>
            <select value={form.taskAssign} onChange={e => setF('taskAssign', e.target.value)} className={sel}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className={lbl}>Priority</label>
            <select value={form.taskPriority} onChange={e => setF('taskPriority', e.target.value)} className={sel}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Team — admins only for assign */}
          {isAdmin && (
            <div>
              <label className={lbl}>Assign to Team</label>
              <select value={form.taskAssignedTeam} onChange={e => setF('taskAssignedTeam', e.target.value)} className={sel}>
                <option value="">No specific team</option>
                {teams.map(t => <option key={getTeamId(t)} value={getTeamId(t)}>{getTeamLabel(t)}</option>)}
              </select>
            </div>
          )}

          {/* Member — admins only for assign */}
          {isAdmin && (
            <div>
              <label className={lbl}>Assign to Member</label>
              <select value={form.taskAssignedMember} onChange={e => setF('taskAssignedMember', e.target.value)} className={sel}>
                <option value="">Unassigned</option>
                {availableMembers.map(m => <option key={getMemberId(m)} value={getMemberId(m)}>{getMemberLabel(m)}</option>)}
              </select>
            </div>
          )}

          {/* Start date */}
          <div>
            <label className={lbl}>Start Date</label>
            <input type="date" value={form.taskStartDate} onChange={e => setF('taskStartDate', e.target.value)} className={inp} />
          </div>

          {/* Due date */}
          <div>
            <label className={lbl}>Due Date</label>
            <input type="date" value={form.taskDueDate} onChange={e => setF('taskDueDate', e.target.value)} className={inp} />
          </div>

          {/* Project */}
          <div>
            <label className={lbl}>Project</label>
            <select value={form.taskProjectId} onChange={e => setF('taskProjectId', e.target.value)} className={sel}>
              <option value="">No Project</option>
              {projects.map(p => <option key={p.projectId || p.id} value={p.projectId || p.id}>{p.projectName}</option>)}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className={lbl}>Task Type</label>
            <select value={form.taskType} onChange={e => setF('taskType', e.target.value)} className={sel}>
              {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Period */}
          <div>
            <label className={lbl}>Period</label>
            <select value={form.taskPeriod} onChange={e => setF('taskPeriod', e.target.value)} className={sel}>
              <option value="">Select Period</option>
              {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Phone */}
          <div>
            <label className={lbl}>Phone</label>
            <input type="tel" value={form.taskPhone} onChange={e => setF('taskPhone', e.target.value)} className={inp} />
          </div>

          {/* Email */}
          <div>
            <label className={lbl}>Email</label>
            <input type="email" value={form.taskEmail} onChange={e => setF('taskEmail', e.target.value)} className={inp} />
          </div>

          {/* Expected Completion */}
          <div>
            <label className={lbl}>Expected Completion</label>
            <input type="date" value={form.taskExpectedCompletion} onChange={e => setF('taskExpectedCompletion', e.target.value)} className={inp} />
          </div>

          {/* Progress */}
          <div>
            <label className={lbl}>Completion %</label>
            <div className="flex items-center gap-3">
              <input
                type="range" min="0" max="100" step="5"
                value={form.taskPercentageCompleted}
                onChange={e => setF('taskPercentageCompleted', e.target.value)}
                className="flex-1 accent-indigo-600"
              />
              <span className="text-sm font-bold text-indigo-600 w-10 text-center">{form.taskPercentageCompleted}%</span>
            </div>
          </div>

          {/* Related to */}
          <div>
            <label className={lbl}>Related To</label>
            <input value={form.taskRelatedTo} onChange={e => setF('taskRelatedTo', e.target.value)} placeholder="Lead, Project, Deal..." className={inp} />
          </div>
        </div>

        {/* Description */}
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

        {/* Time Tracking Panel */}
        {(editingTask?.taskId || editingTask?.id) && (
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Time Tracking</h3>
              <p className="text-xs text-gray-500">{logs.length} sessions logged. Total: {logs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0)} mins.</p>
            </div>
            <button
              type="button"
              onClick={handleToggleTimer}
              disabled={timeLoading}
              className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-2 ${activeLog ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
            >
              {timeLoading ? <Icon name="mdi:loading" className="w-3.5 h-3.5 animate-spin" /> : <Icon name={activeLog ? 'mdi:stop-circle-outline' : 'mdi:play-circle-outline'} className="w-3.5 h-3.5" />}
              {activeLog ? 'Stop Timer' : 'Start Timer'}
            </button>
          </div>
        )}
      </form>
    </AppDrawer>
  )
}

/* ═══════════════════════════════ LIST VIEW ══════════════════════════════ */
function ListView({ tasks, memberById, teamById, onEdit, onDelete, onStatusChange, isAdmin }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Icon name="mdi:clipboard-check-outline" className="w-14 h-14 text-gray-200 mb-3" />
          <p className="text-base font-semibold text-gray-500">No tasks yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '800px' }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Task', 'Type', 'Status', 'Priority', 'Assignee', 'Due Date', 'Progress', 'Actions'].map(h => (
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
                  <tr key={genId(task)} className={`hover:bg-indigo-50/20 transition-colors cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`} onClick={() => onEdit(task)}>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] text-indigo-400 font-bold shrink-0 mt-0.5">TK-{String(genId(task)).padStart(3,'0')}</span>
                        <div className="min-w-0">
                          <p className={`font-semibold text-gray-900 truncate max-w-[200px] ${task.taskAssign === 'Done' ? 'line-through text-gray-400' : ''}`}>{task.taskName}</p>
                          {task.taskRelatedTo && <p className="text-xs text-gray-400 truncate">{task.taskRelatedTo}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600 font-medium">{task.taskType || '—'}</span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {isAdmin ? (
                        <select
                          value={task.taskAssign || 'To Do'}
                          onChange={e => onStatusChange(task, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${sm.badge}`}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${sm.badge}`}>{task.taskAssign || 'To Do'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${pm.cls}`}>
                        <Icon name={pm.icon} className="w-2.5 h-2.5" />
                        {task.taskPriority || 'Medium'}
                      </span>
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
                        <span className={`text-xs font-medium ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
                          {overdue && <Icon name="mdi:alert-circle" className="w-3 h-3 inline mr-0.5" />}
                          {new Date(task.taskDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[80px]">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 shrink-0">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
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

  const isAdmin    = useAuthStore(s => s.isAdmin())
  const currentUser = useAuthStore(s => s.user)

  const [tasks,       setTasks]       = useState([])
  const [teams,       setTeams]       = useState([])
  const [members,     setMembers]     = useState([])
  const [assignments, setAssignments] = useState([])
  const [projects,    setProjects]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)

  const [view,         setView]        = useState('Board')
  const [query,        setQuery]       = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [modalOpen,   setModalOpen]   = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [toast,       setToast]       = useState(null)

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
      if (filterPriority && t.taskPriority !== filterPriority) return false
      if (filterStatus   && t.taskAssign   !== filterStatus)   return false
      if (!q) return true
      const member = memberById.get(Number(t.taskAssignedMember || t.taskAssignedTo))
      return [t.taskName, t.taskRelatedTo, t.taskPriority, getMemberLabel(member)]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    })
  }, [tasks, query, filterPriority, filterStatus, memberById])

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
    done:       tasks.filter(t => t.taskAssign === 'Done').length,
    overdue:    tasks.filter(t => isOverdue(t.taskDueDate) && t.taskAssign !== 'Done').length,
  }), [tasks])

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
        showToast('success', 'Task updated.')
      } else {
        await taskHook.create(payload)
        showToast('success', 'Task created.')
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

  /* ────────────────────────────── RENDER ──────────────────────────────── */
  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-8">

      {/* ── Header ── */}
      <div className="flex justify-end">
        <button
          onClick={() => openCreate()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:scale-105 transition-transform shrink-0"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
        >
          <Icon name="mdi:plus" className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total',       value: stats.total,      icon: 'mdi:clipboard-list-outline', color: 'text-indigo-600 bg-indigo-50' },
          { label: 'To Do',       value: stats.todo,       icon: 'mdi:circle-outline',         color: 'text-gray-600 bg-gray-100'    },
          { label: 'In Progress', value: stats.inProgress, icon: 'mdi:progress-clock',         color: 'text-blue-600 bg-blue-50'     },
          { label: 'Done',        value: stats.done,       icon: 'mdi:check-circle-outline',   color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Overdue',     value: stats.overdue,    icon: 'mdi:alert-circle-outline',   color: 'text-red-600 bg-red-50'       },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
              <Icon name={s.icon} className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium leading-none mb-1">{s.label}</p>
              <p className="text-xl font-bold text-gray-900 leading-none">{loading ? '…' : s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative">
              <Icon name="mdi:magnify" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search tasks..."
                className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
            </div>

            {/* Priority filter */}
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white">
              <option value="">All Priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* Status filter (list view) */}
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white">
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {(query || filterPriority || filterStatus) && (
              <button onClick={() => { setQuery(''); setFilterPriority(''); setFilterStatus('') }} className="text-xs text-indigo-600 hover:underline font-semibold">Clear filters</button>
            )}
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
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
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Icon name="mdi:loading" className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Loading tasks...</p>
          </div>
        </div>
      ) : view === 'Board' ? (
        /* ─ KANBAN BOARD ─ */
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ minHeight: '400px' }}>
          {STATUSES.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={grouped[status] || []}
              memberById={memberById}
              teamById={teamById}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onStatusChange={handleStatusChange}
              onAddTask={openCreate}
              isAdmin={isAdmin}
            />
          ))}
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

      {/* ── Task Form Modal ── */}
      <TaskFormModal
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
