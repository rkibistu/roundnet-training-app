import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SessionDetailPage from './SessionDetailPage'
import * as sessionsApi from '../api/sessions'

vi.mock('../api/sessions')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const stubSession = {
  id: 's1',
  date: '2026-05-20',
  createdAt: '',
  player: { id: 'p1', nickname: 'Alice' },
  entries: [
    {
      id: 'e1',
      exerciseId: 'ex1',
      exerciseName: 'Deep Serves',
      categoryName: 'Serving',
      durationMinutes: 20,
      qualityScore: 4,
      xpEarned: 25,
    },
  ],
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/sessions/s1']}>
      <Routes>
        <Route path="/sessions/:id" element={<SessionDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('SessionDetailPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.setItem('jwt', 'fake.jwt.token')
    vi.mocked(sessionsApi.getSession).mockResolvedValue(stubSession)
  })

  it('shows Quality Score as filled dots, not a raw number', async () => {
    renderPage()
    await screen.findByText('Deep Serves')

    // Raw number alone should not appear as plain text
    expect(screen.queryByText('4')).not.toBeInTheDocument()
    // Visual dots: aria-label on the quality indicator
    expect(screen.getByLabelText(/quality score: 4/i)).toBeInTheDocument()
  })

  it('back button navigates to /sessions', async () => {
    renderPage()
    await screen.findByText('Deep Serves')

    await userEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/sessions')
  })
})
