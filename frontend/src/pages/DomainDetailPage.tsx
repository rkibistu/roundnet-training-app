import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDomain, updateDomain, fractureDomain, type Domain } from '../api/domains'
import {
  listSkills,
  createSkill,
  renameSkill,
  archiveSkill,
  restoreSkill,
  type Skill,
} from '../api/skills'
import { useAuthContext } from '../context/AuthContext'

export default function DomainDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { player } = useAuthContext()
  const [domain, setDomain] = useState<Domain | null>(null)
  const [fracturing, setFracturing] = useState(false)
  const [fractureName, setFractureName] = useState('')
  const [editingDomainName, setEditingDomainName] = useState(false)
  const [draftDomainName, setDraftDomainName] = useState('')

  const [draftAccessibility, setDraftAccessibility] = useState<'protected' | 'private'>('protected')

  const [skills, setSkills] = useState<Skill[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [newSkillName, setNewSkillName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  useEffect(() => {
    if (!id) return
    getDomain(id).then(d => {
      setDomain(d)
      if (d.accessibilityState !== 'public') {
        setDraftAccessibility(d.accessibilityState as 'protected' | 'private')
      }
    })
  }, [id])

  useEffect(() => {
    if (!id) return
    listSkills(id, showArchived ? { includeArchived: true } : {}).then(setSkills)
  }, [id, showArchived])

  if (!domain) return null

  const isOwner = player?.id === domain.ownerId

  async function handleSaveDomainName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!domain) return
    const updated = await updateDomain(domain.id, { name: draftDomainName })
    setDomain(updated)
    setEditingDomainName(false)
  }

  async function handleSaveAccessibility(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!domain) return
    const updated = await updateDomain(domain.id, { accessibilityState: draftAccessibility })
    setDomain(updated)
  }

  async function handleAddSkill(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!domain) return
    const trimmed = newSkillName.trim()
    if (!trimmed) return
    const created = await createSkill(domain.id, trimmed)
    setSkills(prev => [...prev, created])
    setNewSkillName('')
  }

  async function handleSaveRename(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!domain || !renamingId) return
    const trimmed = renameDraft.trim()
    if (!trimmed) return
    const updated = await renameSkill(domain.id, renamingId, trimmed)
    setSkills(prev => prev.map(s => (s.id === updated.id ? updated : s)))
    setRenamingId(null)
  }

  async function handleArchive(s: Skill) {
    if (!domain) return
    if (!window.confirm(`Archive "${s.name}"? Its XP stays with the Domain but it will be hidden from the list. You can restore it later.`)) return
    await archiveSkill(domain.id, s.id)
    setSkills(prev => prev.filter(x => x.id !== s.id))
  }

  async function handleRestore(s: Skill) {
    if (!domain) return
    const restored = await restoreSkill(domain.id, s.id)
    setSkills(prev => prev.map(x => (x.id === s.id ? restored : x)))
  }

  async function handleFractureConfirm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!domain) return
    const newDomain = await fractureDomain(domain.id, { name: fractureName })
    navigate(`/library/${newDomain.id}`)
  }

  const activeSkills = skills.filter(s => !s.archivedAt)
  const archivedSkills = skills.filter(s => !!s.archivedAt)

  return (
    <main className="p-4 flex flex-col gap-5 max-w-lg mx-auto">
      {editingDomainName ? (
        <form onSubmit={handleSaveDomainName} className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span>Name</span>
            <input
              type="text"
              className="border rounded p-2"
              value={draftDomainName}
              onChange={e => setDraftDomainName(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="rounded bg-brand-accent text-white px-3 py-1">Save</button>
            <button type="button" onClick={() => setEditingDomainName(false)} className="rounded border px-3 py-1">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-darkest dark:text-brand-lightest">{domain.name}</h1>
          {isOwner && (
            <button
              type="button"
              className="text-sm text-brand-accent"
              onClick={() => { setDraftDomainName(domain.name); setEditingDomainName(true) }}
            >
              Edit name
            </button>
          )}
        </div>
      )}
      {!isOwner && (
        fracturing ? (
          <form onSubmit={handleFractureConfirm} className="flex flex-col gap-2 border rounded p-3">
            <p className="text-sm">This creates an independent copy. Changes to the original will not affect your copy.</p>
            <label className="flex flex-col gap-1">
              <span className="text-sm">Name</span>
              <input
                type="text"
                className="border rounded p-2"
                value={fractureName}
                onChange={e => setFractureName(e.target.value)}
              />
            </label>
            <div className="flex gap-2">
              <button type="submit" className="rounded bg-brand-accent text-white px-3 py-1">Confirm</button>
              <button type="button" onClick={() => setFracturing(false)} className="rounded border px-3 py-1">Cancel</button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="self-start rounded border px-3 py-1 text-sm"
            onClick={() => { setFractureName(domain.name); setFracturing(true) }}
          >
            Fracture
          </button>
        )
      )}

      {domain.accessibilityState === 'public' ? (
        <div className="flex flex-col gap-1">
          <span className="text-sm uppercase tracking-wide text-brand-dark dark:text-brand-light">public</span>
          {isOwner && (
            <p className="text-xs text-brand-dark dark:text-brand-light">
              Public Domains are permanent and cannot change accessibility state.
            </p>
          )}
        </div>
      ) : isOwner ? (
        <form onSubmit={handleSaveAccessibility} className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm">Accessibility state</span>
            <select
              aria-label="Accessibility state"
              className="border rounded p-2"
              value={draftAccessibility || domain.accessibilityState}
              onChange={e => setDraftAccessibility(e.target.value as 'protected' | 'private')}
            >
              <option value="protected">protected</option>
              <option value="private">private</option>
            </select>
          </label>
          <button type="submit" aria-label="Save accessibility" className="self-start rounded bg-brand-accent text-white px-3 py-1">Save</button>
        </form>
      ) : (
        <p className="text-sm uppercase tracking-wide text-brand-dark dark:text-brand-light">{domain.accessibilityState}</p>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Skills</h2>
          {isOwner && (
            <button
              type="button"
              className="text-sm text-brand-accent"
              onClick={() => setShowArchived(v => !v)}
            >
              {showArchived ? 'Hide archived' : 'Show archived'}
            </button>
          )}
        </div>

        <ul className="flex flex-col gap-2">
          {activeSkills.map(s => (
            <li key={s.id} className="flex items-center gap-2 border rounded p-2">
              {renamingId === s.id ? (
                <form onSubmit={handleSaveRename} className="flex flex-1 items-center gap-2">
                  <label className="sr-only" htmlFor={`rename-${s.id}`}>Rename skill</label>
                  <input
                    id={`rename-${s.id}`}
                    type="text"
                    className="border rounded p-1 flex-1"
                    value={renameDraft}
                    onChange={e => setRenameDraft(e.target.value)}
                  />
                  <button type="submit" className="rounded bg-brand-accent text-white px-2 py-1 text-sm">Save</button>
                  <button type="button" onClick={() => setRenamingId(null)} className="rounded border px-2 py-1 text-sm">Cancel</button>
                </form>
              ) : (
                <>
                  <span className="flex-1">{s.name}</span>
                  {isOwner && (
                    <>
                      <button
                        type="button"
                        className="text-sm text-brand-accent"
                        aria-label={`Rename ${s.name}`}
                        onClick={() => { setRenamingId(s.id); setRenameDraft(s.name) }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="text-sm text-red-600"
                        aria-label={`Archive ${s.name}`}
                        onClick={() => handleArchive(s)}
                      >
                        Archive
                      </button>
                    </>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>

        {isOwner && (
          <form onSubmit={handleAddSkill} className="flex gap-2">
            <label className="flex-1">
              <span className="sr-only">New skill name</span>
              <input
                type="text"
                aria-label="New skill name"
                placeholder="New skill"
                className="border rounded p-2 w-full"
                value={newSkillName}
                onChange={e => setNewSkillName(e.target.value)}
              />
            </label>
            <button type="submit" className="rounded bg-brand-accent text-white px-3 py-1">Add</button>
          </form>
        )}

        {showArchived && archivedSkills.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm uppercase tracking-wide text-brand-dark dark:text-brand-light">Archived</h3>
            <ul className="flex flex-col gap-2">
              {archivedSkills.map(s => (
                <li key={s.id} className="flex items-center gap-2 border rounded p-2 opacity-60">
                  <span className="flex-1">{s.name}</span>
                  {isOwner && (
                    <button
                      type="button"
                      className="text-sm text-brand-accent"
                      aria-label={`Restore ${s.name}`}
                      onClick={() => handleRestore(s)}
                    >
                      Restore
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  )
}
