import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { getExercises, Exercise } from '../api/exercises'
import { createSession, getSessions, createSessionEntry, Session, SessionEntry } from '../api/sessions'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

const QUALITY_LABELS: Record<number, string> = {
  1: '😐', 2: '🙂', 3: '😊', 4: '😄', 5: '🔥',
}

export default function SessionsPage() {
  const { player } = useAuthContext()
  const token = localStorage.getItem('jwt') ?? ''
  const navigate = useNavigate()

  const [sessions, setSessions] = useState<Session[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])

  const [newDate, setNewDate] = useState(today())
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  const [entryExerciseId, setEntryExerciseId] = useState('')
  const [entryDuration, setEntryDuration] = useState('')
  const [entryQuality, setEntryQuality] = useState(3)
  const [entryResults, setEntryResults] = useState<Record<string, SessionEntry[]>>({})

  useEffect(() => {
    if (!player) return
    getSessions(token).then(setSessions)
    getExercises().then((exs) => {
      setExercises(exs)
      if (exs.length > 0) setEntryExerciseId(exs[0].id)
    })
  }, [player])

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault()
    const session = await createSession(token, newDate)
    setSessions((prev) => [session, ...prev])
    setActiveSessionId(session.id)
    setEntryResults((prev) => ({ ...prev, [session.id]: [] }))
  }

  async function handleAddEntry(e: React.FormEvent, sessionId: string) {
    e.preventDefault()
    const entry = await createSessionEntry(token, sessionId, {
      exercise_id: entryExerciseId,
      duration_minutes: Number(entryDuration),
      quality_score: entryQuality,
    })
    setEntryResults((prev) => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] ?? []), entry],
    }))
    setEntryDuration('')
  }

  return (
    <main className="p-4 flex flex-col gap-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-brand-darkest dark:text-brand-lightest">Sessions</h1>

      {/* New session */}
      <section
        aria-label="New session"
        className="rounded-2xl bg-white dark:bg-brand-dark shadow p-5 flex flex-col gap-4"
      >
        <h2 className="text-base font-semibold text-brand-darkest dark:text-brand-lightest">
          Log a new session
        </h2>
        <form onSubmit={handleCreateSession} aria-label="Create session" className="flex gap-3 items-end">
          <div className="flex flex-col gap-1 flex-1">
            <label htmlFor="session-date" className="text-sm font-medium text-brand-darkest dark:text-brand-lightest">
              Date
            </label>
            <input
              id="session-date"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
              className="min-h-[44px] rounded-lg border border-brand-light px-3 py-2 text-brand-darkest dark:text-brand-lightest bg-white dark:bg-brand-darkest outline-none focus:ring-2 focus:ring-brand-mid"
            />
          </div>
          <button
            type="submit"
            className="min-h-[44px] px-5 rounded-lg bg-brand-mid text-white font-semibold hover:bg-brand-dark transition-colors whitespace-nowrap"
          >
            Start session
          </button>
        </form>
      </section>

      {/* Active session entry form */}
      {activeSessionId && (
        <section
          aria-label="Add entry"
          className="rounded-2xl bg-white dark:bg-brand-dark shadow p-5 flex flex-col gap-4"
        >
          <h2 className="text-base font-semibold text-brand-darkest dark:text-brand-lightest">
            Add entry to session
          </h2>
          <form
            onSubmit={(e) => handleAddEntry(e, activeSessionId)}
            aria-label="Add session entry"
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="entry-exercise" className="text-sm font-medium text-brand-darkest dark:text-brand-lightest">
                Exercise
              </label>
              <select
                id="entry-exercise"
                value={entryExerciseId}
                onChange={(e) => setEntryExerciseId(e.target.value)}
                className="min-h-[44px] rounded-lg border border-brand-light px-3 py-2 text-brand-darkest dark:text-brand-lightest bg-white dark:bg-brand-darkest outline-none focus:ring-2 focus:ring-brand-mid"
              >
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.name} — {ex.category.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="entry-duration" className="text-sm font-medium text-brand-darkest dark:text-brand-lightest">
                Duration (minutes)
              </label>
              <input
                id="entry-duration"
                type="number"
                min="1"
                value={entryDuration}
                onChange={(e) => setEntryDuration(e.target.value)}
                required
                className="min-h-[44px] rounded-lg border border-brand-light px-3 py-2 text-brand-darkest dark:text-brand-lightest bg-white dark:bg-brand-darkest outline-none focus:ring-2 focus:ring-brand-mid"
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-brand-darkest dark:text-brand-lightest">
                Quality Score
              </span>
              <div className="flex gap-2" role="group" aria-label="Quality Score">
                {[1, 2, 3, 4, 5].map((q) => (
                  <button
                    key={q}
                    type="button"
                    aria-pressed={entryQuality === q}
                    onClick={() => setEntryQuality(q)}
                    className={[
                      'flex-1 min-h-[44px] rounded-lg border text-lg font-semibold transition-colors',
                      entryQuality === q
                        ? 'bg-brand-mid border-brand-mid text-white'
                        : 'border-brand-light text-brand-darkest dark:text-brand-lightest dark:border-brand-light bg-white dark:bg-brand-darkest hover:border-brand-mid',
                    ].join(' ')}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <p className="text-xs text-center text-brand-dark dark:text-brand-light">
                {QUALITY_LABELS[entryQuality]} {['', 'Poor', 'Fair', 'Good', 'Great', 'Perfect'][entryQuality]}
              </p>
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] rounded-lg bg-brand-mid text-white font-semibold hover:bg-brand-dark transition-colors"
            >
              Add entry
            </button>
          </form>

          {(entryResults[activeSessionId] ?? []).length > 0 && (
            <ul aria-label="Session entries" className="flex flex-col gap-2 mt-2">
              {(entryResults[activeSessionId] ?? []).map((entry) => {
                const ex = exercises.find((e) => e.id === entry.exerciseId)
                return (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg bg-brand-lightest dark:bg-brand-darkest px-4 py-3 text-sm"
                  >
                    <span className="text-brand-darkest dark:text-brand-lightest">
                      {ex?.name ?? entry.exerciseId} — {entry.durationMinutes} min — Q{entry.qualityScore}
                    </span>
                    <span className="font-bold text-xp-gold">{entry.xpEarned} XP</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      {/* Past sessions */}
      <section aria-label="Past sessions" className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-brand-darkest dark:text-brand-lightest">Past sessions</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-brand-dark dark:text-brand-light">No sessions yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sessions.map((s) => (
              <li key={s.id} className="rounded-2xl bg-white dark:bg-brand-dark shadow overflow-hidden">
                <button
                  type="button"
                  onClick={() => navigate(`/sessions/${s.id}`)}
                  className="w-full text-left px-5 py-4 flex items-center justify-between min-h-[60px] hover:bg-brand-lightest dark:hover:bg-brand-darkest transition-colors"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-brand-darkest dark:text-brand-lightest">
                      {s.date.slice(0, 10)}
                    </span>
                    <span className="text-sm text-brand-dark dark:text-brand-light">
                      <Link
                        to={`/profile/${s.playerId}`}
                        onClick={e => e.stopPropagation()}
                        className="hover:underline"
                      >
                        {s.playerNickname ?? 'Unknown'}
                      </Link>
                      {' '}· {s.totalDuration} min
                    </span>
                  </div>
                  <span className="text-xs text-brand-mid">View →</span>
                </button>
                {s.id !== activeSessionId && (
                  <div className="border-t border-brand-lightest dark:border-brand-darkest px-5 py-2">
                    <button
                      type="button"
                      onClick={() => setActiveSessionId(s.id)}
                      className="text-sm font-medium text-brand-mid hover:text-brand-dark min-h-[44px] transition-colors"
                    >
                      + Add entries
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
