import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import DomainDetailPage from './DomainDetailPage'
import * as domainsApi from '../api/domains'
import * as skillsApi from '../api/skills'

vi.mock('../api/domains')
vi.mock('../api/skills')

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

const ownedDomain = {
  id: 'd1', name: 'Roundnet', ownerId: 'me', accessibilityState: 'public' as const,
  rootDomainId: null, isAscended: false, createdAt: '2026-05-24T00:00:00.000Z',
}
const otherDomain = { ...ownedDomain, ownerId: 'someone-else', name: 'Theirs' }
const skill = (over: Partial<skillsApi.Skill> = {}): skillsApi.Skill => ({
  id: 's1', name: 'Serving', domainId: 'd1', archivedAt: null, createdAt: '', ...over,
})

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(skillsApi.listSkills).mockResolvedValue([])
})

describe('DomainDetailPage — Domain header', () => {
  it('fetches the Domain by id and displays its name and accessibility', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(ownedDomain)

    renderPage()

    expect(await screen.findByRole('heading', { name: /roundnet/i })).toBeInTheDocument()
    expect(screen.getByText(/public/i)).toBeInTheDocument()
    expect(domainsApi.getDomain).toHaveBeenCalledWith('d1')
  })

  it('lets the owner edit the Domain name inline and persists via updateDomain', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue({ ...ownedDomain, name: 'Old name' })
    vi.mocked(domainsApi.updateDomain).mockResolvedValue({ ...ownedDomain, name: 'New name' })

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /edit name/i }))
    const input = screen.getByLabelText(/^name$/i)
    await userEvent.clear(input)
    await userEvent.type(input, 'New name')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(domainsApi.updateDomain).toHaveBeenCalledWith('d1', { name: 'New name' })
      expect(screen.getByRole('heading', { name: /new name/i })).toBeInTheDocument()
    })
  })

  it('does not show the Edit name button when the caller is not the Domain owner', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(otherDomain)

    renderPage()

    expect(await screen.findByRole('heading', { name: /theirs/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit name/i })).not.toBeInTheDocument()
  })
})

describe('DomainDetailPage — Skills list', () => {
  it('lists the Domain\'s active Skills', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(ownedDomain)
    vi.mocked(skillsApi.listSkills).mockResolvedValue([
      skill({ id: 's1', name: 'Serving' }),
      skill({ id: 's2', name: 'Defense' }),
    ])

    renderPage()

    expect(await screen.findByText('Serving')).toBeInTheDocument()
    expect(screen.getByText('Defense')).toBeInTheDocument()
    expect(skillsApi.listSkills).toHaveBeenCalledWith('d1', {})
  })

  it('lets the owner create a new Skill via the inline form', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(ownedDomain)
    vi.mocked(skillsApi.listSkills).mockResolvedValue([])
    vi.mocked(skillsApi.createSkill).mockResolvedValue(skill({ id: 's1', name: 'Serving' }))

    renderPage()

    await screen.findByRole('heading', { name: /roundnet/i })

    const input = await screen.findByLabelText(/new skill/i)
    await userEvent.type(input, 'Serving')
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => {
      expect(skillsApi.createSkill).toHaveBeenCalledWith('d1', 'Serving')
      expect(screen.getByText('Serving')).toBeInTheDocument()
    })
  })

  it('does not show the add form to non-owners', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(otherDomain)
    vi.mocked(skillsApi.listSkills).mockResolvedValue([skill({ name: 'A skill' })])

    renderPage()

    expect(await screen.findByText('A skill')).toBeInTheDocument()
    expect(screen.queryByLabelText(/new skill/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^archive$/i })).not.toBeInTheDocument()
  })

  it('lets the owner rename a Skill inline', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(ownedDomain)
    vi.mocked(skillsApi.listSkills).mockResolvedValue([skill({ id: 's1', name: 'Old' })])
    vi.mocked(skillsApi.renameSkill).mockResolvedValue(skill({ id: 's1', name: 'New' }))

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /rename Old/i }))
    const input = screen.getByLabelText(/rename skill/i)
    await userEvent.clear(input)
    await userEvent.type(input, 'New')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(skillsApi.renameSkill).toHaveBeenCalledWith('d1', 's1', 'New')
      expect(screen.getByText('New')).toBeInTheDocument()
    })
  })

  it('archives a Skill after confirming, and removes it from the active list', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(ownedDomain)
    vi.mocked(skillsApi.listSkills).mockResolvedValue([skill({ id: 's1', name: 'Serving' })])
    vi.mocked(skillsApi.archiveSkill).mockResolvedValue(undefined)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /archive Serving/i }))

    await waitFor(() => {
      expect(skillsApi.archiveSkill).toHaveBeenCalledWith('d1', 's1')
      expect(screen.queryByText('Serving')).not.toBeInTheDocument()
    })
    confirmSpy.mockRestore()
  })

  it('does not archive when the user cancels the confirm dialog', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(ownedDomain)
    vi.mocked(skillsApi.listSkills).mockResolvedValue([skill({ id: 's1', name: 'Serving' })])
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /archive Serving/i }))

    expect(skillsApi.archiveSkill).not.toHaveBeenCalled()
    expect(screen.getByText('Serving')).toBeInTheDocument()
    confirmSpy.mockRestore()
  })

  it('toggles archived Skills into view and lets the owner restore them', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(ownedDomain)
    vi.mocked(skillsApi.listSkills)
      .mockResolvedValueOnce([skill({ id: 's1', name: 'Active' })])
      .mockResolvedValueOnce([
        skill({ id: 's1', name: 'Active' }),
        skill({ id: 's2', name: 'Old', archivedAt: '2026-01-01T00:00:00Z' }),
      ])
    vi.mocked(skillsApi.restoreSkill).mockResolvedValue(skill({ id: 's2', name: 'Old' }))

    renderPage()

    await screen.findByText('Active')
    await userEvent.click(screen.getByRole('button', { name: /show archived/i }))

    expect(await screen.findByText('Old')).toBeInTheDocument()
    expect(skillsApi.listSkills).toHaveBeenLastCalledWith('d1', { includeArchived: true })

    await userEvent.click(screen.getByRole('button', { name: /restore Old/i }))
    await waitFor(() => {
      expect(skillsApi.restoreSkill).toHaveBeenCalledWith('d1', 's2')
    })
  })
})
