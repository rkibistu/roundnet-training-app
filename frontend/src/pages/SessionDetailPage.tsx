import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSession, SessionDetail, SessionEntryDetail } from '../api/sessions'

function buildCategorySummary(entries: SessionEntryDetail[]) {
  const map = new Map<string, { totalDuration: number; totalXp: number }>()
  for (const e of entries) {
    const existing = map.get(e.categoryName) ?? { totalDuration: 0, totalXp: 0 }
    map.set(e.categoryName, {
      totalDuration: existing.totalDuration + e.durationMinutes,
      totalXp: existing.totalXp + e.xpEarned,
    })
  }
  return map
}

function QualityDots({ score }: { score: number }) {
  return (
    <span aria-label={`Quality Score: ${score}`} className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={[
            'w-2.5 h-2.5 rounded-full',
            i <= score ? 'bg-brand-mid' : 'bg-brand-lightest dark:bg-brand-darkest',
          ].join(' ')}
        />
      ))}
    </span>
  )
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const token = localStorage.getItem('jwt') ?? ''
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getSession(token, id).then(setSession).catch((e) => setError(e.message))
  }, [id])

  if (error) return <main className="p-4"><p className="text-red-600">Error: {error}</p></main>
  if (!session) return <main className="p-4"><p className="text-brand-dark dark:text-brand-light">Loading…</p></main>

  const { entries } = session
  const categorySummary = buildCategorySummary(entries)
  const totalDuration = entries.reduce((s, e) => s + e.durationMinutes, 0)
  const totalXp = entries.reduce((s, e) => s + e.xpEarned, 0)

  return (
    <main className="p-4 flex flex-col gap-5 max-w-lg mx-auto">
      <button
        type="button"
        onClick={() => navigate('/sessions')}
        className="self-start flex items-center gap-1 text-sm font-medium text-brand-mid hover:text-brand-dark min-h-[44px] transition-colors"
      >
        ← Back
      </button>

      {/* Session header card */}
      <section
        aria-label="Session header"
        className="rounded-2xl bg-white dark:bg-brand-dark shadow p-5 flex flex-col gap-3"
      >
        <h1 className="text-xl font-bold text-brand-darkest dark:text-brand-lightest">
          {session.player.nickname ?? 'Unknown'} — {session.date.slice(0, 10)}
        </h1>
        <div className="flex gap-6 text-sm text-brand-dark dark:text-brand-light">
          <span>{totalDuration} min</span>
          <span className="font-bold text-xp-gold">{totalXp.toFixed(1)} XP</span>
        </div>

        {categorySummary.size > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {Array.from(categorySummary.entries()).map(([cat, { totalXp: xp }]) => (
              <span
                key={cat}
                className="rounded-full bg-brand-lightest dark:bg-brand-darkest px-3 py-1 text-xs font-medium text-brand-darkest dark:text-brand-lightest"
              >
                {cat} · <span className="text-xp-gold">{xp.toFixed(1)} XP</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Session entries */}
      <section aria-label="Session entries" className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-brand-darkest dark:text-brand-lightest">Entries</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-brand-dark dark:text-brand-light">No entries for this session.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((e) => (
              <li
                key={e.id}
                className="rounded-2xl bg-white dark:bg-brand-dark shadow px-5 py-4 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-brand-darkest dark:text-brand-lightest">{e.exerciseName}</p>
                    <p className="text-xs text-brand-dark dark:text-brand-light">{e.categoryName}</p>
                  </div>
                  <span className="font-bold text-xp-gold text-sm whitespace-nowrap">{e.xpEarned} XP</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-brand-dark dark:text-brand-light">
                  <span>{e.durationMinutes} min</span>
                  <QualityDots score={e.qualityScore} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
