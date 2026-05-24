import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import CreateDomainPage from './CreateDomainPage'
import * as domainsApi from '../api/domains'

vi.mock('../api/domains')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderPage() {
  render(
    <MemoryRouter>
      <CreateDomainPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('CreateDomainPage', () => {
  it('renders a name field, an accessibility state selector, and a submit button', () => {
    renderPage()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/accessibility/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
  })

  it('calls createDomain with form values and navigates to /library/:id on success', async () => {
    vi.mocked(domainsApi.createDomain).mockResolvedValue({
      id: 'new-id',
      name: 'Roundnet',
      ownerId: 'me',
      accessibilityState: 'protected',
      rootDomainId: null,
      isAscended: false,
      createdAt: '2026-05-24T00:00:00.000Z',
    })

    renderPage()

    await userEvent.type(screen.getByLabelText(/name/i), 'Roundnet')
    await userEvent.selectOptions(screen.getByLabelText(/accessibility/i), 'protected')
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(domainsApi.createDomain).toHaveBeenCalledWith({ name: 'Roundnet', accessibilityState: 'protected' })
      expect(mockNavigate).toHaveBeenCalledWith('/library/new-id')
    })
  })

  it('shows an error message and does not navigate when createDomain fails', async () => {
    vi.mocked(domainsApi.createDomain).mockRejectedValue(new Error('name is required'))

    renderPage()

    await userEvent.type(screen.getByLabelText(/name/i), '   ')
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/name is required/i)
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
