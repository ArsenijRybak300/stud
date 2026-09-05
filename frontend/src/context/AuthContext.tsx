import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getMe, loginUser, registerUser } from '../api/auth'
import type { User } from '../types'

type RegisterPayload = { email: string; full_name: string; password: string; group_code: string }
type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!localStorage.getItem('studentplan_token')) { setLoading(false); return }
    getMe().then(setUser).catch(() => {
      localStorage.removeItem('studentplan_token'); localStorage.removeItem('studentplan_user')
    }).finally(() => setLoading(false))
  }, [])

  const save = (token: string, currentUser: User) => {
    localStorage.setItem('studentplan_token', token)
    localStorage.setItem('studentplan_user', JSON.stringify(currentUser))
    setUser(currentUser)
  }

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login: async (email, password) => { const result = await loginUser(email, password); save(result.access_token, result.user) },
    register: async (payload) => { const result = await registerUser(payload); save(result.access_token, result.user) },
    logout: () => { localStorage.removeItem('studentplan_token'); localStorage.removeItem('studentplan_user'); setUser(null) },
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is required')
  return value
}
