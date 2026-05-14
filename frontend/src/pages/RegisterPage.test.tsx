import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RegisterPage from './RegisterPage'
import * as authApi from '../api/auth'

vi.mock('../api/auth')

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

  it('renders email, password, nickname fields and a submit button', () => {
    renderPage()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
  })

  it('calls register API with form values on submit', async () => {
    vi.mocked(authApi.register).mockResolvedValue({ token: 'tok' })
    renderPage()

    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /register/i }))

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith({
        email: 'alice@example.com',
        password: 'password123',
        nickname: undefined,
      })
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
})
