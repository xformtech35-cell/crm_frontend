import { useApi } from './useApi'

export function useRole() {
  const api = useApi()
  const getAll = () => api.get('/roles')
  const getById = (id) => api.get(`/roles/${id}`)
  const create = (data) => api.post('/roles', data)
  const update = (id, data) => api.put(`/roles/${id}`, data)
  const remove = (id) => api.del(`/roles/${id}`)
  const getPermissions = (id) => api.get(`/roles/${id}/permissions`)
  const savePermissions = (id, permissions) =>
    api.post(`/roles/${id}/permissions`, { permissions })
  const deletePermission = (permId) => api.del(`/roles/permissions/${permId}`)
  return { getAll, getById, create, update, remove, getPermissions, savePermissions, deletePermission }
}
