import { useAuthContext } from '../context/AuthContext'

export default function HomePage() {
  const { player } = useAuthContext()

  return (
    <main className="p-4 flex flex-col gap-5 max-w-lg mx-auto">
      <h1 className="sr-only">Home</h1>

      <section className="rounded-2xl bg-white dark:bg-brand-dark shadow p-6 flex flex-col gap-1">
        <p className="text-3xl font-bold text-brand-darkest dark:text-brand-lightest">
          Welcome, {player?.nickname ?? player?.email}
        </p>
        <p className="text-sm text-brand-mid mt-1">🌴 Keep training. Every session counts.</p>
      </section>

      {player?.is_admin && (
        <section
          aria-label="Admin"
          className="rounded-2xl bg-white dark:bg-brand-dark shadow p-5 flex flex-col gap-2"
        >
          <h2 className="text-base font-semibold text-brand-darkest dark:text-brand-lightest">Admin</h2>
          <p className="text-sm text-brand-dark dark:text-brand-light">
            Admin tools coming soon.
          </p>
        </section>
      )}
    </main>
  )
}
