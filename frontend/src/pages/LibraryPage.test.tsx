import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import LibraryPage from './LibraryPage'
import * as exercisesApi from '../api/exercises'

vi.mock('../api/exercises')

const CATEGORIES: exercisesApi.Category[] = [
  { id: 'cat-1', name: 'Hitting' },
  { id: 'cat-2', name: 'Serving' },
]

const PLAYER_ID = 'player-1'

function makeExercise(overrides: Partial<exercisesApi.Exercise> = {}): exercisesApi.Exercise {
  return {
    id: 'ex-1',
    name: 'Cross-court hit',
    categoryId: 'cat-1',
    createdBy: PLAYER_ID,
    createdAt: '2026-01-01T00:00:00.000Z',
    category: CATEGORIES[0],
    ...overrides,
  }
}

function renderPage(playerId = PLAYER_ID) {
  const player = { id: playerId, email: 'alice@example.com', nickname: 'Alice', is_admin: false }
  render(
    <MemoryRouter>
      <AuthContext.Provider value={{ player, isAuthenticated: true, login: vi.fn(), logout: vi.fn() }}>
        <LibraryPage />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('LibraryPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(exercisesApi.getCategories).mockResolvedValue(CATEGORIES)
    vi.mocked(exercisesApi.getExercises).mockResolvedValue([])
  })

  it('renders the exercise list', async () => {
    vi.mocked(exercisesApi.getExercises).mockResolvedValue([makeExercise()])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Cross-court hit')).toBeInTheDocument()
    })
  })

  it('category filter renders as pill buttons, one per category plus All', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /hitting/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /serving/i })).toBeInTheDocument()
    })
  })

  it('filters by category when a pill is clicked', async () => {
    vi.mocked(exercisesApi.getExercises).mockResolvedValueOnce([makeExercise()]).mockResolvedValueOnce([])
    renderPage()

    await waitFor(() => expect(screen.getByRole('button', { name: /serving/i })).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /serving/i }))

    await waitFor(() => {
      expect(exercisesApi.getExercises).toHaveBeenCalledWith('cat-2')
    })
  })

  it('adds an exercise and shows it in the list', async () => {
    const newExercise = makeExercise({ id: 'ex-2', name: 'Jump serve' })
    vi.mocked(exercisesApi.createExercise).mockResolvedValue(newExercise)
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /\+ add exercise/i }))
    await waitFor(() => expect(screen.getByLabelText(/name/i)).toBeInTheDocument())
    await userEvent.type(screen.getByLabelText(/name/i), 'Jump serve')
    await userEvent.click(screen.getByRole('button', { name: /^add exercise$/i }))

    await waitFor(() => {
      expect(screen.getByText('Jump serve')).toBeInTheDocument()
    })
  })

  it('delete requires confirmation before removing the exercise', async () => {
    vi.mocked(exercisesApi.getExercises).mockResolvedValue([makeExercise()])
    vi.mocked(exercisesApi.deleteExercise).mockResolvedValue()
    renderPage()

    await waitFor(() => expect(screen.getByText('Cross-court hit')).toBeInTheDocument())

    // First click shows confirmation — exercise still present, delete not called
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(exercisesApi.deleteExercise).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()

    // Confirming actually deletes
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))
    await waitFor(() => {
      expect(exercisesApi.deleteExercise).toHaveBeenCalledWith(expect.any(String), 'ex-1')
    })
  })

  it('shows edit and delete only on the current player\'s exercises', async () => {
    const ownExercise = makeExercise({ id: 'ex-own', name: 'My drill', createdBy: PLAYER_ID })
    const otherExercise = makeExercise({ id: 'ex-other', name: 'Their drill', createdBy: 'other-player' })
    vi.mocked(exercisesApi.getExercises).mockResolvedValue([ownExercise, otherExercise])
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('My drill')).toBeInTheDocument()
      expect(screen.getByText('Their drill')).toBeInTheDocument()
    })

    const listItems = screen.getAllByRole('listitem')
    const ownItem = listItems.find((li) => li.textContent?.includes('My drill'))!
    const otherItem = listItems.find((li) => li.textContent?.includes('Their drill'))!

    expect(ownItem.querySelector('button[type="button"]')).toBeTruthy()
    expect(otherItem.querySelector('button[type="button"]')).toBeNull()
  })
})
