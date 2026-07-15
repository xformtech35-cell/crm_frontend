const fs = require('fs');

const file = 'C:/Projects/crm__main/frontend/src/pages/task/TaskPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Imports
content = content.replace(
  "import { useTeamMember } from '../../hooks/useTeamMember'",
  "import { useTeamMember } from '../../hooks/useTeamMember'\nimport { useProject } from '../../hooks/useProject'\nimport { useTaskTime } from '../../hooks/useTaskTime'"
);

// Constants
content = content.replace(
  "const VIEWS      = ['Board', 'List']",
  "const VIEWS      = ['Board', 'List']\nconst TASK_TYPES = ['Bug', 'Feature', 'Meeting', 'Sales', 'Marketing', 'Development', 'Support']\nconst PERIODS    = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027', 'Q3 2027', 'Q4 2027']"
);

content = content.replace(
  "taskPercentageCompleted: 0, taskRelatedTo: '', taskDescription: '',",
  "taskPercentageCompleted: 0, taskRelatedTo: '', taskDescription: '',\n  taskType: 'Feature', taskPhone: '', taskEmail: '', taskProjectId: '', taskExpectedCompletion: '', taskPeriod: '', taskCreatedBy: '',"
);

// KanbanCard Type badge
content = content.replace(
  '<PriorityBadge priority={task.taskPriority || \'Medium\'} />',
  '<PriorityBadge priority={task.taskPriority || \'Medium\'} />\n          {task.taskType && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">{task.taskType}</span>}'
);

// KanbanCard Phone/Email/CreatedBy
content = content.replace(
  '{task.taskRelatedTo && (',
  `{task.taskEmail && (
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
      {task.taskRelatedTo && (`
);

// ListView columns
content = content.replace(
  "{['Task', 'Status', 'Priority', 'Assignee', 'Due Date', 'Progress', 'Actions'].map(h => (",
  "{['Task', 'Type', 'Status', 'Priority', 'Assignee', 'Due Date', 'Progress', 'Actions'].map(h => ("
);

content = content.replace(
  "</div>\n                    </td>\n                    <td className=\"px-4 py-3\" onClick={e => e.stopPropagation()}>",
  "</div>\n                    </td>\n                    <td className=\"px-4 py-3\">\n                      <span className=\"text-xs text-gray-600 font-medium\">{task.taskType || '—'}</span>\n                    </td>\n                    <td className=\"px-4 py-3\" onClick={e => e.stopPropagation()}>"
);

// TaskFormModal
const formModalRegex = /function TaskFormModal.*?return \(/s;
const newFormModal = `function TaskFormModal({ open, onClose, editingTask, teams, members, assignments, projects, currentUser, saving, onSave, isAdmin }) {
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
  const sel = \`\${inp} text-gray-700 cursor-pointer\`

  return (`;

content = content.replace(formModalRegex, newFormModal);

// Adding fields to form inside return of TaskFormModal
const formHtmlRegex = /(<form id="task-form".*?)(<\/form>)/s;
const existingFormStr = content.match(formHtmlRegex)[1];

const extraFields = \`
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
\`;

let updatedFormStr = existingFormStr.replace(
  '          {/* Progress */}',
  extraFields + '\n          {/* Progress */}'
);

const timeTrackingHtml = \`
        {/* Time Tracking Panel */}
        {(editingTask?.taskId || editingTask?.id) && (
          <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Time Tracking</h3>
              <p className="text-xs text-gray-500">{logs.length} sessions logged. Total: {logs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0)} mins.</p>
            </div>
            <button
              type="button"
              onClick={handleToggleTimer}
              disabled={timeLoading}
              className={\`px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-2 \${activeLog ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}\`}
            >
              {timeLoading ? <Icon name="mdi:loading" className="w-3.5 h-3.5 animate-spin" /> : <Icon name={activeLog ? 'mdi:stop-circle-outline' : 'mdi:play-circle-outline'} className="w-3.5 h-3.5" />}
              {activeLog ? 'Stop Timer' : 'Start Timer'}
            </button>
          </div>
        )}
\`;

updatedFormStr = updatedFormStr + timeTrackingHtml;
content = content.replace(formHtmlRegex, updatedFormStr + '$2');


// Main page hook additions
content = content.replace(
  'const createTeamHook = useCreateTeam()',
  'const createTeamHook = useCreateTeam()\n  const projectHook = useProject()'
);

content = content.replace(
  'const [teams,       setTeams]       = useState([])',
  'const [teams,       setTeams]       = useState([])\n  const [projects,    setProjects]    = useState([])'
);

content = content.replace(
  'const [taskData, teamData, memberData, assignmentData] = await Promise.all([',
  'const [taskData, teamData, memberData, assignmentData, projectData] = await Promise.all(['
);

content = content.replace(
  'createTeamHook.getAll(),',
  'createTeamHook.getAll(),\n        projectHook.getAll(),'
);

content = content.replace(
  'setAssignments(Array.isArray(assignmentData) ? assignmentData : [])',
  'setAssignments(Array.isArray(assignmentData) ? assignmentData : [])\n      setProjects(Array.isArray(projectData) ? projectData : [])'
);

content = content.replace(
  'setTasks([]); setTeams([]); setMembers([]); setAssignments([])',
  'setTasks([]); setTeams([]); setMembers([]); setAssignments([]); setProjects([])'
);

content = content.replace(
  'editingTask={editingTask?.taskId || editingTask?.id ? editingTask : (editingTask?.taskAssign ? { taskAssign: editingTask.taskAssign } : null)}\n        teams={teams}',
  'editingTask={editingTask?.taskId || editingTask?.id ? editingTask : (editingTask?.taskAssign ? { taskAssign: editingTask.taskAssign } : null)}\n        teams={teams}\n        projects={projects}\n        currentUser={currentUser}'
);

fs.writeFileSync(file, content, 'utf8');
