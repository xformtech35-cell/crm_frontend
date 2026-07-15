import { useApi } from './useApi'

export function useOrganization() {
  const api = useApi()
  const getAll = () => api.get('/organizations')
  const getById = (id) => api.get(`/organizations/${id}`)
  const create = (org) => api.post('/organizations', org)
  const update = (id, org) => api.put(`/organizations/${id}`, org)
  const remove = (id) => api.del(`/organizations/${id}`)
  return { getAll, getById, create, update, remove }
}
