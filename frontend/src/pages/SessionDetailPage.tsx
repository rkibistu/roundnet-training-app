import { useNavigate } from 'react-router-dom'

export default function SessionDetailPage() {
  const navigate = useNavigate()
  return (
    <main className="p-4 flex flex-col gap-5 max-w-lg mx-auto">
      <button
        type="button"
        onClick={() => navigate('/sessions')}
        className="self-start flex items-center gap-1 text-sm font-medium text-brand-mid hover:text-brand-dark min-h-[44px] transition-colors"
      >
        ← Back
      </button>
      <section className="rounded-2xl bg-white dark:bg-brand-dark shadow p-6">
        <p className="text-sm text-brand-dark dark:text-brand-light">
          Session detail is coming soon.
        </p>
      </section>
    </main>
  )
}
