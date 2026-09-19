import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { getFormBySlugWithFallback } from '../lib/api'
import type { FormDetail } from '../lib/api'
import { decodeSharedResponsePayload } from '../lib/sharedResponseLink'
import type { SharedResponsePayload } from '../lib/sharedResponseLink'
import { formatResponseDateTime } from '../lib/responseFormat'
import { FormRenderer } from '../components/FormRenderer'
import { useOfflineMode } from '../components/offlineModeContext'
import { OfflineContentUnavailableModal } from '../components/OfflineContentUnavailableModal'
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
  const { offlineMode, setOfflineMode } = useOfflineMode()
  const unavailableDialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    let cancelled = false

    getFormBySlugWithFallback(payload.formSlug, offlineMode)
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
  }, [payload.formSlug, offlineMode])

  // Not just "not found" -- while offline, this form may simply never have
  // been cached (e.g. never opened in the editor). Explain that and offer a
  // way out, instead of the plain not-found text looking like a dead end.
  useEffect(() => {
    if (state.status === 'not-found' && offlineMode && !unavailableDialogRef.current?.open) {
      unavailableDialogRef.current?.showModal()
    }
  }, [state.status, offlineMode])

  if (state.status === 'loading') {
    return <p>Laddar…</p>
  }

  if (state.status === 'not-found') {
    return (
      <div>
        <h1>Formuläret kunde inte hämtas</h1>
        <p>Formulärmallen finns inte längre, eller så gick det inte att nå just nu.</p>
        <Link to="/">Till startsidan</Link>
        <OfflineContentUnavailableModal
          dialogRef={unavailableDialogRef}
          onDisableOfflineMode={() => setOfflineMode(false)}
        />
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
