import axios from 'axios'

// The only HTTP client in the app. Components never call it directly; they go
// through the service modules, which map API shapes to UI shapes.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
  // Django's CSRF cookie (set by GET /auth/session/) sent back as a header.
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
})

const MESSAGES = {
  network: 'We could not reach the server. Check your internet connection and try again.',
  timeout: 'The server took too long to respond. Please try again.',
  server: 'Something went wrong on our side. Please try again in a moment.',
  auth: 'Please sign in to continue.',
  unknown: 'Something went wrong. Please try again.',
}

// Every failed request becomes an ApiError with a message that is safe to show.
export class ApiError extends Error {
  constructor({ message, status = null, code = 'error', fields = null, retryAfter = null }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
    this.retryAfter = retryAfter
  }
}

function waitMessage(seconds) {
  if (!seconds) return 'Too many attempts. Please wait a while and try again.'
  const minutes = Math.ceil(seconds / 60)
  return `Too many attempts. Please wait ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} and try again.`
}

export function toApiError(error) {
  if (error instanceof ApiError) return error
  if (axios.isCancel(error)) return new ApiError({ message: 'Request cancelled.', code: 'cancelled' })
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiError({ message: MESSAGES.timeout, code: 'timeout' })
  }
  const response = error.response
  if (!response) return new ApiError({ message: MESSAGES.network, code: 'network' })

  const { status } = response
  const body = response.data?.error ?? {}
  if (status >= 500) return new ApiError({ message: MESSAGES.server, status, code: 'server_error' })
  if (status === 429) {
    return new ApiError({ message: waitMessage(body.retry_after_seconds), status, code: 'throttled', retryAfter: body.retry_after_seconds ?? null })
  }
  if (body.code === 'not_authenticated') return new ApiError({ message: MESSAGES.auth, status, code: body.code })
  return new ApiError({
    message: body.message || MESSAGES.unknown,
    status,
    code: body.code || 'error',
    fields: body.fields ?? null,
  })
}

// Called whenever the API says the visitor is not signed in, so the auth
// context can notice an expired session.
const unauthenticatedListeners = new Set()

export function onUnauthenticated(listener) {
  unauthenticatedListeners.add(listener)
  return () => unauthenticatedListeners.delete(listener)
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const apiError = toApiError(error)
    const config = error.config
    // A stale CSRF token (e.g. after signing in from another tab): fetch a
    // fresh cookie and retry once. Idempotency keys make the retry safe.
    if (apiError.code === 'csrf_failed' && config && !config.csrfRetried) {
      try {
        await api.get('/auth/session/')
        return await api.request({ ...config, csrfRetried: true })
      } catch (retryError) {
        return Promise.reject(toApiError(retryError))
      }
    }
    if (apiError.code === 'not_authenticated') unauthenticatedListeners.forEach((listener) => listener())
    return Promise.reject(apiError)
  },
)

export default api
