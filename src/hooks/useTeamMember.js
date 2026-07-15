import { useApi } from './useApi'

export function useTeamMember() {
  const api = useApi()
  const getAll = () => api.get('/team-members')
  const getById = (id) => api.get(`/team-members/${id}`)
  const create = (member) => api.post('/team-members', member)
  const update = (id, member) => api.put(`/team-members/${id}`, member)
  const remove = (id) => api.del(`/team-members/${id}`)
  return { getAll, getById, create, update, remove }
}
