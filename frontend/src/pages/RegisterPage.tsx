import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '../api/auth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const { token } = await register({
        email,
        password,
        nickname: nickname || undefined,
      })
      localStorage.setItem('token', token)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
      </div>
      <div>
        <label htmlFor="nickname">Nickname</label>
        <input id="nickname" type="text" value={nickname} onChange={e => setNickname(e.target.value)} />
      </div>
      {error && <p role="alert">{error}</p>}
      <button type="submit">Register</button>
    </form>
  )
}
