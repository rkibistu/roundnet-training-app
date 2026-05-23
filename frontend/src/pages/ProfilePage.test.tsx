import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProfilePage from './ProfilePage'

function renderProfile(playerId = 'p1') {
  render(
    <MemoryRouter initialEntries={[`/profile/${playerId}`]}>
      <Routes>
        <Route path="/profile/:id" element={<ProfilePage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProfilePage (stub pending Player profile #?)', () => {
  it('renders a Profile placeholder heading', () => {
    renderProfile()
    expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument()
  })

  it('mentions that the feature is coming soon', () => {
    renderProfile()
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  })

  it('does not reference categories', () => {
    renderProfile()
    expect(screen.queryByText(/category/i)).not.toBeInTheDocument()
  })
})
