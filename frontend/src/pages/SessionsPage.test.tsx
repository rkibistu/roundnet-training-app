import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SessionsPage from './SessionsPage'

function renderPage() {
  render(
    <MemoryRouter>
      <SessionsPage />
    </MemoryRouter>
  )
}

describe('SessionsPage (stub pending Session logging #28)', () => {
  it('renders a Sessions placeholder heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /sessions/i })).toBeInTheDocument()
  })

  it('mentions that the feature is coming soon', () => {
    renderPage()
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  })

  it('does not reference exercises or categories', () => {
    renderPage()
    expect(screen.queryByText(/exercise/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/category/i)).not.toBeInTheDocument()
  })
})
