import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { getPlayer, updateNickname, PlayerProfile } from '../api/players'

function XpBar({ xp, xpFloor, xpCeiling }: { xp: number; xpFloor: number; xpCeiling: number }) {
  const range = xpCeiling - xpFloor
  const fill = range > 0 ? Math.min(((xp - xpFloor) / range) * 100, 100) : 0
  return (
    <div className="w-full h-2 rounded-full bg-brand-lightest dark:bg-brand-darkest overflow-hidden">
      <div className="h-full rounded-full bg-brand-mid transition-all" style={{ width: `${fill}%` }} />
    </div>
  )
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { player: authPlayer } = useAuthContext()
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [editing, setEditing] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isOwnProfile = authPlayer?.id === id

  useEffect(() => {
    if (!id) return
    const token = localStorage.getItem('jwt') ?? ''
    getPlayer(token, id).then(setProfile).catch(() => setError('Failed to load profile'))
  }, [id])

  async function handleSaveNickname() {
    if (!profile) return
    const token = localStorage.getItem('jwt') ?? ''
    try {
      const updated = await updateNickname(token, profile.id, nicknameInput)
      setProfile(prev => prev ? { ...prev, nickname: updated.nickname } : prev)
      setEditing(false)
    } catch {
      setError('Failed to update nickname')
    }
  }

  if (error) return <main className="p-4"><p className="text-red-500">{error}</p></main>
  if (!profile) return <main className="p-4"><p>Loading…</p></main>

  return (
    <main className="p-4 flex flex-col gap-5 max-w-lg mx-auto">
      {/* Header */}
      <section className="rounded-2xl bg-white dark:bg-brand-dark shadow p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-brand-darkest dark:text-brand-lightest">
            {profile.nickname ?? profile.id}
          </h1>
          {isOwnProfile && !editing && (
            <button
              type="button"
              aria-label="Edit nickname"
              onClick={() => { setNicknameInput(profile.nickname ?? ''); setEditing(true) }}
              className="text-sm text-brand-mid hover:text-brand-dark transition-colors"
            >
              Edit nickname
            </button>
          )}
        </div>

        {editing && (
          <div className="flex flex-col gap-2">
            <label htmlFor="nickname-input" className="text-sm font-medium text-brand-dark dark:text-brand-light">
              Nickname
            </label>
            <div className="flex gap-2">
              <input
                id="nickname-input"
                type="text"
                aria-label="Nickname"
                value={nicknameInput}
                onChange={e => setNicknameInput(e.target.value)}
                className="flex-1 rounded-lg border border-brand-light px-3 py-2 text-sm bg-white dark:bg-brand-darkest text-brand-darkest dark:text-brand-lightest"
              />
              <button
                type="button"
                aria-label="Save"
                onClick={handleSaveNickname}
                className="px-4 py-2 rounded-lg bg-brand-mid text-white text-sm font-semibold hover:bg-brand-dark transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-lg text-sm text-brand-mid hover:text-brand-dark transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* General Level */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-brand-dark dark:text-brand-light">
              Level {profile.generalLevel.level}
            </span>
            <span className="text-xs text-brand-mid">
              {profile.generalLevel.xp} / {profile.generalLevel.xpCeiling} XP
            </span>
          </div>
          <XpBar
            xp={profile.generalLevel.xp}
            xpFloor={profile.generalLevel.xpFloor}
            xpCeiling={profile.generalLevel.xpCeiling}
          />
        </div>
      </section>

      {/* Category Levels */}
      <section className="rounded-2xl bg-white dark:bg-brand-dark shadow p-5 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-brand-darkest dark:text-brand-lightest">Category Levels</h2>
        <div className="flex flex-col gap-3">
          {profile.categoryLevels.map(cl => (
            <div key={cl.categoryId} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-brand-darkest dark:text-brand-lightest">{cl.categoryName}</span>
                <span className="text-xs text-brand-mid">Level {cl.level} · {cl.xp} XP</span>
              </div>
              <XpBar xp={cl.xp} xpFloor={cl.xpFloor} xpCeiling={cl.xpCeiling} />
            </div>
          ))}
        </div>
      </section>

      {/* Recent Sessions */}
      <section className="rounded-2xl bg-white dark:bg-brand-dark shadow p-5 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-brand-darkest dark:text-brand-lightest">Recent Sessions</h2>
        {profile.recentSessions.length === 0 ? (
          <p className="text-sm text-brand-mid">No sessions yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {profile.recentSessions.map(s => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl bg-brand-lightest dark:bg-brand-darkest px-4 py-3"
              >
                <span className="text-sm font-medium text-brand-darkest dark:text-brand-lightest">
                  {new Date(s.date).toLocaleDateString()}
                </span>
                <span className="text-sm text-brand-mid">{s.totalDuration} min</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
