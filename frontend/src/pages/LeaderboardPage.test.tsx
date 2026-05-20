import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import LeaderboardPage from './LeaderboardPage'
import * as leaderboardApi from '../api/leaderboard'
import * as exercisesApi from '../api/exercises'

vi.mock('../api/leaderboard')
vi.mock('../api/exercises')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const CATEGORIES: exercisesApi.Category[] = [
  { id: 'cat-1', name: 'Hitting' },
  { id: 'cat-2', name: 'Serving' },
]

const OVERALL_ENTRIES: leaderboardApi.LeaderboardEntry[] = [
  { rank: 1, playerId: 'p1', nickname: 'Alice', level: 5, xp: 100 },
  { rank: 2, playerId: 'p2', nickname: 'Bob', level: 3, xp: 50 },
]

const CATEGORY_ENTRIES: leaderboardApi.LeaderboardEntry[] = [
  { rank: 1, playerId: 'p2', nickname: 'Bob', level: 4, xp: 80 },
  { rank: 1, playerId: 'p1', nickname: 'Alice', level: 4, xp: 80 },
]

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
        <LeaderboardPage />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('LeaderboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.setItem('jwt', 'fake.jwt.token')
    vi.mocked(exercisesApi.getCategories).mockResolvedValue(CATEGORIES)
    vi.mocked(leaderboardApi.getLeaderboard).mockResolvedValue(OVERALL_ENTRIES)
    vi.mocked(leaderboardApi.getLeaderboardByCategory).mockResolvedValue(CATEGORY_ENTRIES)
  })

  it('shows an Overall pill and one pill per category', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Overall' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Hitting' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Serving' })).toBeInTheDocument()
    })
  })

  it('Overall pill is active by default and shows overall rankings', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Overall' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
    expect(screen.getAllByText(/Lv\./)).toHaveLength(2)
  })

  it('shows rank, nickname, and level for each row', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Alice'))
    expect(screen.getByText('#1')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(screen.getAllByText(/Lv\. 5/)).toHaveLength(1)
    expect(screen.getAllByText(/Lv\. 3/)).toHaveLength(1)
  })

  it('switching to a category pill loads that category leaderboard', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: 'Hitting' }))
    await user.click(screen.getByRole('button', { name: 'Hitting' }))
    await waitFor(() => {
      expect(leaderboardApi.getLeaderboardByCategory).toHaveBeenCalledWith('fake.jwt.token', 'cat-1')
    })
    expect(screen.getByRole('button', { name: 'Hitting' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Overall' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('tapping a Player row navigates to their profile', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => screen.getByText('Alice'))
    await user.click(screen.getByText('Alice'))
    expect(mockNavigate).toHaveBeenCalledWith('/profile/p1')
  })
})
