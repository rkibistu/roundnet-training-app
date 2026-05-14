import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './LoginPage'
import * as authApi from '../api/auth'

vi.mock('../api/auth')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderPage() {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('renders email and password fields and a submit button', () => {
    renderPage()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('stores JWT in localStorage and redirects to home on success', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ token: 'my-jwt' })
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('my-jwt')
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('displays error message on login failure', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error('invalid credentials'))
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
