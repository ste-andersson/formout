import type { RefObject } from 'react'
import { useTranslation } from './languageContext'
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

export function OfflineAuthExceptionModal({ dialogRef, variant, onAllow, onCancel }: OfflineAuthExceptionModalProps) {
  const { t } = useTranslation()
  const copy =
    variant === 'sign-in'
      ? { heading: t.offlineAuthExceptionModal.signInHeading, allowLabel: t.offlineAuthExceptionModal.signInAllow, cancelLabel: t.offlineAuthExceptionModal.signInCancel }
      : { heading: t.offlineAuthExceptionModal.enableOfflineHeading, allowLabel: t.offlineAuthExceptionModal.enableOfflineAllow, cancelLabel: t.offlineAuthExceptionModal.enableOfflineCancel }

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
        <p>{t.offlineAuthExceptionModal.description}</p>
        <details className="offline-auth-exception-modal__details">
          <summary>{t.offlineAuthExceptionModal.moreInfo}</summary>
          <p>{t.offlineAuthExceptionModal.moreInfoDetails}</p>
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
