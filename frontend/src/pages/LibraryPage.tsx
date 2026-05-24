import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listDomains, type Domain } from '../api/domains'
import { useAuthContext } from '../context/AuthContext'

export default function LibraryPage() {
  const { player } = useAuthContext()
  const [domains, setDomains] = useState<Domain[]>([])

  useEffect(() => {
    listDomains().then(setDomains)
  }, [])

  const mine = domains.filter(d => d.ownerId === player?.id)
  const others = domains.filter(d => d.ownerId !== player?.id)

  return (
    <main className="p-4 flex flex-col gap-5 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-darkest dark:text-brand-lightest">Domains</h1>
        <Link to="/library/new" className="text-sm font-medium text-brand-accent">New Domain</Link>
      </div>

      <section aria-labelledby="your-domains-heading" className="flex flex-col gap-2">
        <h2 id="your-domains-heading" className="text-lg font-semibold">Your Domains</h2>
        <ul className="flex flex-col gap-1">
          {mine.map(d => (
            <li key={d.id} className="flex items-center justify-between">
              <Link to={`/library/${d.id}`}>{d.name}</Link>
              <span className="text-xs uppercase tracking-wide text-brand-dark dark:text-brand-light">{d.accessibilityState}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="discoverable-heading" className="flex flex-col gap-2">
        <h2 id="discoverable-heading" className="text-lg font-semibold">Discoverable</h2>
        <ul className="flex flex-col gap-1">
          {others.map(d => (
            <li key={d.id} className="flex items-center justify-between">
              <Link to={`/library/${d.id}`}>{d.name}</Link>
              <span className="text-xs uppercase tracking-wide text-brand-dark dark:text-brand-light">{d.accessibilityState}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
