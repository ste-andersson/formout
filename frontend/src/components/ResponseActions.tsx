import type { ReactNode } from 'react'
import { useRef } from 'react'
import QRCode from 'react-qr-code'
import type { FormDetail } from '../lib/api'
import type { SavedResponse } from '../lib/responseStorage'
import { responseTimestamp } from '../lib/responseStorage'
import { buildCsvFile, buildResponseCsv, buildResponseCsvFallback, downloadCsv } from '../lib/responseExport'
import { buildResponsePdf, downloadPdf } from '../lib/responsePdf'
import { isWebShareSupported, shareFiles } from '../lib/webShare'
import { buildSharedResponseUrl } from '../lib/sharedResponseLink'
import { useToast } from './toastContext'
import { ExportDialog } from './ExportDialog'
import './ResponseActions.css'

interface ResponseActionsProps {
  response: SavedResponse
  // The form template may no longer exist -- CSV export still works from the
  // raw answers alone (buildResponseCsvFallback), but PDF/share/QR all need
  // the schema to render field labels, so they're left out when it's gone.
  form: FormDetail | undefined
  className?: string
  // Extra buttons/links rendered in the same row, after Dela/Exportera --
  // e.g. "Ta bort" on the response page, or "Ändra"/"Tillbaka" right after a
  // fresh submission.
  children?: ReactNode
}

// Dela + Exportera for a single saved response -- shared between the
// response detail page and the confirmation screen shown right after a
// respondent submits a form, so the CSV/PDF/share/QR logic only lives once.
export function ResponseActions({ response, form, className, children }: ResponseActionsProps) {
  const exportDialogRef = useRef<HTMLDialogElement>(null)
  const shareDialogRef = useRef<HTMLDialogElement>(null)
  const qrDialogRef = useRef<HTMLDialogElement>(null)
  const { showToast } = useToast()

  const linkUrl = form
    ? buildSharedResponseUrl({
        formSlug: response.formSlug,
        formTitle: response.formTitle,
        answers: response.answers,
        filledInAt: responseTimestamp(response),
      })
    : null

  function safeFilenamePart(title: string): string {
    return title.replace(/[^a-zA-Z0-9åäöÅÄÖ]+/g, '-').replace(/^-+|-+$/g, '') || 'formular'
  }

  function handleExportCsv() {
    const csv = form ? buildResponseCsv(form.schema, response.answers) : buildResponseCsvFallback(response.answers)
    const dateStr = responseTimestamp(response).slice(0, 10)
    downloadCsv(`${safeFilenamePart(response.formTitle)}-${dateStr}.csv`, csv)
    exportDialogRef.current?.close()
  }

  function handleExportPdf() {
    if (!form) return
    const pdf = buildResponsePdf(form.schema, response.answers, responseTimestamp(response))
    const dateStr = responseTimestamp(response).slice(0, 10)
    downloadPdf(`${safeFilenamePart(response.formTitle)}-${dateStr}.pdf`, pdf)
    exportDialogRef.current?.close()
  }

  async function handleShareCsv() {
    if (!form) return
    const dateStr = responseTimestamp(response).slice(0, 10)
    const csvFile = buildCsvFile(
      `${safeFilenamePart(response.formTitle)}-${dateStr}.csv`,
      buildResponseCsv(form.schema, response.answers),
    )
    const result = await shareFiles([csvFile], response.formTitle)
    if (result === 'shared') {
      shareDialogRef.current?.close()
    } else if (result === 'error' || result === 'unsupported') {
      showToast('Kunde inte dela filen', 'error')
    }
  }

  async function handleSharePdf() {
    if (!form) return
    const dateStr = responseTimestamp(response).slice(0, 10)
    const pdfBlob = buildResponsePdf(form.schema, response.answers, responseTimestamp(response))
    const pdfFile = new File([pdfBlob], `${safeFilenamePart(response.formTitle)}-${dateStr}.pdf`, {
      type: 'application/pdf',
    })
    const result = await shareFiles([pdfFile], response.formTitle)
    if (result === 'shared') {
      shareDialogRef.current?.close()
    } else if (result === 'error' || result === 'unsupported') {
      showToast('Kunde inte dela filen', 'error')
    }
  }

  function handleShareLink() {
    if (!linkUrl) {
      showToast('Formuläret är för långt för att delas som länk. Använd Dela eller Exportera istället.', 'error')
      return
    }
    const subject = encodeURIComponent(response.formTitle)
    const body = encodeURIComponent(`Här är mitt ifyllda formulär:\n\n${linkUrl}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
    shareDialogRef.current?.close()
  }

  function handleOpenQr() {
    if (!linkUrl) {
      showToast('Formuläret är för långt för att visas som QR-kod/länk.', 'error')
      return
    }
    shareDialogRef.current?.close()
    // Öppna nästa dialog i en ny frame -- att göra det i samma tick som
    // close() lämnar webbläsaren i ett inkonsekvent tillstånd på vissa
    // mobila webbläsare, där den nya dialogens första klick "äts upp".
    requestAnimationFrame(() => qrDialogRef.current?.showModal())
  }

  async function handleCopyLink() {
    if (!linkUrl) return
    try {
      await navigator.clipboard.writeText(linkUrl)
      showToast('Länk kopierad', 'success')
    } catch {
      showToast('Kunde inte kopiera länken', 'error')
    }
  }

  return (
    <>
      <div className={className}>
        {form && (
          <button type="button" className="btn btn--neutral" onClick={() => shareDialogRef.current?.showModal()}>
            Dela
          </button>
        )}
        <button type="button" className="btn btn--neutral" onClick={() => exportDialogRef.current?.showModal()}>
          Exportera
        </button>
        {children}
      </div>

      <ExportDialog dialogRef={exportDialogRef} title="Exportera">
        <button type="button" className="btn btn--neutral" onClick={handleExportCsv}>
          CSV
        </button>
        {form && (
          <button type="button" className="btn btn--neutral" onClick={handleExportPdf}>
            PDF
          </button>
        )}
      </ExportDialog>

      {form && (
        <ExportDialog dialogRef={shareDialogRef} title="Dela">
          {isWebShareSupported() && (
            <>
              <button type="button" className="btn btn--neutral" onClick={handleShareCsv}>
                CSV
              </button>
              <button type="button" className="btn btn--neutral" onClick={handleSharePdf}>
                PDF
              </button>
            </>
          )}
          <button
            type="button"
            className={linkUrl ? 'btn btn--neutral' : 'btn btn--neutral export-dialog__option--muted'}
            title={linkUrl ? undefined : 'Formuläret är för långt för att delas som länk.'}
            onClick={handleShareLink}
          >
            Maila länk
          </button>
          <button
            type="button"
            className={linkUrl ? 'btn btn--neutral' : 'btn btn--neutral export-dialog__option--muted'}
            title={linkUrl ? undefined : 'Formuläret är för långt för att visas som QR-kod/länk.'}
            onClick={handleOpenQr}
          >
            Visa QR-kod/länk
          </button>
        </ExportDialog>
      )}

      {linkUrl && (
        <ExportDialog dialogRef={qrDialogRef} title="QR-kod">
          <div className="response-actions__qr">
            <div className="response-actions__qr-frame">
              <QRCode value={linkUrl} size={200} />
            </div>
            <div className="response-actions__link-copy">
              <input
                type="text"
                readOnly
                value={linkUrl}
                onFocus={(e) => e.target.select()}
                className="response-actions__link-input"
              />
              <button type="button" className="btn btn--neutral btn--small" onClick={handleCopyLink}>
                Kopiera länk
              </button>
            </div>
          </div>
        </ExportDialog>
      )}
    </>
  )
}
