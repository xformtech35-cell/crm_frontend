import axios from 'axios'

let instance = null

function getStoredToken() {
  const authStorage = localStorage.getItem('auth-storage')
  if (authStorage) {
    try {
      return JSON.parse(authStorage)?.state?.token
    } catch {
      localStorage.removeItem('auth-storage')
    }
  }
  return localStorage.getItem('crm_token')
}

function getStoredImpersonatedCompanyId() {
  const authStorage = localStorage.getItem('auth-storage')
  if (authStorage) {
    try {
      return JSON.parse(authStorage)?.state?.selectedCompanyId
    } catch {
      // ignore
    }
  }
  return null
}

export function getApiClient(baseURL) {
  if (!instance) {
    instance = axios.create({ baseURL })

    instance.interceptors.request.use((config) => {
      const token = getStoredToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      const companyId = getStoredImpersonatedCompanyId()
      if (companyId) {
        config.headers['X-Company-Id'] = companyId
      }
      return config
    })

    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('crm_token')
          localStorage.removeItem('crm_user')
          localStorage.removeItem('auth-storage')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }
  return instance
}

export function resetApiClient() {
  instance = null
}
