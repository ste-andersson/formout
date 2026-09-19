import type { RefObject } from 'react'
import '../components/ExportDialog.css'

interface OfflineContentUnavailableModalProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  onDisableOfflineMode: () => void
}

export function OfflineContentUnavailableModal({ dialogRef, onDisableOfflineMode }: OfflineContentUnavailableModalProps) {
  function close() {
    dialogRef.current?.close()
  }

  return (
    <dialog
      ref={dialogRef}
      className="export-dialog"
      onClick={(event) => {
        if (event.target === dialogRef.current) close()
      }}
    >
      <div className="export-dialog__panel">
        <h2>Formuläret kräver internet</h2>
        <p>
          Det här formuläret finns inte sparat lokalt än, så det går inte att visa i offline-läge. Stäng av
          offline-läget för att hämta det.
        </p>
        <div className="export-dialog__options">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              onDisableOfflineMode()
              close()
            }}
          >
            Stäng av offline-läge
          </button>
          <button type="button" className="btn btn--neutral" onClick={close}>
            Avbryt
          </button>
        </div>
      </div>
    </dialog>
  )
}
