import { useState } from 'react'
import { useAuthContext } from '../context/AuthContext'
import { generateInvite } from '../api/invites'

export default function HomePage() {
  const { player } = useAuthContext()
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerateInvite() {
    const token = localStorage.getItem('jwt') ?? ''
    const result = await generateInvite(token)
    setInviteCode(result.code)
    setCopied(false)
  }

  async function handleCopy() {
    if (!inviteCode) return
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="p-4 flex flex-col gap-5 max-w-lg mx-auto">
      <h1 className="sr-only">Home</h1>

      {/* Welcome card */}
      <section className="rounded-2xl bg-white dark:bg-brand-dark shadow p-6 flex flex-col gap-1">
        <p className="text-3xl font-bold text-brand-darkest dark:text-brand-lightest">
          Welcome, {player?.nickname ?? player?.email}
        </p>
        <p className="text-sm text-brand-mid mt-1">🌴 Keep training. Every session counts.</p>
      </section>

      {/* Admin invite section */}
      {player?.is_admin && (
        <section
          aria-label="Generate invite"
          className="rounded-2xl bg-white dark:bg-brand-dark shadow p-5 flex flex-col gap-4"
        >
          <div>
            <h2 className="text-base font-semibold text-brand-darkest dark:text-brand-lightest">Invite a Player</h2>
            <p className="text-sm text-brand-dark dark:text-brand-light mt-0.5">
              Generate a one-time invite code to share with a new player.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateInvite}
            className="w-full min-h-[44px] rounded-lg bg-brand-mid text-white font-semibold hover:bg-brand-dark transition-colors"
          >
            Generate invite
          </button>

          {inviteCode && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-brand-dark dark:text-brand-light uppercase tracking-wide">
                Invite code
              </p>
              <div className="flex items-center gap-3 rounded-lg bg-brand-lightest dark:bg-brand-darkest px-4 py-3">
                <span className="flex-1 font-mono text-lg font-bold tracking-widest text-brand-darkest dark:text-brand-lightest select-all">
                  {inviteCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="min-h-[44px] px-3 rounded-lg text-sm font-medium text-brand-mid hover:text-brand-dark transition-colors"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
