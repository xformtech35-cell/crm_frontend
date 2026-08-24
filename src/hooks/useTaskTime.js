import { useState, useCallback } from 'react'
import { useApi } from './useApi'

export function useTaskTime() {
  const api = useApi()
  const [actionLoading, setActionLoading] = useState(false)
  const [fetchLoading, setFetchLoading]   = useState(false)
  const [error, setError]                 = useState(null)

  const startTimer = useCallback(async (taskId, note = '') => {
    setActionLoading(true)
    setError(null)
    try {
      const data = await api.post('/task-time/start', { taskId, note })
      return data
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [api])

  const stopTimer = useCallback(async (logId) => {
    setActionLoading(true)
    setError(null)
    try {
      const data = await api.post(`/task-time/stop/${logId}`)
      return data
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
      throw err
    } finally {
      setActionLoading(false)
    }
  }, [api])

  const getLogsByTask = useCallback(async (taskId) => {
    setFetchLoading(true)
    setError(null)
    try {
      const data = await api.get(`/task-time/task/${taskId}`)
      return data || []
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
      throw err
    } finally {
      setFetchLoading(false)
    }
  }, [api])

  const getActiveTimer = useCallback(async () => {
    try {
      const data = await api.get('/task-time/active')
      return data || null
    } catch (err) {
      console.error(err)
      return null
    }
  }, [api])

  return { startTimer, stopTimer, getLogsByTask, getActiveTimer, actionLoading, fetchLoading, loading: actionLoading, error }
}


