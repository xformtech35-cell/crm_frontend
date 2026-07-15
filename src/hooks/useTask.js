import { useApi } from './useApi'
import { objectToFormData } from '../utils/format'

export function useTask() {
  const api = useApi()
  const getAll = () => api.get('/tasks')
  const getById = (id) => api.get(`/tasks/${id}`)
  const getByTeam = (teamId) => api.get(`/tasks/by-team/${teamId}`)
  const create = (task, doc) =>
    api.postForm('/tasks', objectToFormData('task', task, { taskDoc: doc ?? null }))
  const update = (id, task, doc) =>
    api.putForm(`/tasks/${id}`, objectToFormData('task', task, { taskDoc: doc ?? null }))
  const remove = (id) => api.del(`/tasks/${id}`)
  return { getAll, getById, getByTeam, create, update, remove }
}
