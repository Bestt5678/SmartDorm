import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../../api/apiClient'
import type { Role, User } from '../../userTypes'

type AuthValue = {
  user: User | null
  login: (email: string, password: string, role: Role) => Promise<void>
  register: (data: any) => Promise<void>
  refresh: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

function loadUser(): User | null {
  try {
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    if (token && user) return JSON.parse(user)
  } catch {
    // ข้อมูลใน localStorage เสีย ให้ถือว่ายังไม่ได้ login
  }
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser)

  function saveLogin(token: string, user: User) {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
  }

  async function login(email: string, password: string, role: Role) {
    const res = await api.post('/auth/login', { email, password, role })
    saveLogin(res.data.token, res.data.user)
  }

  async function register(data: any) {
    const res = await api.post('/auth/register', data)
    saveLogin(res.data.token, res.data.user)
  }

  async function refresh() {
    const res = await api.get('/auth/me')
    localStorage.setItem('user', JSON.stringify(res.data))
    setUser(res.data)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  // apiClient.ts ส่ง event นี้มาเมื่อ token หมดอายุ
  useEffect(() => {
    function onLogout() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setUser(null)
    }
    window.addEventListener('auth:logout', onLogout)
    return () => window.removeEventListener('auth:logout', onLogout)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth ต้องอยู่ใน AuthProvider')
  return value
}
