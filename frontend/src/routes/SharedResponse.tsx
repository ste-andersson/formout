import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getFormBySlug } from '../lib/api'
import type { FormDetail } from '../lib/api'
import { decodeSharedResponsePayload } from '../lib/sharedResponseLink'
import type { SharedResponsePayload } from '../lib/sharedResponseLink'
import { formatResponseDateTime } from '../lib/responseFormat'
import { FormRenderer } from '../components/FormRenderer'
import './SharedResponse.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'loaded'; form: FormDetail }

export function SharedResponse() {
  const [payload] = useState(() => decodeSharedResponsePayload(window.location.hash))

  if (!payload) {
    return (
      <div>
        <h1>Länken är ogiltig</h1>
        <p>Länken verkar vara trasig eller ofullständig.</p>
        <Link to="/">Till startsidan</Link>
      </div>
    )
  }

  return <SharedResponseContent payload={payload} />
}

function SharedResponseContent({ payload }: { payload: SharedResponsePayload }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    getFormBySlug(payload.formSlug)
      .then((form) => {
        if (cancelled) return
        setState(form ? { status: 'loaded', form } : { status: 'not-found' })
      })
      .catch(() => {
        if (cancelled) return
        setState({ status: 'not-found' })
      })

    return () => {
      cancelled = true
    }
  }, [payload.formSlug])

  if (state.status === 'loading') {
    return <p>Laddar…</p>
  }

  if (state.status === 'not-found') {
    return (
      <div>
        <h1>Formuläret kunde inte hämtas</h1>
        <p>Formulärmallen finns inte längre, eller så gick det inte att nå just nu.</p>
        <Link to="/">Till startsidan</Link>
      </div>
    )
  }

  return (
    <div className="shared-response">
      <p className="shared-response__meta">Ifyllt: {formatResponseDateTime(payload.filledInAt)}</p>
      <FormRenderer schema={state.form.schema} answers={payload.answers} readOnly />
    </div>
  )
}
