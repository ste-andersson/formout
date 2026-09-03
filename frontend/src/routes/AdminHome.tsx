import { SignedIn, SignedOut, SignInButton, useAuth } from '@clerk/clerk-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { isTouchDevice } from '../lib/device'
import { listMyForms } from '../lib/adminApi'
import type { AdminFormSummary } from '../lib/adminApi'
import { ShareFormLink } from '../components/ShareFormLink'
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

function PhotoUploadButton() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const isMobile = isTouchDevice()

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    navigate('/admin/forms/new', { state: { uploadedFile: file } })
  }

  return (
    <>
      <button
        type="button"
        className="my-forms__action my-forms__action--primary"
        onClick={() => inputRef.current?.click()}
      >
        {isMobile ? 'Formulär från foto' : 'Formulär från fil'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture={isMobile ? 'environment' : undefined}
        onChange={handleFileChange}
        hidden
      />
    </>
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

  return (
    <div className="my-forms">
      <div className="my-forms__actions">
        <PhotoUploadButton />
        <Link to="/admin/forms/new" className="my-forms__action my-forms__action--secondary">
          Bygg formulär
        </Link>
      </div>

      {state.status === 'loading' && <p>Laddar…</p>}
      {state.status === 'error' && <p>Kunde inte hämta dina formulär.</p>}
      {state.status === 'loaded' && (
        <>
          {state.forms.length === 0 ? (
            <p>Du har inga formulär än.</p>
          ) : (
            <ul className="my-forms__list">
              {state.forms.map((form) => (
                <li key={form.id} className="my-forms__item">
                  <div className="my-forms__info">
                    <Link to={`/admin/forms/${form.id}/edit`} className="my-forms__title">
                      {form.title}
                    </Link>
                    <span className="my-forms__slug">{form.slug}</span>
                  </div>
                  <div className="my-forms__item-actions">
                    <span className={`my-forms__status my-forms__status--${form.status.toLowerCase()}`}>
                      {form.status}
                    </span>
                    <ShareFormLink
                      slug={form.slug}
                      title={form.title}
                      disabled={form.status !== 'PUBLISHED'}
                      triggerClassName="my-forms__share-button"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
