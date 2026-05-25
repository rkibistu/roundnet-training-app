import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getSession, type Session } from '../api/sessions'

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getSession(id).then(setSession).catch(err => {
      setError(err instanceof Error ? err.message : 'Failed to load session')
    })
  }, [id])

  if (error) {
    return (
      <main className="p-4 flex flex-col gap-5 max-w-lg mx-auto">
        <p role="alert" className="text-red-600 text-sm">{error}</p>
      </main>
    )
  }

  if (!session) return null

  const totalXp = session.entries.reduce((sum, e) => sum + e.xpEarned, 0)

  return (
    <main className="p-4 flex flex-col gap-5 max-w-lg mx-auto">
      <button
        type="button"
        onClick={() => navigate('/sessions')}
        className="self-start flex items-center gap-1 text-sm font-medium text-brand-mid hover:text-brand-dark min-h-[44px] transition-colors"
      >
        ← Back
      </button>

      <div>
        <h1 className="text-2xl font-bold text-brand-darkest dark:text-brand-lightest">{session.domainName}</h1>
        <p className="text-sm text-brand-mid">{new Date(session.date).toLocaleDateString()}</p>
      </div>

      <section className="rounded-2xl bg-white dark:bg-brand-dark shadow p-6 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-brand-darkest dark:text-brand-lightest">Entries</h2>
          <span className="text-sm text-brand-mid font-medium">{totalXp.toFixed(1)} XP total</span>
        </div>
        {session.entries.length === 0 ? (
          <p className="text-sm text-brand-dark dark:text-brand-light">No entries yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-100 dark:divide-brand-mid/20">
            {session.entries.map(entry => (
              <li key={entry.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-brand-darkest dark:text-brand-lightest">{entry.skillName}</p>
                  <p className="text-xs text-brand-mid">{entry.durationMinutes} min · Quality {entry.qualityScore}</p>
                </div>
                <span className="text-sm font-semibold text-brand-accent">+{entry.xpEarned.toFixed(1)} XP</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
