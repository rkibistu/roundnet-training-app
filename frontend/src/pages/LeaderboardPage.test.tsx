import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LeaderboardPage from './LeaderboardPage'

function renderPage() {
  render(
    <MemoryRouter>
      <LeaderboardPage />
    </MemoryRouter>
  )
}

describe('LeaderboardPage (stub pending Leaderboard #26)', () => {
  it('renders a Leaderboard placeholder heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /leaderboard/i })).toBeInTheDocument()
  })

  it('mentions that the feature is coming soon', () => {
    renderPage()
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  })

  it('does not reference categories', () => {
    renderPage()
    expect(screen.queryByText(/category/i)).not.toBeInTheDocument()
  })
})
