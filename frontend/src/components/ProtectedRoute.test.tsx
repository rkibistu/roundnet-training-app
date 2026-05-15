import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import ProtectedRoute from './ProtectedRoute'

function makeJwt(payload: object) {
  const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '')
  return `${enc({ alg: 'HS256' })}.${enc(payload)}.sig`
}

function renderProtected(initialPath: string, authed: boolean) {
  if (authed) {
    localStorage.setItem('jwt', makeJwt({ sub: '1', email: 'a@b.com', nickname: 'spike', is_admin: false }))
  }
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>home</div>} />
          </Route>
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => { localStorage.clear() })

  it('redirects to /login when not authenticated', () => {
    renderProtected('/', false)
    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('home')).not.toBeInTheDocument()
  })

  it('renders children when authenticated', () => {
    renderProtected('/', true)
    expect(screen.getByText('home')).toBeInTheDocument()
    expect(screen.queryByText('login page')).not.toBeInTheDocument()
  })
})
