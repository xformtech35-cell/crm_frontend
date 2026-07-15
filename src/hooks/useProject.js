import { useApi } from './useApi'
import { objectToFormData } from '../utils/format'

export function useProject() {
  const api = useApi()
  const getAll = () => api.get('/projects')
  const getById = (id) => api.get(`/projects/${id}`)
  const create = (proj, doc) =>
    api.postForm('/projects', objectToFormData('project', proj, { projectDoc: doc ?? null }))
  const update = (id, proj, doc) =>
    api.putForm(`/projects/${id}`, objectToFormData('project', proj, { projectDoc: doc ?? null }))
  const remove = (id) => api.del(`/projects/${id}`)
  return { getAll, getById, create, update, remove }
}
