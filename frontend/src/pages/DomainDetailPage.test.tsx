import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import DomainDetailPage from './DomainDetailPage'
import * as domainsApi from '../api/domains'

vi.mock('../api/domains')

const stubCtx = {
  player: { id: 'me', email: 'me@example.com', nickname: 'me', is_admin: false },
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
}

function renderPage(initialPath = '/library/d1') {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthContext.Provider value={stubCtx}>
        <Routes>
          <Route path="/library/:id" element={<DomainDetailPage />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('DomainDetailPage', () => {
  it('fetches the Domain by id and displays its name and accessibility', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue({
      id: 'd1',
      name: 'Roundnet',
      ownerId: 'me',
      accessibilityState: 'public',
      rootDomainId: null,
      isAscended: false,
      createdAt: '2026-05-24T00:00:00.000Z',
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: /roundnet/i })).toBeInTheDocument()
    expect(screen.getByText(/public/i)).toBeInTheDocument()
    expect(domainsApi.getDomain).toHaveBeenCalledWith('d1')
  })

  it('lets the owner edit the name inline and persists via updateDomain', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue({
      id: 'd1', name: 'Old name', ownerId: 'me', accessibilityState: 'public',
      rootDomainId: null, isAscended: false, createdAt: '2026-05-24T00:00:00.000Z',
    })
    vi.mocked(domainsApi.updateDomain).mockResolvedValue({
      id: 'd1', name: 'New name', ownerId: 'me', accessibilityState: 'public',
      rootDomainId: null, isAscended: false, createdAt: '2026-05-24T00:00:00.000Z',
    })

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /edit name/i }))

    const input = screen.getByLabelText(/name/i)
    await userEvent.clear(input)
    await userEvent.type(input, 'New name')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(domainsApi.updateDomain).toHaveBeenCalledWith('d1', { name: 'New name' })
      expect(screen.getByRole('heading', { name: /new name/i })).toBeInTheDocument()
    })
  })

  it('does not show the Edit name button when the caller is not the owner', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue({
      id: 'd1', name: 'Theirs', ownerId: 'someone-else', accessibilityState: 'public',
      rootDomainId: null, isAscended: false, createdAt: '2026-05-24T00:00:00.000Z',
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: /theirs/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit name/i })).not.toBeInTheDocument()
  })
})
