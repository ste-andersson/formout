import type { ReactNode, RefObject } from 'react'
import './ExportDialog.css'

interface ExportDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  title: string
  children: ReactNode
}

export function ExportDialog({ dialogRef, title, children }: ExportDialogProps) {
  return (
    <dialog ref={dialogRef} className="export-dialog">
      <h2>{title}</h2>
      <div className="export-dialog__options">{children}</div>
      <button type="button" onClick={() => dialogRef.current?.close()}>
        Avbryt
      </button>
    </dialog>
  )
}
