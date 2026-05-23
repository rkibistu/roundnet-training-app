import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import HomePage from './HomePage'

function renderPage(isAdmin: boolean) {
  const player = { id: 'p1', email: 'alice@example.com', nickname: 'Alice', is_admin: isAdmin }
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ player, isAuthenticated: true, login: () => {}, logout: () => {} }}>
        <HomePage />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('HomePage', () => {
  it('greets the current player', () => {
    renderPage(false)
    expect(screen.getByText(/welcome, alice/i)).toBeInTheDocument()
  })

  it('does not show any Generate invite button (invites removed)', () => {
    renderPage(true)
    expect(screen.queryByRole('button', { name: /generate invite/i })).not.toBeInTheDocument()
  })

  it('does not reference invite codes anywhere', () => {
    renderPage(true)
    expect(screen.queryByText(/invite/i)).not.toBeInTheDocument()
  })

  it('shows an admin placeholder section for admins', () => {
    renderPage(true)
    expect(screen.getByRole('region', { name: /admin/i })).toBeInTheDocument()
  })

  it('does not show the admin placeholder for non-admins', () => {
    renderPage(false)
    expect(screen.queryByRole('region', { name: /admin/i })).not.toBeInTheDocument()
  })
})
