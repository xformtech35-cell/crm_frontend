import { useState, useCallback } from 'react'
import { useApi } from './useApi'

export function useTaskTime() {
  const api = useApi()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const startTimer = useCallback(async (taskId, note = '') => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.post('/task-time/start', { taskId, note })
      return data
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [api])

  const stopTimer = useCallback(async (logId) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.post(`/task-time/stop/${logId}`)
      return data
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [api])

  const getLogsByTask = useCallback(async (taskId) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get(`/task-time/task/${taskId}`)
      return data || []
    } catch (err) {
      setError(err?.response?.data?.message || err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [api])

  return { startTimer, stopTimer, getLogsByTask, loading, error }
}
