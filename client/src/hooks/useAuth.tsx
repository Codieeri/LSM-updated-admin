import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type Role = 'admin' | 'hr' | 'manager' | 'employee'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  department: string
  avatar?: string
  employeeCode: string
}

interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Mock users for demo
const MOCK_USERS: Record<string, User & { password: string }> = {
  'admin@localsm.com': {
    id: '1', name: 'Admin', email: 'admin@localsm.com', password: 'admin123',
    role: 'admin', department: 'Management', employeeCode: 'LSM-0001',
  },
  'hr@localsm.com': {
    id: '2', name: 'HR', email: 'hr@localsm.com', password: 'hr123',
    role: 'hr', department: 'Human Resources', employeeCode: 'LSM-0002',
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('lsm_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback(async (email: string, password: string) => {
    await new Promise(r => setTimeout(r, 800)) // simulate API
    const found = MOCK_USERS[email]
    if (!found || found.password !== password) {
      throw new Error('Invalid email or password')
    }
    const { password: _, ...userData } = found
    setUser(userData)
    localStorage.setItem('lsm_user', JSON.stringify(userData))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('lsm_user')
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
