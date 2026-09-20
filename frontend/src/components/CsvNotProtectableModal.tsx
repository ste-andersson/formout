import type { RefObject } from 'react'
import '../components/ExportDialog.css'

interface CsvNotProtectableModalProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  onExportAnyway: () => void
  // Omitted when there's no form schema to build an XLSX from (mirrors PDF's
  // own gating elsewhere in this file) -- hides that option entirely rather
  // than offering a button that can't work.
  onUseXlsxInstead?: () => void
  onCancel: () => void
}

// Shown when password mode is on and someone reaches for CSV specifically --
// CSV has no password protection of its own (unlike PDF and XLSX, which do),
// so this explains the gap and offers a real way forward instead of just
// silently exporting an unprotected file.
export function CsvNotProtectableModal({ dialogRef, onExportAnyway, onUseXlsxInstead, onCancel }: CsvNotProtectableModalProps) {
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
        <h2>CSV kan inte lösenordsskyddas</h2>
        <p>CSV-formatet stödjer inte lösenord. Välj XLSX istället, eller exportera/dela CSV-filen utan lösenord.</p>
        <div className="export-dialog__options">
          {onUseXlsxInstead && (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                onUseXlsxInstead()
                close()
              }}
            >
              Använd XLSX istället
            </button>
          )}
          <button
            type="button"
            className="btn btn--neutral"
            onClick={() => {
              onExportAnyway()
              close()
            }}
          >
            Fortsätt utan lösenord
          </button>
          <button
            type="button"
            className="btn btn--neutral"
            onClick={() => {
              onCancel()
              close()
            }}
          >
            Avbryt
          </button>
        </div>
      </div>
    </dialog>
  )
}
