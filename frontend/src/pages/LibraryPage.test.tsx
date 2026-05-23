import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LibraryPage from './LibraryPage'

function renderPage() {
  render(
    <MemoryRouter>
      <LibraryPage />
    </MemoryRouter>
  )
}

describe('LibraryPage (stub pending Habit Domain browser #25)', () => {
  it('renders a Domains placeholder heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /domains/i })).toBeInTheDocument()
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
