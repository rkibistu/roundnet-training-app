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

  if (error) return <main><p>Error: {error}</p></main>
  if (!session) return <main><p>Loading…</p></main>

  const { entries } = session
  const categorySummary = buildCategorySummary(entries)
  const totalDuration = entries.reduce((s, e) => s + e.durationMinutes, 0)
  const totalXp = entries.reduce((s, e) => s + e.xpEarned, 0)
  const avgQuality = entries.length > 0
    ? entries.reduce((s, e) => s + e.qualityScore, 0) / entries.length
    : 0

  return (
    <main>
      <button type="button" onClick={() => navigate('/sessions')}>← Back</button>
      <h1>{session.player.nickname ?? 'Unknown'} — {session.date.slice(0, 10)}</h1>

      <section aria-label="Session entries">
        <h2>Entries</h2>
        {entries.length === 0 ? (
          <p>No entries.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Exercise</th>
                <th>Category</th>
                <th>Duration (min)</th>
                <th>Quality</th>
                <th>XP</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{e.exerciseName}</td>
                  <td>{e.categoryName}</td>
                  <td>{e.durationMinutes}</td>
                  <td>{e.qualityScore}</td>
                  <td>{e.xpEarned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {categorySummary.size > 0 && (
        <section aria-label="Category summary">
          <h2>By category</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Total duration (min)</th>
                <th>Total XP</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(categorySummary.entries()).map(([cat, { totalDuration: d, totalXp: xp }]) => (
                <tr key={cat}>
                  <td>{cat}</td>
                  <td>{d}</td>
                  <td>{xp.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section aria-label="Session totals">
        <h2>Session total</h2>
        <p>Total duration: {totalDuration} min</p>
        <p>Average quality: {avgQuality.toFixed(1)}</p>
        <p>Total XP: {totalXp.toFixed(1)}</p>
      </section>
    </main>
  )
}
