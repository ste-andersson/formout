import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import type { FormDetail } from '../lib/api'
import type { SavedResponse } from '../lib/responseStorage'
import { responseTimestamp } from '../lib/responseStorage'
import { buildCsvFile, buildResponseCsv, buildResponseCsvFallback, downloadCsv } from '../lib/responseExport'
import { buildResponsePdf, downloadPdf } from '../lib/responsePdf'
import { buildResponseXlsx } from '../lib/responseXlsx'
import { downloadBlob } from '../lib/downloadFile'
import { isWebShareSupported, shareFiles } from '../lib/webShare'
import { buildSharedResponsePayload, buildSharedResponseUrl } from '../lib/sharedResponseLink'
import { usePasswordMode } from './passwordModeContext'
import { usePasswordPrompt } from './usePasswordPrompt'
import { useToast } from './toastContext'
import { ExportDialog } from './ExportDialog'
import { CsvNotProtectableModal } from './CsvNotProtectableModal'
import './ResponseActions.css'

interface ResponseActionsProps {
  response: SavedResponse
  // The form template may no longer exist -- CSV export still works from the
  // raw answers alone (buildResponseCsvFallback), but PDF/XLSX/share/QR all
  // need the schema to render field labels, so they're left out when it's gone.
  form: FormDetail | undefined
  className?: string
  // Extra buttons/links rendered in the same row, after Dela/Exportera --
  // e.g. "Ta bort" on the response page, or "Ändra"/"Tillbaka" right after a
  // fresh submission.
  children?: ReactNode
}

function safeFilenamePart(title: string): string {
  return title.replace(/[^a-zA-Z0-9åäöÅÄÖ]+/g, '-').replace(/^-+|-+$/g, '') || 'formular'
}

// Dela + Exportera for a single saved response -- shared between the
// response detail page and the confirmation screen shown right after a
// respondent submits a form, so the CSV/PDF/XLSX/share/QR logic only lives once.
export function ResponseActions({ response, form, className, children }: ResponseActionsProps) {
  const exportDialogRef = useRef<HTMLDialogElement>(null)
  const shareDialogRef = useRef<HTMLDialogElement>(null)
  const qrDialogRef = useRef<HTMLDialogElement>(null)
  const csvWarningDialogRef = useRef<HTMLDialogElement>(null)
  const { showToast } = useToast()
  const { passwordMode } = usePasswordMode()
  const { promptForPassword, modal: passwordPromptModal } = usePasswordPrompt()

  // Which action ("Exportera" vs "Dela") opened the CSV-not-protectable
  // warning, so its buttons know what "anyway"/"use XLSX instead" mean.
  const [csvWarningContext, setCsvWarningContext] = useState<'export' | 'share' | null>(null)

  // Eagerly computed and used directly when password mode is off -- exactly
  // today's behavior. When password mode is on, a link can't be precomputed
  // (building it needs an async password prompt tied to a user gesture), so
  // `qrLinkUrl` holds the resolved link for that case instead (see
  // resolveLinkUrl below).
  const linkUrl = form
    ? buildSharedResponseUrl({
        formSlug: response.formSlug,
        formTitle: response.formTitle,
        answers: response.answers,
        filledInAt: responseTimestamp(response),
        protected: false,
      })
    : null
  const [qrLinkUrl, setQrLinkUrl] = useState<string | null>(null)
  const activeLinkUrl = passwordMode ? qrLinkUrl : linkUrl

  // Resolves the URL to share, prompting for a password first when password
  // mode is on. Returns 'cancelled' if the user backs out of the prompt.
  async function resolveLinkUrl(): Promise<string | null | 'cancelled'> {
    if (!form) return null
    if (!passwordMode) return linkUrl

    const password = await promptForPassword()
    if (password === null) return 'cancelled'

    const payload = await buildSharedResponsePayload(
      { formSlug: response.formSlug, formTitle: response.formTitle, filledInAt: responseTimestamp(response) },
      response.answers,
      password,
    )
    const url = buildSharedResponseUrl(payload)
    setQrLinkUrl(url)
    return url
  }

  function exportPlainCsv() {
    const csv = form ? buildResponseCsv(form.schema, response.answers) : buildResponseCsvFallback(response.answers)
    const dateStr = responseTimestamp(response).slice(0, 10)
    downloadCsv(`${safeFilenamePart(response.formTitle)}-${dateStr}.csv`, csv)
  }

  async function sharePlainCsv() {
    const dateStr = responseTimestamp(response).slice(0, 10)
    const csv = form ? buildResponseCsv(form.schema, response.answers) : buildResponseCsvFallback(response.answers)
    const csvFile = buildCsvFile(`${safeFilenamePart(response.formTitle)}-${dateStr}.csv`, csv)
    const result = await shareFiles([csvFile], response.formTitle)
    if (result === 'shared') {
      shareDialogRef.current?.close()
    } else if (result === 'error' || result === 'unsupported') {
      showToast('Kunde inte dela filen', 'error')
    }
  }

  function handleExportCsv() {
    if (!passwordMode) {
      exportPlainCsv()
      exportDialogRef.current?.close()
      return
    }
    exportDialogRef.current?.close()
    setCsvWarningContext('export')
    csvWarningDialogRef.current?.showModal()
  }

  async function handleShareCsv() {
    if (!passwordMode) {
      await sharePlainCsv()
      return
    }
    shareDialogRef.current?.close()
    setCsvWarningContext('share')
    csvWarningDialogRef.current?.showModal()
  }

  function handleExportPdf() {
    if (!form) return
    const dateStr = responseTimestamp(response).slice(0, 10)
    const namePart = safeFilenamePart(response.formTitle)

    if (!passwordMode) {
      const pdf = buildResponsePdf(form.schema, response.answers, responseTimestamp(response))
      downloadPdf(`${namePart}-${dateStr}.pdf`, pdf)
      exportDialogRef.current?.close()
      return
    }

    exportDialogRef.current?.close()
    promptForPassword().then((password) => {
      if (password === null) return
      const pdf = buildResponsePdf(form.schema, response.answers, responseTimestamp(response), password)
      downloadPdf(`${namePart}-${dateStr}.pdf`, pdf)
    })
  }

  async function handleSharePdf() {
    if (!form) return
    const dateStr = responseTimestamp(response).slice(0, 10)
    const namePart = safeFilenamePart(response.formTitle)

    let password: string | undefined
    if (passwordMode) {
      const entered = await promptForPassword()
      if (entered === null) return
      password = entered
    }

    const pdfBlob = buildResponsePdf(form.schema, response.answers, responseTimestamp(response), password)
    const pdfFile = new File([pdfBlob], `${namePart}-${dateStr}.pdf`, { type: 'application/pdf' })
    const result = await shareFiles([pdfFile], response.formTitle)
    if (result === 'shared') {
      shareDialogRef.current?.close()
    } else if (result === 'error' || result === 'unsupported') {
      showToast('Kunde inte dela filen', 'error')
    }
  }

  async function handleExportXlsx() {
    if (!form) return
    const dateStr = responseTimestamp(response).slice(0, 10)
    const namePart = safeFilenamePart(response.formTitle)
    exportDialogRef.current?.close()

    let password: string | undefined
    if (passwordMode) {
      const entered = await promptForPassword()
      if (entered === null) return
      password = entered
    }

    const xlsx = await buildResponseXlsx(form.schema, response.answers, responseTimestamp(response), password)
    downloadBlob(`${namePart}-${dateStr}.xlsx`, xlsx)
  }

  async function handleShareXlsx() {
    if (!form) return
    const dateStr = responseTimestamp(response).slice(0, 10)
    const namePart = safeFilenamePart(response.formTitle)

    let password: string | undefined
    if (passwordMode) {
      const entered = await promptForPassword()
      if (entered === null) return
      password = entered
    }

    const xlsxBlob = await buildResponseXlsx(form.schema, response.answers, responseTimestamp(response), password)
    const xlsxFile = new File([xlsxBlob], `${namePart}-${dateStr}.xlsx`, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const result = await shareFiles([xlsxFile], response.formTitle)
    if (result === 'shared') {
      shareDialogRef.current?.close()
    } else if (result === 'error' || result === 'unsupported') {
      showToast('Kunde inte dela filen', 'error')
    }
  }

  async function handleShareLink() {
    shareDialogRef.current?.close()
    const url = await resolveLinkUrl()
    if (url === 'cancelled') return
    if (!url) {
      showToast('Formuläret är för långt för att delas som länk. Använd Dela eller Exportera istället', 'error')
      return
    }
    const subject = encodeURIComponent(response.formTitle)
    const body = encodeURIComponent(`Här är mitt ifyllda formulär:\n\n${url}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  async function handleOpenQr() {
    shareDialogRef.current?.close()
    const url = await resolveLinkUrl()
    if (url === 'cancelled') return
    if (!url) {
      showToast('Formuläret är för långt för att visas som QR-kod/länk', 'error')
      return
    }
    // Öppna nästa dialog i en ny frame -- att göra det i samma tick som
    // close() lämnar webbläsaren i ett inkonsekvent tillstånd på vissa
    // mobila webbläsare, där den nya dialogens första klick "äts upp".
    requestAnimationFrame(() => qrDialogRef.current?.showModal())
  }

  async function handleCopyLink() {
    if (!activeLinkUrl) return
    try {
      await navigator.clipboard.writeText(activeLinkUrl)
      showToast('Länken är kopierad', 'success')
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
          <>
            <button type="button" className="btn btn--neutral" onClick={handleExportPdf}>
              PDF
            </button>
            <button type="button" className="btn btn--neutral" onClick={handleExportXlsx}>
              XLSX
            </button>
          </>
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
              <button type="button" className="btn btn--neutral" onClick={handleShareXlsx}>
                XLSX
              </button>
            </>
          )}
          <button
            type="button"
            className={!passwordMode && !linkUrl ? 'btn btn--neutral export-dialog__option--muted' : 'btn btn--neutral'}
            title={!passwordMode && !linkUrl ? 'Formuläret är för långt för att delas som länk.' : undefined}
            onClick={handleShareLink}
          >
            Maila länk
          </button>
          <button
            type="button"
            className={!passwordMode && !linkUrl ? 'btn btn--neutral export-dialog__option--muted' : 'btn btn--neutral'}
            title={!passwordMode && !linkUrl ? 'Formuläret är för långt för att visas som QR-kod/länk.' : undefined}
            onClick={handleOpenQr}
          >
            Visa QR-kod/länk
          </button>
        </ExportDialog>
      )}

      {/* Always mounted, not gated on activeLinkUrl -- handleOpenQr calls
          qrDialogRef.current?.showModal() from a requestAnimationFrame right
          after an async password prompt resolves. If this dialog only
          mounted once activeLinkUrl became truthy, that showModal() call
          could race the DOM commit and silently no-op the first time
          (qrDialogRef.current still null), only working on a retry once the
          dialog happened to already be mounted from the previous attempt. */}
      <ExportDialog dialogRef={qrDialogRef} title="QR-kod">
        {activeLinkUrl && (
          <div className="response-actions__qr">
            <div className="response-actions__qr-frame">
              <QRCode value={activeLinkUrl} size={200} />
            </div>
            <div className="response-actions__link-copy">
              <input
                type="text"
                readOnly
                value={activeLinkUrl}
                onFocus={(e) => e.target.select()}
                className="response-actions__link-input"
              />
              <button type="button" className="btn btn--neutral btn--small" onClick={handleCopyLink}>
                Kopiera länk
              </button>
            </div>
          </div>
        )}
      </ExportDialog>

      <CsvNotProtectableModal
        dialogRef={csvWarningDialogRef}
        onExportAnyway={() => {
          if (csvWarningContext === 'export') exportPlainCsv()
          else if (csvWarningContext === 'share') sharePlainCsv()
        }}
        onUseXlsxInstead={
          form
            ? () => {
                if (csvWarningContext === 'export') handleExportXlsx()
                else if (csvWarningContext === 'share') handleShareXlsx()
              }
            : undefined
        }
        onCancel={() => {}}
      />

      {passwordPromptModal}
    </>
  )
}
