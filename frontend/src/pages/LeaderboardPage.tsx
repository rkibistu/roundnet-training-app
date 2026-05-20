import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCategories, Category } from '../api/exercises'
import { getLeaderboard, getLeaderboardByCategory, LeaderboardEntry } from '../api/leaderboard'

export default function LeaderboardPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    getCategories().then(setCategories)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('jwt') ?? ''
    if (selectedCategoryId) {
      getLeaderboardByCategory(token, selectedCategoryId).then(setEntries)
    } else {
      getLeaderboard(token).then(setEntries)
    }
  }, [selectedCategoryId])

  return (
    <main className="p-4 flex flex-col gap-5 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-brand-darkest dark:text-brand-lightest">Leaderboard</h1>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {[{ id: '', name: 'Overall' }, ...categories].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategoryId(cat.id)}
            aria-pressed={selectedCategoryId === cat.id}
            className={[
              'h-8 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              selectedCategoryId === cat.id
                ? 'bg-brand-mid text-white'
                : 'bg-white dark:bg-brand-dark text-brand-darkest dark:text-brand-lightest border border-brand-light hover:border-brand-mid',
            ].join(' ')}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Rankings list */}
      {entries.length === 0 ? (
        <p className="text-sm text-brand-dark dark:text-brand-light text-center py-8">No players yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.playerId}>
              <button
                type="button"
                onClick={() => navigate(`/profile/${entry.playerId}`)}
                className="w-full rounded-2xl bg-white dark:bg-brand-dark shadow px-5 py-4 flex items-center gap-4 hover:shadow-md transition-shadow text-left"
              >
                <span className="w-8 text-sm font-bold text-brand-dark dark:text-brand-light shrink-0">
                  #{entry.rank}
                </span>
                <span className="flex-1 font-semibold text-brand-darkest dark:text-brand-lightest">
                  {entry.nickname ?? entry.playerId}
                </span>
                <span className="text-sm font-medium text-brand-mid shrink-0">
                  Lv. {entry.level}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
