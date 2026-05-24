import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { getDomain, updateDomain, type Domain } from '../api/domains'
import { useAuthContext } from '../context/AuthContext'

export default function DomainDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { player } = useAuthContext()
  const [domain, setDomain] = useState<Domain | null>(null)
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState('')

  useEffect(() => {
    if (!id) return
    getDomain(id).then(setDomain)
  }, [id])

  if (!domain) return null

  const isOwner = player?.id === domain.ownerId

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!domain) return
    const updated = await updateDomain(domain.id, { name: draftName })
    setDomain(updated)
    setEditing(false)
  }

  return (
    <main className="p-4 flex flex-col gap-5 max-w-lg mx-auto">
      {editing ? (
        <form onSubmit={handleSave} className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span>Name</span>
            <input
              type="text"
              className="border rounded p-2"
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="rounded bg-brand-accent text-white px-3 py-1">Save</button>
            <button type="button" onClick={() => setEditing(false)} className="rounded border px-3 py-1">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-darkest dark:text-brand-lightest">{domain.name}</h1>
          {isOwner && (
            <button
              type="button"
              className="text-sm text-brand-accent"
              onClick={() => { setDraftName(domain.name); setEditing(true) }}
            >
              Edit name
            </button>
          )}
        </div>
      )}
      <p className="text-sm uppercase tracking-wide text-brand-dark dark:text-brand-light">{domain.accessibilityState}</p>
    </main>
  )
}
