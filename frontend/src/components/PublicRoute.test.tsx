import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import PublicRoute from './PublicRoute'

function makeJwt(payload: object) {
  const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '')
  return `${enc({ alg: 'HS256' })}.${enc(payload)}.sig`
}

function renderPublic(initialPath: string, authed: boolean) {
  if (authed) {
    localStorage.setItem('jwt', makeJwt({ sub: '1', email: 'a@b.com', nickname: 'spike', is_admin: false }))
  }
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<div>login page</div>} />
          </Route>
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('PublicRoute', () => {
  beforeEach(() => { localStorage.clear() })

  it('renders children when not authenticated', () => {
    renderPublic('/login', false)
    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('home')).not.toBeInTheDocument()
  })

  it('redirects to / when already authenticated', () => {
    renderPublic('/login', true)
    expect(screen.getByText('home')).toBeInTheDocument()
    expect(screen.queryByText('login page')).not.toBeInTheDocument()
  })
})
