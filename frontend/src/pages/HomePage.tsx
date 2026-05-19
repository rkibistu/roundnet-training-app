import { useState } from 'react'
import { useAuthContext } from '../context/AuthContext'
import { generateInvite } from '../api/invites'

export default function HomePage() {
  const { player } = useAuthContext()
  const [inviteCode, setInviteCode] = useState<string | null>(null)

  async function handleGenerateInvite() {
    const token = localStorage.getItem('jwt') ?? ''
    const result = await generateInvite(token)
    setInviteCode(result.code)
  }

  return (
    <main>
      <h1>Home</h1>
      <p>Welcome, {player?.nickname}</p>
      {player?.is_admin && (
        <div>
          <button type="button" onClick={handleGenerateInvite}>Generate invite</button>
          {inviteCode && <p>{inviteCode}</p>}
        </div>
      )}
    </main>
  )
}
