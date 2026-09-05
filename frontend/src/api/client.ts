import axios, { AxiosError } from 'axios'

const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // ms

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

// Cache for GET requests (key: url, value: {data, timestamp})
const requestCache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('studentplan_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config

    if (error.response?.status === 401 && !String(config?.url).includes('/auth/login')) {
      localStorage.removeItem('studentplan_token')
      localStorage.removeItem('studentplan_user')
      if (!window.location.pathname.includes('/login')) window.location.assign('/login')
    }

    // Retry logic for network errors and 5xx errors
    if (
      config &&
      !config.url?.includes('/auth/login') &&
      (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.response?.status === 503)
    ) {
      const retryCount = (config as Record<string, unknown>).__retryCount ?? 0
      if (retryCount < MAX_RETRIES) {
        ;(config as Record<string, unknown>).__retryCount = retryCount + 1
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)))
        return api(config)
      }
    }

    return Promise.reject(error)
  },
)

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((item) => item.msg).join('; ')
    return error.message
  }
  return 'Неизвестная ошибка'
}

export async function downloadProtected(url: string, filename: string) {
  const response = await api.get(url.replace(/^\/api/, ''), { responseType: 'blob' })
  const objectUrl = URL.createObjectURL(response.data)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}

export function getCachedOrFetch<T>(url: string): Promise<T> {
  // Check cache for GET requests
  const cached = requestCache.get(url)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return Promise.resolve(cached.data as T)
  }

  return api.get<T>(url).then((response) => {
    requestCache.set(url, { data: response.data, timestamp: Date.now() })
    return response.data
  })
}

export function clearCache(url?: string): void {
  if (url) {
    requestCache.delete(url)
  } else {
    requestCache.clear()
  }
}

export default api
