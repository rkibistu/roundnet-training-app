import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuthContext } from './AuthContext'

function makeJwt(payload: object): string {
  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/=+$/, '')
  return `${encode({ alg: 'HS256' })}.${encode(payload)}.sig`
}

function AuthStatus() {
  const { isAuthenticated, player } = useAuthContext()
  return (
    <div>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="player">{player ? player.nickname : 'none'}</span>
    </div>
  )
}

function renderWithAuth() {
  render(
    <AuthProvider>
      <AuthStatus />
    </AuthProvider>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('isAuthenticated is false when no JWT in localStorage', () => {
    renderWithAuth()
    expect(screen.getByTestId('authed').textContent).toBe('false')
    expect(screen.getByTestId('player').textContent).toBe('none')
  })

  it('login stores JWT under "jwt" key and decodes player from payload', () => {
    const token = makeJwt({ sub: '1', email: 'a@b.com', nickname: 'spike', is_admin: false })
    function LoginButton() {
      const { login } = useAuthContext()
      return <button onClick={() => login(token)}>login</button>
    }
    render(<AuthProvider><LoginButton /><AuthStatus /></AuthProvider>)
    act(() => { screen.getByRole('button').click() })
    expect(localStorage.getItem('jwt')).toBe(token)
    expect(screen.getByTestId('player').textContent).toBe('spike')
  })

  it('isAuthenticated is true after login', () => {
    const token = makeJwt({ sub: '1', email: 'a@b.com', nickname: 'spike', is_admin: false })
    function LoginButton() {
      const { login } = useAuthContext()
      return <button onClick={() => login(token)}>login</button>
    }
    render(<AuthProvider><LoginButton /><AuthStatus /></AuthProvider>)
    act(() => { screen.getByRole('button').click() })
    expect(screen.getByTestId('authed').textContent).toBe('true')
  })

  it('logout clears JWT from localStorage and resets player to null', () => {
    const token = makeJwt({ sub: '1', email: 'a@b.com', nickname: 'spike', is_admin: false })
    localStorage.setItem('jwt', token)
    function LogoutButton() {
      const { logout } = useAuthContext()
      return <button onClick={logout}>logout</button>
    }
    render(<AuthProvider><LogoutButton /><AuthStatus /></AuthProvider>)
    act(() => { screen.getByRole('button').click() })
    expect(localStorage.getItem('jwt')).toBeNull()
    expect(screen.getByTestId('authed').textContent).toBe('false')
    expect(screen.getByTestId('player').textContent).toBe('none')
  })

  it('restores player from localStorage on boot when JWT is present', () => {
    const token = makeJwt({ sub: '42', email: 'z@z.com', nickname: 'yoyo', is_admin: true })
    localStorage.setItem('jwt', token)
    renderWithAuth()
    expect(screen.getByTestId('authed').textContent).toBe('true')
    expect(screen.getByTestId('player').textContent).toBe('yoyo')
  })
})
