import { useApi } from './useApi'

export function useCreateTeam() {
  const api = useApi()
  const getAll = () => api.get('/create-team')
  const getByTeamId = (teamId) => api.get(`/create-team/by-team/${teamId}`)
  const getById = (id) => api.get(`/create-team/${id}`)
  const create = (data) => api.post('/create-team', data)
  const update = (id, data) => api.put(`/create-team/${id}`, data)
  const remove = (id) => api.del(`/create-team/${id}`)
  return { getAll, getByTeamId, getById, create, update, remove }
}
