import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../api/auth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await register({ email, password, nickname: nickname || undefined, invite_code: inviteCode || undefined })
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-lightest dark:bg-brand-darkest px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-brand-dark shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center text-brand-darkest dark:text-brand-lightest mb-8">
          🌴 Roundnet Training
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm font-medium text-brand-darkest dark:text-brand-lightest">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="min-h-[44px] rounded-lg border border-brand-light px-3 py-2 text-brand-darkest dark:text-brand-lightest bg-white dark:bg-brand-darkest outline-none focus:ring-2 focus:ring-brand-mid"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm font-medium text-brand-darkest dark:text-brand-lightest">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="min-h-[44px] rounded-lg border border-brand-light px-3 py-2 text-brand-darkest dark:text-brand-lightest bg-white dark:bg-brand-darkest outline-none focus:ring-2 focus:ring-brand-mid"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="nickname" className="text-sm font-medium text-brand-darkest dark:text-brand-lightest">
              Nickname
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              className="min-h-[44px] rounded-lg border border-brand-light px-3 py-2 text-brand-darkest dark:text-brand-lightest bg-white dark:bg-brand-darkest outline-none focus:ring-2 focus:ring-brand-mid"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="invite-code" className="text-sm font-medium text-brand-darkest dark:text-brand-lightest">
              Invite Code
            </label>
            <input
              id="invite-code"
              type="text"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              className="min-h-[44px] rounded-lg border border-brand-light px-3 py-2 text-brand-darkest dark:text-brand-lightest bg-white dark:bg-brand-darkest outline-none focus:ring-2 focus:ring-brand-mid"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full min-h-[44px] rounded-lg bg-brand-mid text-white font-semibold hover:bg-brand-dark transition-colors"
          >
            Register
          </button>
          <p className="text-sm text-center text-brand-darkest dark:text-brand-lightest">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-mid font-medium underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
