import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import LoginPage from './LoginPage'
import * as authApi from '../api/auth'

vi.mock('../api/auth')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockLogin = vi.fn()
const stubCtx = {
  player: null,
  isAuthenticated: false,
  login: mockLogin,
  logout: vi.fn(),
}

function renderPage() {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={stubCtx}>
        <LoginPage />
      </AuthContext.Provider>
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

  it('calls AuthContext login with the token and navigates to / on success', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ token: 'my-jwt' })
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('my-jwt')
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

  it('shows a link to the register page', () => {
    renderPage()
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument()
  })
})
