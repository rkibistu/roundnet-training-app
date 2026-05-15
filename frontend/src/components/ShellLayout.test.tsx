import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import ShellLayout from './ShellLayout'

const stubPlayer = { id: '1', email: 'a@b.com', nickname: 'spike', is_admin: false }

function renderShell(onLogout = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/']}>
      <AuthContext.Provider value={{ player: stubPlayer, isAuthenticated: true, login: vi.fn(), logout: onLogout }}>
        <ShellLayout />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('ShellLayout', () => {
  beforeEach(() => { vi.resetAllMocks() })

  it('renders bottom nav with 5 tabs', () => {
    renderShell()
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sessions/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /library/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /leaderboard/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument()
  })

  it('shows the current player nickname in the top bar', () => {
    renderShell()
    expect(screen.getByText('spike')).toBeInTheDocument()
  })

  it('calls logout when the logout button is clicked', async () => {
    const onLogout = vi.fn()
    renderShell(onLogout)
    await userEvent.click(screen.getByRole('button', { name: /logout/i }))
    expect(onLogout).toHaveBeenCalledOnce()
  })
})
