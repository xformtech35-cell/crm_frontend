import { getApiClient } from '../utils/api'

const BASE_URL = import.meta.env.VITE_API_BASE || 'https://api-test.richgoldshine.com/xformcrm/api'

export function useApi() {
  const client = getApiClient(BASE_URL)

  async function get(url) {
    const res = await client.get(url)
    return res.data.data
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
