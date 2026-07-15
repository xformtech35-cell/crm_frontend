import { useApi } from './useApi'

export function useTeam() {
  const api = useApi()
  const getAll = () => api.get('/teams')
  const getById = (id) => api.get(`/teams/${id}`)
  const create = (team) => api.post('/teams', team)
  const update = (id, team) => api.put(`/teams/${id}`, team)
  const remove = (id) => api.del(`/teams/${id}`)
  return { getAll, getById, create, update, remove }
}
