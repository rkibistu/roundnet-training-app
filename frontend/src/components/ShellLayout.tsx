import { NavLink, Outlet } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'

export default function ShellLayout() {
  const { player, logout } = useAuthContext()

  return (
    <div>
      <header>
        <span>Roundnet</span>
        <span>{player?.nickname}</span>
        <button onClick={logout}>Logout</button>
      </header>
      <main>
        <Outlet />
      </main>
      <nav>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/sessions">Sessions</NavLink>
        <NavLink to="/library">Library</NavLink>
        <NavLink to="/leaderboard">Leaderboard</NavLink>
        <NavLink to={`/profile/${player?.id ?? ''}`}>Profile</NavLink>
      </nav>
    </div>
  )
}
