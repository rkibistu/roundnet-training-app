import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login as apiLogin } from '../api/auth'
import { useAuthContext } from '../context/AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const { token } = await apiLogin({ email, password })
      login(token)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
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
      {error && <p role="alert">{error}</p>}
      <button type="submit">Log in</button>
      <p>Don't have an account? <Link to="/register">Register</Link></p>
    </form>
  )
}
