import api from './api'
import { mapUser } from './mappers'

export const REGISTER_FIELDS = { full_name: 'fullName', email: 'email', phone: 'phone', password: 'password' }
export const LOGIN_FIELDS = { email: 'email', password: 'password' }

// Also sets the CSRF cookie that every later POST needs.
export async function getSession() {
  const { data } = await api.get('/auth/session/')
  return data.user ? mapUser(data.user) : null
}

export async function login({ email, password }) {
  const { data } = await api.post('/auth/login/', { email, password })
  return mapUser(data.user)
}

export async function register({ fullName, email, phone, password }) {
  const { data } = await api.post('/auth/register/', { full_name: fullName, email, phone, password })
  return mapUser(data.user)
}

export async function logout() {
  await api.post('/auth/logout/')
}
