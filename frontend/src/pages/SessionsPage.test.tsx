import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import SessionsPage from './SessionsPage'
import * as sessionsApi from '../api/sessions'
import * as exercisesApi from '../api/exercises'

vi.mock('../api/sessions')
vi.mock('../api/exercises')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const stubCtx = {
  player: { id: 'p1', email: 'alice@example.com', nickname: 'Alice', is_admin: false },
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
}

function renderPage() {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={stubCtx}>
        <SessionsPage />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('SessionsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.setItem('jwt', 'fake.jwt.token')
    vi.mocked(sessionsApi.getSessions).mockResolvedValue([])
    vi.mocked(exercisesApi.getExercises).mockResolvedValue([])
  })

  it('renders the Quality Score control as 5 buttons, not a select', async () => {
    vi.mocked(sessionsApi.createSession).mockResolvedValue({
      id: 's1', playerId: 'p1', date: '2026-05-20', createdAt: '', playerNickname: 'Alice', totalDuration: 0,
    })
    vi.mocked(exercisesApi.getExercises).mockResolvedValue([
      { id: 'e1', name: 'Serving', categoryId: 'c1', createdBy: 'p1', createdAt: '', category: { id: 'c1', name: 'Serving' } },
    ])
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /start session/i }))

    expect(screen.queryByRole('combobox', { name: /quality score/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^[1-5]$/ })).toHaveLength(5)
  })

  it('clicking a Quality Score button makes it the active selection', async () => {
    vi.mocked(sessionsApi.createSession).mockResolvedValue({
      id: 's1', playerId: 'p1', date: '2026-05-20', createdAt: '', playerNickname: 'Alice', totalDuration: 0,
    })
    vi.mocked(exercisesApi.getExercises).mockResolvedValue([
      { id: 'e1', name: 'Serving', categoryId: 'c1', createdBy: 'p1', createdAt: '', category: { id: 'c1', name: 'Serving' } },
    ])
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /start session/i }))
    await userEvent.click(screen.getByRole('button', { name: '5' }))

    expect(screen.getByRole('button', { name: '5' })).toHaveAttribute('aria-pressed', 'true')
  })
})
