import { useApi } from './useApi'

export function useTrash() {
  const api = useApi()

  async function getAll() {
    return api.get('/trash')
  }

  async function restore(moduleKey, recordId) {
    return api.post(`/trash/restore/${moduleKey}/${recordId}`)
  }

  async function permanentDelete(moduleKey, recordId) {
    return api.del(`/trash/permanent/${moduleKey}/${recordId}`)
  }

  return {
    getAll,
    restore,
    permanentDelete,
  }
}
