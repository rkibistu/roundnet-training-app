import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import ProfilePage from './ProfilePage'
import * as playersApi from '../api/players'

vi.mock('../api/players')

const aliceId = 'player-alice'
const bobId = 'player-bob'

const stubCtx = {
  player: { id: aliceId, email: 'alice@example.com', nickname: 'Alice', is_admin: false },
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
}

const mockProfile: playersApi.PlayerProfile = {
  id: aliceId,
  nickname: 'Alice',
  isAdmin: false,
  generalLevel: { level: 5, xp: 120, xpFloor: 90, xpCeiling: 160 },
  categoryLevels: [
    { categoryId: 'c1', categoryName: 'Serving', level: 3, xp: 40, xpFloor: 30, xpCeiling: 55 },
    { categoryId: 'c2', categoryName: 'Hitting', level: 2, xp: 10, xpFloor: 7, xpCeiling: 14 },
  ],
  recentSessions: [
    { id: 's1', playerId: aliceId, date: '2026-05-01T00:00:00Z', createdAt: '', playerNickname: 'Alice', totalDuration: 45 },
    { id: 's2', playerId: aliceId, date: '2026-04-28T00:00:00Z', createdAt: '', playerNickname: 'Alice', totalDuration: 30 },
  ],
}

function renderProfile(playerId = aliceId) {
  render(
    <MemoryRouter initialEntries={[`/profile/${playerId}`]}>
      <AuthContext.Provider value={stubCtx}>
        <Routes>
          <Route path="/profile/:id" element={<ProfilePage />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.setItem('jwt', 'fake.jwt.token')
    vi.mocked(playersApi.getPlayer).mockResolvedValue(mockProfile)
  })

  it('renders nickname and General Level with XP', async () => {
    renderProfile()
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())
    expect(screen.getByText(/level 5/i)).toBeInTheDocument()
    expect(screen.getByText(/120/)).toBeInTheDocument()
  })

  it('renders all Category Levels with category names', async () => {
    renderProfile()
    await waitFor(() => expect(screen.getByText('Serving')).toBeInTheDocument())
    expect(screen.getByText('Hitting')).toBeInTheDocument()
    expect(screen.getByText(/level 3/i)).toBeInTheDocument()
    expect(screen.getByText(/level 2/i)).toBeInTheDocument()
  })

  it('renders recent Sessions list', async () => {
    renderProfile()
    await waitFor(() => expect(screen.getAllByText(/45 min/i).length).toBeGreaterThan(0))
    expect(screen.getAllByText(/30 min/i).length).toBeGreaterThan(0)
  })

  it('shows nickname edit button only on own profile', async () => {
    renderProfile(aliceId)
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /edit nickname/i })).toBeInTheDocument()
  })

  it('does not show nickname edit button on another player profile', async () => {
    vi.mocked(playersApi.getPlayer).mockResolvedValue({ ...mockProfile, id: bobId })
    renderProfile(bobId)
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /edit nickname/i })).not.toBeInTheDocument()
  })

  it('nickname edit saves and updates displayed nickname', async () => {
    vi.mocked(playersApi.updateNickname).mockResolvedValue({
      id: aliceId, nickname: 'AliceNew', isAdmin: false,
      generalLevel: mockProfile.generalLevel,
    })
    renderProfile(aliceId)
    await waitFor(() => screen.getByRole('button', { name: /edit nickname/i }))

    await userEvent.click(screen.getByRole('button', { name: /edit nickname/i }))
    const input = screen.getByRole('textbox', { name: /nickname/i })
    await userEvent.clear(input)
    await userEvent.type(input, 'AliceNew')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => expect(screen.getByText('AliceNew')).toBeInTheDocument())
    expect(playersApi.updateNickname).toHaveBeenCalledWith('fake.jwt.token', aliceId, 'AliceNew')
  })
})
