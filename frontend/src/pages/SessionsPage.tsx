import { useState, useEffect } from 'react'
import { useAuthContext } from '../context/AuthContext'
import { getExercises, Exercise } from '../api/exercises'
import { createSession, getSessions, createSessionEntry, Session, SessionEntry } from '../api/sessions'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export default function SessionsPage() {
  const { player } = useAuthContext()
  const token = localStorage.getItem('jwt') ?? ''

  const [sessions, setSessions] = useState<Session[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])

  const [newDate, setNewDate] = useState(today())
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)

  const [entryExerciseId, setEntryExerciseId] = useState('')
  const [entryDuration, setEntryDuration] = useState('')
  const [entryQuality, setEntryQuality] = useState('3')
  const [entryResults, setEntryResults] = useState<Record<string, SessionEntry[]>>({})

  useEffect(() => {
    if (!player) return
    getSessions(token, player.id).then(setSessions)
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
      quality_score: Number(entryQuality),
    })
    setEntryResults((prev) => ({
      ...prev,
      [sessionId]: [...(prev[sessionId] ?? []), entry],
    }))
    setEntryDuration('')
  }

  return (
    <main>
      <h1>Sessions</h1>

      <section aria-label="New session">
        <h2>Log a new session</h2>
        <form onSubmit={handleCreateSession} aria-label="Create session">
          <label htmlFor="session-date">Date</label>
          <input
            id="session-date"
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            required
          />
          <button type="submit">Start session</button>
        </form>
      </section>

      {activeSessionId && (
        <section aria-label="Add entry">
          <h2>Add entry to session</h2>
          <form onSubmit={(e) => handleAddEntry(e, activeSessionId)} aria-label="Add session entry">
            <label htmlFor="entry-exercise">Exercise</label>
            <select
              id="entry-exercise"
              value={entryExerciseId}
              onChange={(e) => setEntryExerciseId(e.target.value)}
            >
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.name} — {ex.category.name}</option>
              ))}
            </select>

            <label htmlFor="entry-duration">Duration (minutes)</label>
            <input
              id="entry-duration"
              type="number"
              min="1"
              value={entryDuration}
              onChange={(e) => setEntryDuration(e.target.value)}
              required
            />

            <label htmlFor="entry-quality">Quality score (1–5)</label>
            <select
              id="entry-quality"
              value={entryQuality}
              onChange={(e) => setEntryQuality(e.target.value)}
            >
              {[1, 2, 3, 4, 5].map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>

            <button type="submit">Add entry</button>
          </form>

          {(entryResults[activeSessionId] ?? []).length > 0 && (
            <ul aria-label="Session entries">
              {(entryResults[activeSessionId] ?? []).map((entry) => {
                const ex = exercises.find((e) => e.id === entry.exerciseId)
                return (
                  <li key={entry.id}>
                    {ex?.name ?? entry.exerciseId} — {entry.durationMinutes} min — Q{entry.qualityScore} — <strong>{entry.xpEarned} XP</strong>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      <section aria-label="Past sessions">
        <h2>Past sessions</h2>
        {sessions.length === 0 ? (
          <p>No sessions yet.</p>
        ) : (
          <ul>
            {sessions.map((s) => (
              <li key={s.id}>
                {s.date.slice(0, 10)}
                {s.id !== activeSessionId && (
                  <button type="button" onClick={() => setActiveSessionId(s.id)}>
                    Add entries
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
