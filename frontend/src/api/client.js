import axios from 'axios'

import { logout } from '../store/slices/authSlice'
import { store } from '../store/store'

const rawBase = import.meta.env.VITE_API_URL || ''
const baseURL = typeof rawBase === 'string' ? rawBase.replace(/\/+$/, '') : ''

const client = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const t = localStorage.getItem('medscan_token')
  if (t && !config.headers.Authorization) config.headers.Authorization = `Bearer ${t}`
  return config
})

/**
 * If localStorage has an expired JWT, axios sends `Authorization: Bearer ...` anyway.
 * Flask-JWT-Extended @jwt_required(optional=True) still *validates* that token and
 * returns 401 when it is invalid — so optional routes like search break after logout/session expiry.
 * Clear bad credentials once and retry without Authorization.
 */
client.interceptors.response.use(
  (r) => r,
  async (error) => {
    const cfg = error.config
    if (!cfg || cfg._medscanAuthRetry) return Promise.reject(error)
    if (error.response?.status !== 401) return Promise.reject(error)
    if (!localStorage.getItem('medscan_token')) return Promise.reject(error)

    cfg._medscanAuthRetry = true
    localStorage.removeItem('medscan_token')
    localStorage.removeItem('medscan_refresh')
    localStorage.removeItem('medscan_user')
    store.dispatch(logout())
    if (cfg.headers) {
      if (typeof cfg.headers.delete === 'function') cfg.headers.delete('Authorization')
      else delete cfg.headers.Authorization
    }
    return client.request(cfg)
  },
)

export function setToken(token) {
  if (token) localStorage.setItem('medscan_token', token)
  else localStorage.removeItem('medscan_token')
}

export function getToken() {
  return localStorage.getItem('medscan_token')
}

export default client
