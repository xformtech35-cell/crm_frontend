import { useApi } from './useApi'

export function useDataScopeConfig() {
  const api = useApi()
  const getAll = () => api.get('/data-scope-configs')
  const saveOne = (payload) => api.post('/data-scope-configs', payload)
  const saveBatch = (payloads) => api.post('/data-scope-configs/batch', payloads)
  return { getAll, saveOne, saveBatch }
}
