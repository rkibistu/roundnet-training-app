import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuthContext } from './AuthContext'
import ProtectedRoute from '../components/ProtectedRoute'
import ShellLayout from '../components/ShellLayout'

function makeJwt(payload: object): string {
  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/=+$/, '')
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.sig`
}

function LoginButton({ token }: { token: string }) {
  const { login } = useAuthContext()
  return <button onClick={() => login(token)}>login</button>
}

function renderApp() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<ShellLayout />}>
              <Route path="/" element={<div>home content</div>} />
            </Route>
          </Route>
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('redirects unauthenticated users to the login page', () => {
    renderApp()
    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('home content')).not.toBeInTheDocument()
  })

  it('shows nickname in header after login', async () => {
    const token = makeJwt({ sub: '1', email: 'a@b.com', nickname: 'spike', is_admin: false })
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginButton token={token} />
          <ShellLayout />
        </AuthProvider>
      </MemoryRouter>
    )
    await userEvent.click(screen.getByRole('button', { name: 'login' }))
    expect(screen.getByText('spike')).toBeInTheDocument()
  })

  it('login persists JWT to localStorage', async () => {
    const token = makeJwt({ sub: '1', email: 'a@b.com', nickname: 'spike', is_admin: false })
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginButton token={token} />
          <ShellLayout />
        </AuthProvider>
      </MemoryRouter>
    )
    await userEvent.click(screen.getByRole('button', { name: 'login' }))
    expect(localStorage.getItem('jwt')).toBe(token)
  })

  it('logout clears JWT and redirects to the login page', async () => {
    const token = makeJwt({ sub: '1', email: 'a@b.com', nickname: 'spike', is_admin: false })
    localStorage.setItem('jwt', token)
    renderApp()
    expect(screen.getByText('home content')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /logout/i }))
    expect(localStorage.getItem('jwt')).toBeNull()
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('restores authentication on page load when JWT is present in localStorage', () => {
    const token = makeJwt({ sub: '42', email: 'z@z.com', nickname: 'yoyo', is_admin: true })
    localStorage.setItem('jwt', token)
    renderApp()
    expect(screen.getByText('home content')).toBeInTheDocument()
    expect(screen.getByText('yoyo')).toBeInTheDocument()
  })
})
