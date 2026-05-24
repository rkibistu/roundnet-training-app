import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import LibraryPage from './LibraryPage'
import * as domainsApi from '../api/domains'

vi.mock('../api/domains')

const stubCtx = {
  player: { id: 'me', email: 'me@example.com', nickname: 'me', is_admin: false },
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
}

function renderPage() {
  render(
    <MemoryRouter>
      <AuthContext.Provider value={stubCtx}>
        <LibraryPage />
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('LibraryPage (Domain browser)', () => {
  it('fetches Domains on mount and renders each one by name', async () => {
    vi.mocked(domainsApi.listDomains).mockResolvedValue([
      { id: 'd1', name: 'Roundnet', ownerId: 'me', accessibilityState: 'public', rootDomainId: null, isAscended: false, createdAt: '2026-05-24T00:00:00.000Z' },
      { id: 'd2', name: 'Chess',    ownerId: 'p2', accessibilityState: 'public', rootDomainId: null, isAscended: false, createdAt: '2026-05-24T00:00:00.000Z' },
    ])

    renderPage()

    expect(await screen.findByText('Roundnet')).toBeInTheDocument()
    expect(screen.getByText('Chess')).toBeInTheDocument()
    expect(domainsApi.listDomains).toHaveBeenCalledTimes(1)
  })

  it('groups Domains into "Your Domains" (caller-owned) and "Discoverable" (others)', async () => {
    vi.mocked(domainsApi.listDomains).mockResolvedValue([
      { id: 'd1', name: 'Mine A',  ownerId: 'me', accessibilityState: 'public',    rootDomainId: null, isAscended: false, createdAt: '2026-05-24T00:00:00.000Z' },
      { id: 'd2', name: 'Mine B',  ownerId: 'me', accessibilityState: 'private',   rootDomainId: null, isAscended: false, createdAt: '2026-05-24T00:00:00.000Z' },
      { id: 'd3', name: 'Theirs',  ownerId: 'p2', accessibilityState: 'protected', rootDomainId: null, isAscended: false, createdAt: '2026-05-24T00:00:00.000Z' },
    ])

    renderPage()

    const yours = await screen.findByRole('region', { name: /your domains/i })
    const others = screen.getByRole('region', { name: /discoverable/i })

    expect(yours).toHaveTextContent('Mine A')
    expect(yours).toHaveTextContent('Mine B')
    expect(yours).not.toHaveTextContent('Theirs')

    expect(others).toHaveTextContent('Theirs')
    expect(others).not.toHaveTextContent('Mine A')
    expect(others).not.toHaveTextContent('Mine B')
  })

  it('renders each Domain as a link to its detail page', async () => {
    vi.mocked(domainsApi.listDomains).mockResolvedValue([
      { id: 'd1', name: 'Roundnet', ownerId: 'me', accessibilityState: 'public', rootDomainId: null, isAscended: false, createdAt: '2026-05-24T00:00:00.000Z' },
    ])

    renderPage()

    const link = await screen.findByRole('link', { name: /roundnet/i })
    expect(link).toHaveAttribute('href', '/library/d1')
  })

  it('shows an accessibility badge for each Domain', async () => {
    vi.mocked(domainsApi.listDomains).mockResolvedValue([
      { id: 'd1', name: 'A', ownerId: 'me', accessibilityState: 'public',    rootDomainId: null, isAscended: false, createdAt: '2026-05-24T00:00:00.000Z' },
      { id: 'd2', name: 'B', ownerId: 'me', accessibilityState: 'protected', rootDomainId: null, isAscended: false, createdAt: '2026-05-24T00:00:00.000Z' },
      { id: 'd3', name: 'C', ownerId: 'me', accessibilityState: 'private',   rootDomainId: null, isAscended: false, createdAt: '2026-05-24T00:00:00.000Z' },
    ])

    renderPage()

    expect(await screen.findByText(/public/i)).toBeInTheDocument()
    expect(screen.getByText(/protected/i)).toBeInTheDocument()
    expect(screen.getByText(/private/i)).toBeInTheDocument()
  })

  it('shows a link to create a new Domain', async () => {
    vi.mocked(domainsApi.listDomains).mockResolvedValue([])

    renderPage()

    const link = await screen.findByRole('link', { name: /new domain/i })
    expect(link).toHaveAttribute('href', '/library/new')
  })
})
