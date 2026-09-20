import type { RefObject } from 'react'
import { useTranslation } from './languageContext'
import '../components/ExportDialog.css'

interface OfflineContentUnavailableModalProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  onDisableOfflineMode: () => void
}

export function OfflineContentUnavailableModal({ dialogRef, onDisableOfflineMode }: OfflineContentUnavailableModalProps) {
  const { t } = useTranslation()

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
        <h2>{t.offlineContentUnavailableModal.title}</h2>
        <p>{t.offlineContentUnavailableModal.message}</p>
        <div className="export-dialog__options">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              onDisableOfflineMode()
              close()
            }}
          >
            {t.offlineContentUnavailableModal.disableOffline}
          </button>
          <button type="button" className="btn btn--neutral" onClick={close}>
            {t.common.cancel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
