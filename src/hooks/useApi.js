import { getApiClient } from '../utils/api'

const getDefaultBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE
  }
  if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    return 'http://localhost:8080/api'
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`
  }
  return 'https://api-test.richgoldshine.com/api'
}

const BASE_URL = getDefaultBaseUrl()

export function useApi() {
  const client = getApiClient(BASE_URL)

  // Add a request interceptor to ensure token is always included
  client.interceptors.request.use(
    (config) => {
      // Get token from localStorage
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          const token = parsed?.state?.token;
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (e) {
          console.error('Error parsing auth data:', e);
        }
      }
      
      // Log the request for debugging
      console.log('📤 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        headers: config.headers,
        data: config.data instanceof FormData ? 'FormData' : config.data
      });
      
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add a response interceptor for better error handling
  client.interceptors.response.use(
    (response) => {
      console.log('📥 API Response:', {
        status: response.status,
        url: response.config?.url,
        data: response.data
      });
      return response;
    },
    (error) => {
      console.error('❌ API Error:', {
        status: error.response?.status,
        url: error.config?.url,
        data: error.response?.data,
        message: error.message
      });
      
      // Handle 403 specifically
      if (error.response?.status === 403) {
        console.error('🔒 Forbidden - Check user permissions or token validity');
        // Optionally redirect to login if token is invalid
        // const authData = localStorage.getItem('auth-storage');
        // if (authData) {
        //   const parsed = JSON.parse(authData);
        //   const token = parsed?.state?.token;
        //   if (token) {
        //     console.log('Token exists but is invalid or expired');
        //     // Clear token and redirect to login
        //     localStorage.removeItem('auth-storage');
        //     window.location.href = '/login';
        //   }
        // }
      }
      
      return Promise.reject(error);
    }
  );

  // async function get(url) {
  //   const res = await client.get(url)
  //   return res.data.data
  // }
async function get(url, config = {}) {
  const res = await client.get(url, config);

  // If downloading a file, return the full axios response
  if (config.responseType === "blob") {
    return res;
  }

  return res.data.data;
}

  async function post(url, data) {
    const res = await client.post(url, data)
    return res.data.data
  }

  async function put(url, data) {
    const res = await client.put(url, data)
    return res.data.data
  }

  async function patch(url, data) {
    const res = await client.patch(url, data)
    return res.data.data
  }

  async function del(url) {
    const res = await client.delete(url)
    return res.data.data
  }

  async function postForm(url, formData) {
    const res = await client.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  }

  async function putForm(url, formData) {
    const res = await client.put(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data
  }

  return { get, post, put, patch, del, postForm, putForm, client }
}