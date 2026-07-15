import { useApi } from './useApi'

export function useDashboard() {
  const api = useApi()
  const getStats = () => api.get('/dashboard')
  return { getStats }
}
