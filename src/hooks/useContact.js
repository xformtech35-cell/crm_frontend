import { useApi } from './useApi'

export function useContact() {
  const api = useApi()
  const getAll = () => api.get('/contacts')
  const getById = (id) => api.get(`/contacts/${id}`)
  const create = (contact) => api.post('/contacts', contact)
  const update = (id, contact) => api.put(`/contacts/${id}`, contact)
  const remove = (id) => api.del(`/contacts/${id}`)
  return { getAll, getById, create, update, remove }
}
