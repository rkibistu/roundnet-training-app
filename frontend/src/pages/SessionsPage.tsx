import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { listDomains, type Domain } from '../api/domains'
import { listSkills, type Skill } from '../api/skills'
import { createSession, addEntry } from '../api/sessions'
import { useAuthContext } from '../context/AuthContext'

type Step = 'pick-domain' | 'log-entries'

interface PendingEntry {
  skillId: string
  skillName: string
  durationMinutes: number
  qualityScore: number
}

export default function SessionsPage() {
  const navigate = useNavigate()
  const { player } = useAuthContext()

  const [step, setStep] = useState<Step>('pick-domain')
  const [ownedDomains, setOwnedDomains] = useState<Domain[]>([])
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [entries, setEntries] = useState<PendingEntry[]>([])

  const [selectedSkillId, setSelectedSkillId] = useState('')
  const [duration, setDuration] = useState('')
  const [quality, setQuality] = useState('3')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listDomains().then(domains => {
      setOwnedDomains(domains.filter(d => d.ownerId === player?.id))
    })
  }, [player?.id])

  useEffect(() => {
    if (!selectedDomain) return
    listSkills(selectedDomain.id).then(s => {
      const active = s.filter(sk => sk.archivedAt === null)
      setSkills(active)
      setSelectedSkillId(active[0]?.id ?? '')
    })
  }, [selectedDomain])

  function handleDomainSelect(domain: Domain) {
    setSelectedDomain(domain)
    setStep('log-entries')
  }

  function handleAddEntry(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const skill = skills.find(s => s.id === selectedSkillId)
    if (!skill || !duration) return
    setEntries(prev => [
      ...prev,
      {
        skillId: skill.id,
        skillName: skill.name,
        durationMinutes: parseInt(duration, 10),
        qualityScore: parseInt(quality, 10),
      },
    ])
    setDuration('')
    setQuality('3')
  }

  async function handleSave() {
    if (!selectedDomain || entries.length === 0) return
    setSaving(true)
    setError(null)
    try {
      const session = await createSession(selectedDomain.id)
      for (const entry of entries) {
        await addEntry(session.id, {
          skillId: entry.skillId,
          durationMinutes: entry.durationMinutes,
          qualityScore: entry.qualityScore,
        })
      }
      navigate(`/sessions/${session.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save session')
    } finally {
      setSaving(false)
    }
  }

  if (step === 'pick-domain') {
    return (
      <main className="p-4 flex flex-col gap-5 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-brand-darkest dark:text-brand-lightest">Log Session</h1>
        <p className="text-sm text-brand-dark dark:text-brand-light">Choose a Domain to log against:</p>
        {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
        {ownedDomains.length === 0 ? (
          <p className="text-sm text-brand-dark dark:text-brand-light">
            You don't own any Domains yet.{' '}
            <button
              type="button"
              className="underline text-brand-mid"
              onClick={() => navigate('/library/new')}
            >
              Create one
            </button>
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ownedDomains.map(d => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => handleDomainSelect(d)}
                  className="w-full text-left rounded-2xl bg-white dark:bg-brand-dark shadow p-4 hover:ring-2 hover:ring-brand-accent transition-all"
                >
                  <span className="font-semibold text-brand-darkest dark:text-brand-lightest">{d.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    )
  }

  return (
    <main className="p-4 flex flex-col gap-5 max-w-lg mx-auto">
      <button
        type="button"
        onClick={() => { setStep('pick-domain'); setEntries([]) }}
        className="self-start flex items-center gap-1 text-sm font-medium text-brand-mid hover:text-brand-dark min-h-[44px] transition-colors"
      >
        ← {selectedDomain?.name}
      </button>

      <h1 className="text-2xl font-bold text-brand-darkest dark:text-brand-lightest">Log Session</h1>

      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}

      <section className="rounded-2xl bg-white dark:bg-brand-dark shadow p-6 flex flex-col gap-4">
        <h2 className="font-semibold text-brand-darkest dark:text-brand-lightest">Add Entry</h2>
        <form className="flex flex-col gap-3" onSubmit={handleAddEntry}>
          <label className="flex flex-col gap-1 text-sm">
            <span>Skill</span>
            <select
              className="border rounded p-2"
              value={selectedSkillId}
              onChange={e => setSelectedSkillId(e.target.value)}
            >
              {skills.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Duration (minutes)</span>
            <input
              type="number"
              min="1"
              className="border rounded p-2"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Quality (1–5)</span>
            <select
              className="border rounded p-2"
              value={quality}
              onChange={e => setQuality(e.target.value)}
            >
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button
            type="submit"
            disabled={!selectedSkillId || !duration}
            className="rounded bg-brand-accent text-white py-2 disabled:opacity-50"
          >
            + Add Entry
          </button>
        </form>
      </section>

      {entries.length > 0 && (
        <section className="rounded-2xl bg-white dark:bg-brand-dark shadow p-6 flex flex-col gap-3">
          <h2 className="font-semibold text-brand-darkest dark:text-brand-lightest">Entries</h2>
          <ul className="flex flex-col gap-2">
            {entries.map((e, i) => (
              <li key={i} className="text-sm text-brand-dark dark:text-brand-light flex justify-between">
                <span>{e.skillName}</span>
                <span>{e.durationMinutes} min · Q{e.qualityScore}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-brand-accent text-white py-2 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Session'}
          </button>
        </section>
      )}
    </main>
  )
}
