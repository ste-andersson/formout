import { SignedIn, SignedOut, SignInButton, useAuth } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { listMyForms } from '../lib/adminApi'
import type { AdminFormSummary } from '../lib/adminApi'
import './AdminHome.css'

export function AdminHome() {
  return (
    <div>
      <h1>Admin</h1>
      <SignedOut>
        <p>Du måste logga in för att komma åt admin.</p>
        <SignInButton mode="modal" />
      </SignedOut>
      <SignedIn>
        <MyForms />
      </SignedIn>
    </div>
  )
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; forms: AdminFormSummary[] }

function MyForms() {
  const { getToken } = useAuth()
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    getToken()
      .then((token) => {
        if (!token) {
          throw new Error('Not signed in')
        }
        return listMyForms(token)
      })
      .then((forms) => {
        if (cancelled) return
        setState({ status: 'loaded', forms })
      })
      .catch(() => {
        if (cancelled) return
        setState({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [getToken])

  if (state.status === 'loading') {
    return <p>Laddar…</p>
  }

  if (state.status === 'error') {
    return <p>Kunde inte hämta dina formulär.</p>
  }

  return (
    <div className="my-forms">
      <Link to="/admin/forms/new" className="my-forms__new-button">
        + Nytt formulär
      </Link>
      {state.forms.length === 0 ? (
        <p>Du har inga formulär än.</p>
      ) : (
        <ul className="my-forms__list">
          {state.forms.map((form) => (
            <li key={form.id} className="my-forms__item">
              <Link to={`/admin/forms/${form.id}/edit`} className="my-forms__title">
                {form.title}
              </Link>
              <span className={`my-forms__status my-forms__status--${form.status.toLowerCase()}`}>
                {form.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
