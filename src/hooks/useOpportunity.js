import { useApi } from './useApi'
import { objectToFormData } from '../utils/format'

export function useOpportunity() {
  const api = useApi()
  const getAll = () => api.get('/opportunities')
  const getById = (id) => api.get(`/opportunities/${id}`)
  const create = (opp, doc) =>
    api.postForm('/opportunities', objectToFormData('opportunity', opp, { oppDoc: doc ?? null }))
  const update = (id, opp, doc) =>
    api.putForm(`/opportunities/${id}`, objectToFormData('opportunity', opp, { oppDoc: doc ?? null }))
  const remove = (id) => api.del(`/opportunities/${id}`)
  return { getAll, getById, create, update, remove }
}
