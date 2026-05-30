import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import DomainDetailPage from './DomainDetailPage'
import * as domainsApi from '../api/domains'
import * as skillsApi from '../api/skills'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

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
  vi.mocked(domainsApi.listSkillPairs).mockResolvedValue([])
  vi.mocked(domainsApi.listDomains).mockResolvedValue([])
  mockNavigate.mockReset()
})

describe('DomainDetailPage — Domain header', () => {
  it('fetches the Domain by id and displays its name and accessibility', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(ownedDomain)

    renderPage()

    expect(await screen.findByRole('heading', { name: /roundnet/i })).toBeInTheDocument()
    expect(screen.getByText(/^public$/i)).toBeInTheDocument()
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

describe('DomainDetailPage — Accessibility state panel', () => {
  it('shows a read-only public badge with a permanence hint for a public Domain the owner owns', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(ownedDomain)

    renderPage()

    await screen.findByRole('heading', { name: /roundnet/i })
    expect(screen.getByText(/^public$/i)).toBeInTheDocument()
    expect(screen.getByText(/permanent/i)).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /accessibility/i })).not.toBeInTheDocument()
  })

  it('shows a selector for the owner of a protected Domain to switch to private', async () => {
    const protectedDomain = { ...ownedDomain, accessibilityState: 'protected' as const }
    vi.mocked(domainsApi.getDomain).mockResolvedValue(protectedDomain)
    vi.mocked(domainsApi.updateDomain).mockResolvedValue({ ...protectedDomain, accessibilityState: 'private' })

    renderPage()

    const select = await screen.findByRole('combobox', { name: /accessibility/i })
    expect(select).toBeInTheDocument()
    expect(screen.queryByText(/permanent/i)).not.toBeInTheDocument()

    await userEvent.selectOptions(select, 'private')
    await screen.findByRole('button', { name: /save accessibility/i })
    await userEvent.click(screen.getByRole('button', { name: /save accessibility/i }))

    await waitFor(() => {
      expect(domainsApi.updateDomain).toHaveBeenCalledWith('d1', { accessibilityState: 'private' })
    })
  })

  it('shows no selector to a non-owner — only plain text', async () => {
    const protectedOther = { ...otherDomain, accessibilityState: 'protected' as const }
    vi.mocked(domainsApi.getDomain).mockResolvedValue(protectedOther)

    renderPage()

    await screen.findByRole('heading', { name: /theirs/i })
    expect(screen.queryByRole('combobox', { name: /accessibility/i })).not.toBeInTheDocument()
    expect(screen.getByText(/protected/i)).toBeInTheDocument()
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

describe('DomainDetailPage — Fracture', () => {
  it('shows a Fracture button for a Domain the caller does not own', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(otherDomain)

    renderPage()

    expect(await screen.findByRole('button', { name: /fracture/i })).toBeInTheDocument()
  })

  it('does not show the Fracture button when the caller is the owner', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(ownedDomain)

    renderPage()

    await screen.findByRole('heading', { name: /roundnet/i })
    expect(screen.queryByRole('button', { name: /fracture/i })).not.toBeInTheDocument()
  })

  it('clicking Fracture reveals an inline confirmation form with the domain name pre-filled', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(otherDomain)

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /fracture/i }))

    expect(screen.getByText(/independent copy/i)).toBeInTheDocument()
    const nameInput = screen.getByDisplayValue('Theirs')
    expect(nameInput).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('cancelling the confirmation hides the form without calling the API', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(otherDomain)

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /fracture/i }))
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(domainsApi.fractureDomain).not.toHaveBeenCalled()
    expect(screen.queryByText(/independent copy/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fracture/i })).toBeInTheDocument()
  })

  it('confirming calls fractureDomain with the (editable) name and navigates to the new domain', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(otherDomain)
    const newDomain = { ...otherDomain, id: 'new-d', ownerId: 'me', name: 'My Copy' }
    vi.mocked(domainsApi.fractureDomain).mockResolvedValue(newDomain)

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /fracture/i }))

    const nameInput = screen.getByDisplayValue('Theirs')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'My Copy')

    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))

    await waitFor(() => {
      expect(domainsApi.fractureDomain).toHaveBeenCalledWith('d1', { name: 'My Copy' })
      expect(mockNavigate).toHaveBeenCalledWith('/library/new-d')
    })
  })
})

describe('DomainDetailPage — Attune', () => {
  it('shows an Attune button for a Domain the caller does not own', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(otherDomain)

    renderPage()

    expect(await screen.findByRole('button', { name: /attune/i })).toBeInTheDocument()
  })

  it('shows only "Attune (create copy)" with no domain selector when caller owns no Domains', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(otherDomain)
    vi.mocked(domainsApi.listDomains).mockResolvedValue([])

    renderPage()

    expect(await screen.findByRole('button', { name: /attune \(create copy\)/i })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /your domain to attune/i })).not.toBeInTheDocument()
  })

  it('auto-copy attune calls attuneDomain without callerDomainId and navigates to new domain', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(otherDomain)
    vi.mocked(domainsApi.listDomains).mockResolvedValue([])
    vi.mocked(domainsApi.attuneDomain).mockResolvedValue({ id: 'new-domain-id' })

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /attune \(create copy\)/i }))

    await waitFor(() => {
      expect(domainsApi.attuneDomain).toHaveBeenCalledWith('d1', undefined)
      expect(mockNavigate).toHaveBeenCalledWith('/library/new-domain-id')
    })
  })

  it('shows "Attune" button and "Attune (create copy)" option when caller owns Domains', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(otherDomain)
    vi.mocked(domainsApi.listDomains).mockResolvedValue([
      { ...ownedDomain, id: 'my-d', name: 'My Domain', ownerId: 'me' },
    ])

    renderPage()

    expect(await screen.findByRole('button', { name: /^attune$/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /attune \(create copy\)/i })).toBeInTheDocument()
  })

  it('does not show the Attune button when the caller is the owner', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(ownedDomain)

    renderPage()

    await screen.findByRole('heading', { name: /roundnet/i })
    expect(screen.queryByRole('button', { name: /^attune$/i })).not.toBeInTheDocument()
  })

  it('clicking Attune reveals a form with a domain selector', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(otherDomain)
    vi.mocked(domainsApi.listDomains).mockResolvedValue([
      { ...ownedDomain, id: 'my-d', name: 'My Domain', ownerId: 'me' },
    ])

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /^attune$/i }))

    expect(await screen.findByRole('combobox', { name: /your domain to attune/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^attune$/i })).toBeInTheDocument()
  })

  it('confirming attune calls attuneDomain and updates state', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(otherDomain)
    vi.mocked(domainsApi.listDomains).mockResolvedValue([
      { ...ownedDomain, id: 'my-d', name: 'My Domain', ownerId: 'me' },
    ])
    vi.mocked(domainsApi.attuneDomain).mockResolvedValue({
      id: 'att1', domainId: 'my-d', rootDomainId: 'd1', createdAt: '',
    })

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /^attune$/i }))
    const select = await screen.findByRole('combobox', { name: /your domain to attune/i })
    await userEvent.selectOptions(select, 'my-d')
    await userEvent.click(screen.getAllByRole('button', { name: /^attune$/i }).find(b => b.getAttribute('type') === 'submit')!)

    await waitFor(() => {
      expect(domainsApi.attuneDomain).toHaveBeenCalledWith('d1', 'my-d')
    })
  })
})

describe('DomainDetailPage — Skill pairing', () => {
  it('shows Manage pairs button when owner is attuned', async () => {
    const attuned = { ...ownedDomain, rootDomainId: 'root-d' }
    vi.mocked(domainsApi.getDomain).mockResolvedValue(attuned)
    vi.mocked(domainsApi.listSkillPairs).mockResolvedValue([])
    vi.mocked(skillsApi.listSkills).mockResolvedValue([skill({ id: 's1', name: 'Serving' })])

    renderPage()

    expect(await screen.findByRole('button', { name: /manage pairs/i })).toBeInTheDocument()
  })

  it('does not show Manage pairs for a non-owner', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue({ ...otherDomain, rootDomainId: 'root-d' })

    renderPage()

    await screen.findByRole('heading', { name: /theirs/i })
    expect(screen.queryByRole('button', { name: /manage pairs/i })).not.toBeInTheDocument()
  })

  it('shows skill pairing UI with side-by-side columns when Manage pairs clicked', async () => {
    const attuned = { ...ownedDomain, rootDomainId: 'root-d' }
    const rootDomainData = { ...otherDomain, id: 'root-d', name: 'Root Domain', ownerId: 'other' }
    vi.mocked(domainsApi.getDomain).mockImplementation(async (id) => id === 'root-d' ? rootDomainData : attuned)
    vi.mocked(skillsApi.listSkills).mockImplementation(async (domainId) =>
      domainId === 'root-d'
        ? [skill({ id: 'rs1', name: 'RootSkill', domainId: 'root-d' })]
        : [skill({ id: 's1', name: 'MySkill' })]
    )

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /manage pairs/i }))

    expect(await screen.findByText('Your Skills')).toBeInTheDocument()
    expect(screen.getByText(/root domain skills/i)).toBeInTheDocument()
    expect(screen.getAllByText('MySkill').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RootSkill').length).toBeGreaterThan(0)
  })

  it('unpaired active skills are visually distinct when domain is attuned', async () => {
    const attuned = { ...ownedDomain, rootDomainId: 'root-d' }
    vi.mocked(domainsApi.getDomain).mockResolvedValue(attuned)
    vi.mocked(skillsApi.listSkills).mockResolvedValue([skill({ id: 's1', name: 'Unpaired' })])
    vi.mocked(domainsApi.listSkillPairs).mockResolvedValue([])

    renderPage()

    const label = await screen.findByText(/not paired — counts toward Domain Level only/i)
    expect(label).toBeInTheDocument()
  })

  it('paired skills do not show the unpaired label', async () => {
    const attuned = { ...ownedDomain, rootDomainId: 'root-d' }
    vi.mocked(domainsApi.getDomain).mockResolvedValue(attuned)
    vi.mocked(skillsApi.listSkills).mockResolvedValue([skill({ id: 's1', name: 'Paired' })])
    vi.mocked(domainsApi.listSkillPairs).mockResolvedValue([
      { id: 'p1', playerDomainSkillId: 's1', rootDomainSkillId: 'rs1', createdAt: '' },
    ])

    renderPage()

    await screen.findByText('Paired')
    expect(screen.queryByText(/not paired — counts toward Domain Level only/i)).not.toBeInTheDocument()
  })
})

describe('DomainDetailPage — Skill rename with pair', () => {
  it('shows a modal asking to keep or break the pair when the skill has a pair', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(ownedDomain)
    vi.mocked(skillsApi.listSkills).mockResolvedValue([skill({ id: 's1', name: 'Old' })])
    const pairError = new skillsApi.SkillHasPairError()
    vi.mocked(skillsApi.renameSkill).mockRejectedValueOnce(pairError)
    vi.mocked(skillsApi.renameSkill).mockResolvedValue(skill({ id: 's1', name: 'New' }))

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /rename Old/i }))
    const input = screen.getByLabelText(/rename skill/i)
    await userEvent.clear(input)
    await userEvent.type(input, 'New')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(await screen.findByText(/this skill has a pair/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /keep pair/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /break pair/i })).toBeInTheDocument()
  })

  it('choosing keep pair calls renameSkill with breakPair false', async () => {
    vi.mocked(domainsApi.getDomain).mockResolvedValue(ownedDomain)
    vi.mocked(skillsApi.listSkills).mockResolvedValue([skill({ id: 's1', name: 'Old' })])
    const pairError = new skillsApi.SkillHasPairError()
    vi.mocked(skillsApi.renameSkill).mockRejectedValueOnce(pairError)
    vi.mocked(skillsApi.renameSkill).mockResolvedValue(skill({ id: 's1', name: 'New' }))

    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /rename Old/i }))
    const input = screen.getByLabelText(/rename skill/i)
    await userEvent.clear(input)
    await userEvent.type(input, 'New')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await screen.findByText(/this skill has a pair/i)
    await userEvent.click(screen.getByRole('button', { name: /keep pair/i }))

    await waitFor(() => {
      expect(skillsApi.renameSkill).toHaveBeenCalledWith('d1', 's1', 'New', false)
    })
  })
})
