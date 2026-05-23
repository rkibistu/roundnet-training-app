import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RegisterPage from './RegisterPage'
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
      <RegisterPage />
    </MemoryRouter>
  )
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders email, password, nickname fields and a submit button (no invite code)', () => {
    renderPage()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/invite code/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
  })

  it('calls register API with only email, password, and nickname on submit', async () => {
    vi.mocked(authApi.register).mockResolvedValue({ token: 'tok' })
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.type(screen.getByLabelText(/nickname/i), 'Alice')
    await userEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        email: 'alice@example.com',
        password: 'password123',
        nickname: 'Alice',
      })
    })
    expect(vi.mocked(authApi.register).mock.calls[0][0]).not.toHaveProperty('invite_code')
  })

  it('navigates to /login on successful registration', async () => {
    vi.mocked(authApi.register).mockResolvedValue({ token: 'tok' })
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  it('displays error message when registration fails', async () => {
    vi.mocked(authApi.register).mockRejectedValue(new Error('email already registered'))
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'pw')
    await userEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('shows a link to the login page', () => {
    renderPage()
    expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument()
  })

  it('shows the app name at the top of the card', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /roundnet training/i })).toBeInTheDocument()
  })
})
