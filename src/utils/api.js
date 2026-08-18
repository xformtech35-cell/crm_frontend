import axios from 'axios'

let instance = null

function getStoredToken() {
  const authStorage = localStorage.getItem('auth-storage')
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage)
      return parsed?.state?.token || null
    } catch (e) {
      console.error('Error parsing auth-storage:', e)
      localStorage.removeItem('auth-storage')
    }
  }
  // Fallback for older storage
  return localStorage.getItem('crm_token') || null
}

function getStoredImpersonatedCompanyId() {
  const authStorage = localStorage.getItem('auth-storage')
  if (authStorage) {
    try {
      return JSON.parse(authStorage)?.state?.selectedCompanyId || null
    } catch (e) {
      console.error('Error parsing company id:', e)
    }
  }
  return null
}

function getStoredImpersonatedTeamMemberId() {
  const authStorage = localStorage.getItem('auth-storage')
  if (authStorage) {
    try {
      return JSON.parse(authStorage)?.state?.selectedTeamMemberId || null
    } catch (e) {
      console.error('Error parsing team member id:', e)
    }
  }
  return null
}

// Helper to get user info from token
function getUserFromToken() {
  const token = getStoredToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload
  } catch (e) {
    return null
  }
}

export function getApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE
  }
  if (typeof window !== 'undefined' && (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1')) {
    return 'http://localhost:8080/xformcrm/api'
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/xformcrm/api`
  }
  return 'http://localhost:8080/xformcrm/api'
}

export function getApiClient(baseURL) {
  const targetBaseUrl = baseURL || getApiBaseUrl()
  const token = getStoredToken()
  const shouldRecreate = !instance || 
    instance.defaults.headers?.Authorization !== `Bearer ${token}` ||
    instance.defaults.baseURL !== targetBaseUrl
  
  if (!instance || shouldRecreate) {
    // Create fresh instance
    instance = axios.create({ 
      baseURL: targetBaseUrl,
      timeout: 45000, // 45 seconds timeout for slow DB/network
    })

    // Request interceptor - runs for every request
    instance.interceptors.request.use(
      (config) => {
        // Get fresh token for each request
        const freshToken = getStoredToken()
        if (freshToken) {
          config.headers.Authorization = `Bearer ${freshToken}`
        } else {
          console.warn('⚠️ No token found for request:', config.url)
        }
        
        const companyId = getStoredImpersonatedCompanyId()
        if (companyId) {
          config.headers['X-Company-Id'] = companyId
        }

        const teamMemberId = getStoredImpersonatedTeamMemberId()
        if (teamMemberId) {
          config.headers['X-Team-Member-Id'] = teamMemberId
        }

        
        // Log request for debugging (remove in production)
        console.log('📤 API Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          hasToken: !!freshToken,
          tokenPreview: freshToken ? `${freshToken.substring(0, 20)}...` : 'none'
        })
        
        return config
      },
      (error) => {
        console.error('Request interceptor error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor
    instance.interceptors.response.use(
      (response) => {
        // Log success (remove in production)
        console.log('📥 API Response:', {
          status: response.status,
          url: response.config?.url
        })
        return response
      },
      (error) => {
        // Handle specific status codes
        if (error.response) {
          console.error('❌ API Error Response:', {
            status: error.response.status,
            url: error.config?.url,
            data: error.response.data
          })
          
          // Handle 401 - Unauthorized
          if (error.response.status === 401) {
            console.warn('🔒 Token expired or invalid. Redirecting to login...')
            localStorage.removeItem('crm_token')
            localStorage.removeItem('crm_user')
            localStorage.removeItem('auth-storage')
            // Reset instance so new token will be used after login
            instance = null
            window.location.href = '/login'
          }
          
          // Handle 403 - Forbidden
          if (error.response.status === 403) {
            console.warn('🚫 Forbidden - Check user permissions')
            // Try to refresh token or show appropriate message
          }
        } else if (error.request) {
          console.error('❌ No response received:', error.request)
        } else {
          console.error('❌ Request error:', error.message)
        }
        
        return Promise.reject(error)
      }
    )
  }
  
  return instance
}

export function resetApiClient() {
  instance = null
  console.log('🔄 API Client reset')
}

// Helper to force token refresh
export function refreshApiClient() {
  instance = null
  return getApiClient(instance?.defaults?.baseURL || '')
}

export const api = getApiClient()
export default api