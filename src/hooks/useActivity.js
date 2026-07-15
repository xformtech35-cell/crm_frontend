import { useTask } from './useTask'

const iconMap = {
  Call: 'mdi:phone-outline',
  Email: 'mdi:email-outline',
  Meeting: 'mdi:calendar-clock-outline',
  Note: 'mdi:notebook-outline',
}

const colorMap = {
  Call: 'indigo',
  Email: 'blue',
  Meeting: 'orange',
  Note: 'purple',
}

function priorityToType(priority) {
  const p = String(priority || '').toLowerCase()
  if (p === 'email') return 'Email'
  if (p === 'call') return 'Call'
  if (p === 'note') return 'Note'
  return 'Meeting'
}

function typeToPriority(type) {
  return String(type || 'Meeting').toLowerCase()
}

function mapTaskToActivity(task) {
  const type = priorityToType(task.taskPriority)
  return {
    id: Number(task.taskId),
    type,
    icon: iconMap[type],
    color: colorMap[type],
    title: String(task.taskName || 'Activity'),
    subject: String(task.taskRelatedTo || '—'),
    owner: String(task.taskAssign || '').trim() || (task.taskAssignedTo ? `User ${task.taskAssignedTo}` : 'Unassigned'),
    time: String(task.taskDueDate || task.taskStartDate || task.taskCompletedDate || '—'),
    note: String(task.taskDescription || '—'),
  }
}

function mapFormToTaskPayload(form) {
  return {
    taskName: form.title,
    taskPriority: typeToPriority(form.type),
    taskRelatedTo: form.subject,
    // "owner" in the Activities UI should map to the assigned user/team field.
    // Using taskAssign causes the status field to become the owner name.
    taskAssign: 'To Do',
    // keep assigned-to for user if backend supports it later
    taskAssignedTo: null,
    taskDueDate: form.time,
    taskDescription: form.note,
  }
}

export function useActivity() {
  const taskApi = useTask()

  async function getAll() {
    const tasks = await taskApi.getAll()
    return Array.isArray(tasks) ? tasks.map(mapTaskToActivity) : []
  }

  async function create(form) {
    const payload = mapFormToTaskPayload(form)
    const task = await taskApi.create(payload, null)
    return mapTaskToActivity(task)
  }

  async function update(id, form) {
    const payload = mapFormToTaskPayload(form)
    const task = await taskApi.update(id, payload, null)
    return mapTaskToActivity(task)
  }

  async function remove(id) {
    await taskApi.remove(id)
  }

  return { getAll, create, update, remove }
}

