import axios from 'axios'
import { useAuthStore } from '../stores/auth.store'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const isSharePage = window.location.pathname.startsWith('/s/')
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login') &&
      !isSharePage
    ) {
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Separate public client — no auth, no redirect. Used by share pages.
export const publicApi = axios.create({
  baseURL: '/api',
})
