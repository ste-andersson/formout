import type { ReactNode, RefObject } from 'react'
import './ExportDialog.css'

interface ExportDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  title: string
  children: ReactNode
}

export function ExportDialog({ dialogRef, title, children }: ExportDialogProps) {
  return (
    <dialog
      ref={dialogRef}
      className="export-dialog"
      onClick={(event) => {
        // Klick på ::backdrop bubblar som ett klick på <dialog> själv (target
        // === dialogen), till skillnad från klick på det faktiska innehållet.
        if (event.target === dialogRef.current) {
          dialogRef.current?.close()
        }
      }}
    >
      <h2>{title}</h2>
      <div className="export-dialog__options">{children}</div>
      <button type="button" className="btn btn--neutral" onClick={() => dialogRef.current?.close()}>
        Avbryt
      </button>
    </dialog>
  )
}
