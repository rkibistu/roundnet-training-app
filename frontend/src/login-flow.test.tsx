import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import * as authApi from './api/auth'

vi.mock('./api/auth')

function makeJwt(payload: object): string {
  const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '')
  return `${enc({ alg: 'HS256' })}.${enc(payload)}.sig`
}

describe('login flow', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  async function loginAs(nickname: string, isAdmin: boolean) {
    const token = makeJwt({ sub: '1', email: 'u@example.com', nickname, is_admin: isAdmin })
    vi.mocked(authApi.login).mockResolvedValue({ token })

    render(<App />)
    await userEvent.type(screen.getByLabelText(/email/i), 'u@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))
  }

  it('shows nickname in welcome message after successful login', async () => {
    await loginAs('Alice', false)
    await waitFor(() => {
      expect(screen.getByText(/welcome, alice/i)).toBeInTheDocument()
    })
  })

  it('shows Admin section for admin after login (invites removed)', async () => {
    await loginAs('Admin', true)
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /admin/i })).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /generate invite/i })).not.toBeInTheDocument()
  })

  it('does not show Admin section for non-admin after login', async () => {
    await loginAs('Alice', false)
    await waitFor(() => {
      expect(screen.getByText(/welcome, alice/i)).toBeInTheDocument()
    })
    expect(screen.queryByRole('region', { name: /admin/i })).not.toBeInTheDocument()
  })
})
