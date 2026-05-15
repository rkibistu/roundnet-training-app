import { useAuthContext } from '../context/AuthContext'

export default function HomePage() {
  const { player } = useAuthContext()
  return (
    <main>
      <h1>Home</h1>
      <p>Welcome, {player?.nickname}</p>
    </main>
  )
}
