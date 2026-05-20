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
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('renders bottom nav with 5 tabs', () => {
    renderShell()
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sessions/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /library/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /board/i })).toBeInTheDocument()
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

  it('renders a theme toggle button', () => {
    renderShell()
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument()
  })

  it('clicking theme toggle applies dark class to document root', async () => {
    renderShell()
    await userEvent.click(screen.getByRole('button', { name: /toggle theme/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('clicking theme toggle twice removes dark class', async () => {
    renderShell()
    const btn = screen.getByRole('button', { name: /toggle theme/i })
    await userEvent.click(btn)
    await userEvent.click(btn)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('persists dark preference to localStorage when toggled on', async () => {
    renderShell()
    await userEvent.click(screen.getByRole('button', { name: /toggle theme/i }))
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('persists light preference to localStorage when toggled off', async () => {
    renderShell()
    const btn = screen.getByRole('button', { name: /toggle theme/i })
    await userEvent.click(btn)
    await userEvent.click(btn)
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('applies dark class on mount when localStorage has dark preference', () => {
    localStorage.setItem('theme', 'dark')
    renderShell()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
