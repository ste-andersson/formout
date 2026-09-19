import type { RefObject } from 'react'
import '../components/ExportDialog.css'
import './OfflineAuthExceptionModal.css'

interface OfflineAuthExceptionModalProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  // 'sign-in': shown when someone in offline mode clicks to log in.
  // 'enable-offline': shown when someone already signed in turns offline mode on.
  variant: 'sign-in' | 'enable-offline'
  onAllow: () => void
  onCancel: () => void
}

const COPY = {
  'sign-in': {
    heading: 'Logga in i offline-läge?',
    allowLabel: 'Tillåt',
    cancelLabel: 'Avbryt',
  },
  'enable-offline': {
    heading: 'Slå på offline-läge?',
    allowLabel: 'Tillåt dessa',
    cancelLabel: 'Stanna i Online-läge',
  },
} as const

export function OfflineAuthExceptionModal({ dialogRef, variant, onAllow, onCancel }: OfflineAuthExceptionModalProps) {
  const copy = COPY[variant]

  function close() {
    dialogRef.current?.close()
  }

  return (
    <dialog
      ref={dialogRef}
      className="export-dialog"
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onCancel()
          close()
        }
      }}
    >
      <div className="export-dialog__panel">
        <h2>{copy.heading}</h2>
        <p>
          För att hålla din inloggning vid liv behöver ett fåtal anrop till inloggningstjänsten (Clerk) och dess
          bot-skydd (Cloudflare) tillåtas, även i offline-läge.
        </p>
        <details className="offline-auth-exception-modal__details">
          <summary>Mer information</summary>
          <p>
            Dessa anrop skickar aldrig formulärsvar eller annan data från formulär. De innehåller bara
            inloggningsinformation (sessionstoken) som håller dig inloggad, och en kontroll av att du inte är en bot.
            Alla andra nätverksanrop förblir blockerade så länge offline-läget är på.
          </p>
        </details>
        <div className="export-dialog__options">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              onAllow()
              close()
            }}
          >
            {copy.allowLabel}
          </button>
          <button
            type="button"
            className="btn btn--neutral"
            onClick={() => {
              onCancel()
              close()
            }}
          >
            {copy.cancelLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
