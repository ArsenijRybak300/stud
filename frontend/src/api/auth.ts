import api from './client'
import type { AuthResponse, User } from '../types'

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const form = new URLSearchParams()
  form.set('username', email)
  form.set('password', password)
  const { data } = await api.post<AuthResponse>('/auth/login', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
  return data
}

export async function registerUser(payload: { email: string; full_name: string; password: string; group_code: string }): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/register', payload)
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me')
  return data
}
