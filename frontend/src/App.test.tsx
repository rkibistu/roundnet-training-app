import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

function makeJwt(payload: object) {
  const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '')
  return `${enc({ alg: 'HS256' })}.${enc(payload)}.sig`
}

describe('App', () => {
  beforeEach(() => { localStorage.clear() })

  it('renders without crashing', () => {
    render(<App />)
  })

  it('unauthenticated user visiting / is redirected to /login', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('authenticated user visiting /login is redirected to home', () => {
    localStorage.setItem('jwt', makeJwt({ sub: '1', email: 'a@b.com', nickname: 'spike', is_admin: false }))
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /log in/i })).not.toBeInTheDocument()
  })
})
