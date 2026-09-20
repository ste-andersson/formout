import type { ReactNode, RefObject } from 'react'
import { useTranslation } from './languageContext'
import './ExportDialog.css'

interface ExportDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  title: string
  children: ReactNode
}

export function ExportDialog({ dialogRef, title, children }: ExportDialogProps) {
  const { t } = useTranslation()

  return (
    <dialog
      ref={dialogRef}
      className="export-dialog"
      onClick={(event) => {
        // A click on ::backdrop bubbles as a click on <dialog> itself (target
        // === the dialog), unlike a click on the actual content.
        if (event.target === dialogRef.current) {
          dialogRef.current?.close()
        }
      }}
    >
      <div className="export-dialog__panel">
        <h2>{title}</h2>
        <div className="export-dialog__options">{children}</div>
        <button type="button" className="btn btn--neutral" onClick={() => dialogRef.current?.close()}>
          {t.common.cancel}
        </button>
      </div>
    </dialog>
  )
}
