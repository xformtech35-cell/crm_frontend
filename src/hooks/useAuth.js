import { useNavigate } from 'react-router-dom'
import { useApi } from './useApi'
import { useAuthStore } from '../stores/auth'

export function useAuth() {
  const api = useApi()
  const navigate = useNavigate()
  const { setAuth, logout: storeLogout } = useAuthStore()

  async function login(userEmail, password) {
  const data = await api.post('auth/login', {
    userEmail,
    password
  });

  setAuth(data);

  return data;
}

  async function logout() {
    try { await api.post('/auth/logout', {}) } catch {}
    storeLogout()
    navigate('/login')
  }

  async function changePassword(oldPassword, newPassword, confirmPassword) {
    await api.post('/auth/change-password', { oldPassword, newPassword, confirmPassword })
  }

  async function forgotPassword(email) {
    await api.post('/auth/forgot-password', { email })
  }

  return { login, logout, changePassword, forgotPassword }
}
