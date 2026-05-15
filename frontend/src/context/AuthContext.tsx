import { createContext, useContext, useState, ReactNode } from 'react'

export interface Player {
  id: string
  email: string
  nickname: string
  is_admin: boolean
}

interface AuthContextValue {
  player: Player | null
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

function decodePayload(token: string): Player {
  const payload = JSON.parse(atob(token.split('.')[1]))
  return {
    id: payload.sub,
    email: payload.email,
    nickname: payload.nickname,
    is_admin: payload.is_admin ?? false,
  }
}

function readStoredPlayer(): Player | null {
  const token = localStorage.getItem('jwt')
  if (!token) return null
  try {
    return decodePayload(token)
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [player, setPlayer] = useState<Player | null>(readStoredPlayer)

  function login(token: string) {
    localStorage.setItem('jwt', token)
    setPlayer(decodePayload(token))
  }

  function logout() {
    localStorage.removeItem('jwt')
    setPlayer(null)
  }

  return (
    <AuthContext.Provider value={{ player, isAuthenticated: player !== null, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider')
  return ctx
}
