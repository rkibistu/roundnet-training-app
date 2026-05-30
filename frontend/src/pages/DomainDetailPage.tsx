import { useEffect, useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getDomain,
  updateDomain,
  fractureDomain,
  listDomains,
  attuneDomain,
  listSkillPairs,
  createSkillPair,
  deleteSkillPair,
  type Domain,
  type SkillPair,
} from '../api/domains'
import {
  listSkills,
  createSkill,
  renameSkill,
  archiveSkill,
  restoreSkill,
  SkillHasPairError,
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
  const [pendingRenameBreakPair, setPendingRenameBreakPair] = useState<{ skillId: string; name: string } | null>(null)

  const [attuning, setAttuning] = useState(false)
  const [attuneError, setAttuneError] = useState<string | null>(null)
  const [attunement, setAttunement] = useState<{ rootDomainId: string } | null>(null)
  const [rootDomain, setRootDomain] = useState<Domain | null>(null)
  const [rootSkills, setRootSkills] = useState<Skill[]>([])
  const [pairs, setPairs] = useState<SkillPair[]>([])
  const [showPairingUI, setShowPairingUI] = useState(false)
  const [pendingPairs, setPendingPairs] = useState<Map<string, string>>(new Map())
  const [allDomains, setAllDomains] = useState<Domain[]>([])
  const [selectedTargetId, setSelectedTargetId] = useState<string>('')

  useEffect(() => {
    if (!id) return
    getDomain(id).then(d => {
      setDomain(d)
      if (d.accessibilityState !== 'public') {
        setDraftAccessibility(d.accessibilityState as 'protected' | 'private')
      }
      if (d.rootDomainId) {
        setAttunement({ rootDomainId: d.rootDomainId })
      }
    })
  }, [id])

  useEffect(() => {
    if (!id) return
    listSkills(id, showArchived ? { includeArchived: true } : {}).then(setSkills)
  }, [id, showArchived])

  useEffect(() => {
    if (!id) return
    listSkillPairs(id).then(setPairs)
  }, [id])

  useEffect(() => {
    if (!attunement) return
    getDomain(attunement.rootDomainId).then(setRootDomain)
    listSkills(attunement.rootDomainId, {}).then(setRootSkills)
  }, [attunement])

  useEffect(() => {
    if (!attuning) return
    listDomains().then(ds => setAllDomains(ds))
  }, [attuning])

  if (!domain) return null

  const isOwner = player?.id === domain.ownerId
  const isAttuned = !!attunement

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
    try {
      const updated = await renameSkill(domain.id, renamingId, trimmed)
      setSkills(prev => prev.map(s => (s.id === updated.id ? updated : s)))
      setRenamingId(null)
    } catch (err) {
      if (err instanceof SkillHasPairError) {
        setPendingRenameBreakPair({ skillId: renamingId, name: trimmed })
      } else {
        throw err
      }
    }
  }

  async function handleBreakPairDecision(breakPair: boolean) {
    if (!domain || !pendingRenameBreakPair) return
    const updated = await renameSkill(domain.id, pendingRenameBreakPair.skillId, pendingRenameBreakPair.name, breakPair)
    setSkills(prev => prev.map(s => (s.id === updated.id ? updated : s)))
    if (breakPair) {
      setPairs(prev => prev.filter(p => p.playerDomainSkillId !== pendingRenameBreakPair.skillId))
    }
    setPendingRenameBreakPair(null)
    setRenamingId(null)
  }

  async function handleArchive(s: Skill) {
    if (!domain) return
    if (!window.confirm(`Archive "${s.name}"? Its XP stays with the Domain but it will be hidden from the list. You can restore it later.`)) return
    await archiveSkill(domain.id, s.id)
    setSkills(prev => prev.filter(x => x.id !== s.id))
    setPairs(prev => prev.filter(p => p.playerDomainSkillId !== s.id))
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

  async function handleAttuneConfirm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!domain) return
    setAttuneError(null)
    try {
      const result = await attuneDomain(domain.id, selectedTargetId || undefined)
      if (!selectedTargetId) {
        navigate(`/library/${result.id}`)
      } else {
        navigate(`/library/${selectedTargetId}`)
      }
    } catch (err) {
      setAttuneError(err instanceof Error ? err.message : 'Failed to attune')
    }
  }

  async function handleAttuneCopy() {
    if (!domain) return
    setAttuneError(null)
    try {
      const result = await attuneDomain(domain.id)
      navigate(`/library/${result.id}`)
    } catch (err) {
      setAttuneError(err instanceof Error ? err.message : 'Failed to attune')
    }
  }

  async function handleSavePairs(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!domain) return
    const existingPairMap = new Map(pairs.map(p => [p.playerDomainSkillId, p]))
    const toAdd: [string, string][] = []
    const toRemove: string[] = []

    for (const [playerSkillId, rootSkillId] of pendingPairs) {
      if (!existingPairMap.has(playerSkillId)) {
        toAdd.push([playerSkillId, rootSkillId])
      } else if (existingPairMap.get(playerSkillId)?.rootDomainSkillId !== rootSkillId) {
        toRemove.push(existingPairMap.get(playerSkillId)!.id)
        toAdd.push([playerSkillId, rootSkillId])
      }
    }

    for (const pairId of toRemove) {
      await deleteSkillPair(domain.id, pairId)
    }
    const newPairs = await Promise.all(toAdd.map(([p, r]) => createSkillPair(domain.id, p, r)))
    const updatedPairs = pairs
      .filter(p => !toRemove.includes(p.id))
      .concat(newPairs)
    setPairs(updatedPairs)
    setShowPairingUI(false)
  }

  function handleTogglePair(playerSkillId: string, rootSkillId: string) {
    setPendingPairs(prev => {
      const next = new Map(prev)
      if (next.get(playerSkillId) === rootSkillId) {
        next.delete(playerSkillId)
      } else {
        next.set(playerSkillId, rootSkillId)
      }
      return next
    })
  }

  const activeSkills = skills.filter(s => !s.archivedAt)
  const archivedSkills = skills.filter(s => !!s.archivedAt)
  const pairedSkillIds = new Set(pairs.map(p => p.playerDomainSkillId))
  const callerDomains = allDomains.filter(d => d.ownerId === player?.id)
  const hasCallerDomains = callerDomains.length > 0

  return (
    <main className="p-4 flex flex-col gap-5 max-w-2xl mx-auto">
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
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-brand-darkest dark:text-brand-lightest">{domain.name}</h1>
          {!domain.rootDomainId && !isOwner && (
            <span className="text-xs font-medium uppercase tracking-wide bg-brand-accent/10 text-brand-accent rounded px-2 py-0.5">Root Domain</span>
          )}
          {isOwner && isAttuned && rootDomain && (
            <span className="text-xs text-brand-dark dark:text-brand-light">Attuned to: <strong>{rootDomain.name}</strong></span>
          )}
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
        <>
          {fracturing ? (
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
          ) : attuning ? (
            <div className="flex flex-col gap-2 border rounded p-3">
              <p className="text-sm">Join this Domain's leaderboard group by attuning to it.</p>
              {!hasCallerDomains ? (
                <>
                  {attuneError && <p className="text-sm text-red-600">{attuneError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded bg-brand-accent text-white px-3 py-1"
                      onClick={handleAttuneCopy}
                    >
                      Attune (create copy)
                    </button>
                    <button type="button" onClick={() => setAttuning(false)} className="rounded border px-3 py-1">Cancel</button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleAttuneConfirm} className="flex flex-col gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm">Your Domain</span>
                    <select
                      aria-label="Your domain to attune"
                      className="border rounded p-2"
                      value={selectedTargetId}
                      onChange={e => setSelectedTargetId(e.target.value)}
                    >
                      <option value="">Attune (create copy)</option>
                      {callerDomains.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </label>
                  {attuneError && <p className="text-sm text-red-600">{attuneError}</p>}
                  <div className="flex gap-2">
                    <button type="submit" className="rounded bg-brand-accent text-white px-3 py-1">Attune</button>
                    <button type="button" onClick={() => setAttuning(false)} className="rounded border px-3 py-1">Cancel</button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                className="self-start rounded border px-3 py-1 text-sm"
                onClick={() => { setFractureName(domain.name); setFracturing(true) }}
              >
                Fracture
              </button>
              <button
                type="button"
                className="self-start rounded border px-3 py-1 text-sm"
                onClick={() => setAttuning(true)}
              >
                Attune
              </button>
            </div>
          )}
        </>
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

      {pendingRenameBreakPair && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
          <div className="bg-white dark:bg-gray-900 rounded p-6 flex flex-col gap-4 max-w-sm w-full mx-4">
            <p className="font-semibold">This Skill has a pair. What would you like to do?</p>
            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 rounded bg-brand-accent text-white px-3 py-2"
                onClick={() => handleBreakPairDecision(false)}
              >
                Keep pair
              </button>
              <button
                type="button"
                className="flex-1 rounded border border-red-500 text-red-600 px-3 py-2"
                onClick={() => handleBreakPairDecision(true)}
              >
                Break pair
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Skills</h2>
          <div className="flex gap-2">
            {isOwner && isAttuned && (
              <button
                type="button"
                className="text-sm text-brand-accent"
                onClick={() => {
                  setPendingPairs(new Map(pairs.map(p => [p.playerDomainSkillId, p.rootDomainSkillId])))
                  setShowPairingUI(v => !v)
                }}
              >
                {showPairingUI ? 'Hide pairing' : 'Manage pairs'}
              </button>
            )}
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
        </div>

        {showPairingUI && rootDomain && (
          <form onSubmit={handleSavePairs} className="flex flex-col gap-3 border rounded p-3">
            <p className="text-sm text-brand-dark dark:text-brand-light">Click a root Skill to pair it with your Skill.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Your Skills</h3>
                <ul className="flex flex-col gap-1">
                  {activeSkills.map(s => {
                    const pairedRootId = pendingPairs.get(s.id)
                    return (
                      <li key={s.id} className={`rounded border p-2 text-sm ${pairedRootId ? '' : 'opacity-60'}`}>
                        <span>{s.name}</span>
                        {pairedRootId && (
                          <span className="ml-2 text-xs text-brand-accent">paired</span>
                        )}
                        {!pairedRootId && (
                          <span className="ml-2 text-xs text-gray-400">not paired — counts toward Domain Level only</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">{rootDomain.name} Skills</h3>
                <ul className="flex flex-col gap-1">
                  {rootSkills.map(rs => {
                    const pairedPlayerSkillId = [...pendingPairs.entries()].find(([, v]) => v === rs.id)?.[0]
                    return (
                      <li key={rs.id} className="rounded border p-2 text-sm">
                        <span>{rs.name}</span>
                        {pairedPlayerSkillId && (
                          <span className="ml-2 text-xs text-brand-accent">
                            ← {activeSkills.find(s => s.id === pairedPlayerSkillId)?.name}
                          </span>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {activeSkills.map(s => (
                            <button
                              key={s.id}
                              type="button"
                              aria-label={`Pair ${s.name} with ${rs.name}`}
                              className={`text-xs rounded px-2 py-0.5 border ${pendingPairs.get(s.id) === rs.id ? 'bg-brand-accent text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                              onClick={() => handleTogglePair(s.id, rs.id)}
                            >
                              {s.name}
                            </button>
                          ))}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="rounded bg-brand-accent text-white px-3 py-1 text-sm">Save pairs</button>
              <button type="button" onClick={() => setShowPairingUI(false)} className="rounded border px-3 py-1 text-sm">Cancel</button>
            </div>
          </form>
        )}

        <ul className="flex flex-col gap-2">
          {activeSkills.map(s => {
            const isPaired = pairedSkillIds.has(s.id)
            return (
              <li key={s.id} className={`flex items-center gap-2 border rounded p-2 ${isPaired ? '' : 'opacity-70'}`}>
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
                    {!isPaired && isAttuned && (
                      <span className="text-xs text-gray-400">not paired — counts toward Domain Level only</span>
                    )}
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
            )
          })}
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
