import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createDomain } from '../api/domains'

type AccessibilityState = 'public' | 'protected' | 'private'

export default function CreateDomainPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [accessibilityState, setAccessibilityState] = useState<AccessibilityState>('public')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    try {
      const domain = await createDomain({ name, accessibilityState })
      navigate(`/library/${domain.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create Domain')
    }
  }

  return (
    <main className="p-4 flex flex-col gap-5 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-brand-darkest dark:text-brand-lightest">New Domain</h1>
      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1">
          <span>Name</span>
          <input
            type="text"
            name="name"
            className="border rounded p-2"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>Accessibility</span>
          <select
            name="accessibility"
            className="border rounded p-2"
            value={accessibilityState}
            onChange={e => setAccessibilityState(e.target.value as AccessibilityState)}
          >
            <option value="public">Public</option>
            <option value="protected">Protected</option>
            <option value="private">Private</option>
          </select>
        </label>
        <button type="submit" className="rounded bg-brand-accent text-white py-2">Create</button>
      </form>
    </main>
  )
}
