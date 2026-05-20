import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'

const tabBase = 'flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-semibold transition-colors'
const tabInactive = 'text-brand-light dark:text-brand-light hover:text-brand-mid dark:hover:text-brand-mid'
const tabActive = 'text-brand-mid dark:text-brand-mid'

function tab(to: string, label: string, icon: string) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `${tabBase} ${isActive ? tabActive : tabInactive}`}
    >
      <span className="text-xl leading-none">{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}

export default function ShellLayout() {
  const { player, logout } = useAuthContext()
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  function toggleTheme() {
    setDark((prev) => {
      const next = !prev
      localStorage.setItem('theme', next ? 'dark' : 'light')
      return next
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-brand-lightest dark:bg-brand-darkest text-brand-darkest dark:text-brand-lightest font-sans">

      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 bg-white dark:bg-brand-dark border-b border-brand-light/30 dark:border-brand-dark shadow-sm">
        <span className="text-lg font-semibold tracking-tight text-brand-mid">Roundnet</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-brand-dark dark:text-brand-light">{player?.nickname}</span>
          <button
            aria-label="Toggle theme"
            onClick={toggleTheme}
            className="p-2 rounded-full text-brand-dark dark:text-brand-light hover:bg-brand-light/20 dark:hover:bg-brand-light/10 transition-colors"
          >
            {dark ? '☀️' : '🌙'}
          </button>
          <button
            onClick={logout}
            className="text-sm px-3 py-1.5 rounded-lg bg-brand-light/20 dark:bg-brand-light/10 text-brand-dark dark:text-brand-light hover:bg-brand-light/30 dark:hover:bg-brand-light/20 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 inset-x-0 z-10 flex items-end justify-around bg-white dark:bg-brand-dark border-t border-brand-light/30 dark:border-brand-dark shadow-lg pb-safe">
        {tab('/', 'Home', '🏠')}
        {tab('/library', 'Library', '📚')}

        {/* Sessions FAB */}
        <NavLink
          to="/sessions"
          aria-label="Sessions"
          className={({ isActive }) =>
            `-mt-6 flex flex-col items-center justify-center w-16 h-16 rounded-full shadow-lg font-semibold text-xs gap-0.5 transition-colors ${
              isActive
                ? 'bg-brand-mid text-white shadow-brand-mid/40'
                : 'bg-brand-mid text-white hover:bg-brand-dark'
            }`
          }
        >
          <span className="text-2xl leading-none">＋</span>
          <span>Log</span>
        </NavLink>

        {tab('/leaderboard', 'Board', '🏆')}
        {tab(`/profile/${player?.id ?? ''}`, 'Profile', '👤')}
      </nav>
    </div>
  )
}
