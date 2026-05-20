import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import HomePage from './HomePage'
import * as invitesApi from '../api/invites'

vi.mock('../api/invites')

function renderPage(isAdmin: boolean) {
  const player = { id: 'p1', email: 'alice@example.com', nickname: 'Alice', is_admin: isAdmin }
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ player, isAuthenticated: true, login: vi.fn(), logout: vi.fn() }}>
        <HomePage />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('does not show Generate invite button for non-admin', () => {
    renderPage(false)
    expect(screen.queryByRole('button', { name: /generate invite/i })).not.toBeInTheDocument()
  })

  it('shows Generate invite button for admin', () => {
    renderPage(true)
    expect(screen.getByRole('button', { name: /generate invite/i })).toBeInTheDocument()
  })

  it('displays the generated code after clicking Generate invite', async () => {
    vi.mocked(invitesApi.generateInvite).mockResolvedValue({ code: 'abc-xyz-123' })
    renderPage(true)

    await userEvent.click(screen.getByRole('button', { name: /generate invite/i }))

    await waitFor(() => {
      expect(screen.getByText('abc-xyz-123')).toBeInTheDocument()
    })
  })

  it('shows a copy button next to the generated invite code', async () => {
    vi.mocked(invitesApi.generateInvite).mockResolvedValue({ code: 'abc-xyz-123' })
    renderPage(true)

    await userEvent.click(screen.getByRole('button', { name: /generate invite/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
    })
  })

  it('clicking copy writes the invite code to the clipboard', async () => {
    vi.mocked(invitesApi.generateInvite).mockResolvedValue({ code: 'abc-xyz-123' })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    renderPage(true)

    await userEvent.click(screen.getByRole('button', { name: /generate invite/i }))
    await screen.findByRole('button', { name: /copy/i })
    await userEvent.click(screen.getByRole('button', { name: /copy/i }))

    expect(writeText).toHaveBeenCalledWith('abc-xyz-123')
  })
})
