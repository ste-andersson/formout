import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import QRCode from 'react-qr-code'
import { getFormBySlug } from '../lib/api'
import type { FormDetail } from '../lib/api'
import { defaultAnswersFor } from '../lib/formAnswers'
import type { SavedResponse } from '../lib/responseStorage'
import { deleteResponse, getResponse, responseTimestamp, updateResponse } from '../lib/responseStorage'
import { buildCsvFile, buildResponseCsv, buildResponseCsvFallback, downloadCsv } from '../lib/responseExport'
import { buildResponsePdf, downloadPdf } from '../lib/responsePdf'
import { isWebShareSupported, shareFiles } from '../lib/webShare'
import { buildSharedResponseUrl } from '../lib/sharedResponseLink'
import { useToast } from '../components/toastContext'
import { FormFiller } from '../components/FormFiller'
import { ExportDialog } from '../components/ExportDialog'
import './ResponseEditor.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'form-unavailable'; response: SavedResponse }
  | { status: 'loaded'; response: SavedResponse; form: FormDetail }

export function ResponseEditor() {
  const { responseId } = useParams<{ responseId: string }>()
  return <ResponseEditorContent key={responseId} responseId={responseId} />
}

function ResponseEditorContent({ responseId }: { responseId?: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const navigate = useNavigate()
  const { showToast } = useToast()
  const exportDialogRef = useRef<HTMLDialogElement>(null)
  const shareDialogRef = useRef<HTMLDialogElement>(null)
  const qrDialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!responseId) {
      return
    }

    let cancelled = false

    getResponse(responseId)
      .then((response) => {
        if (cancelled) return
        if (!response) {
          setState({ status: 'not-found' })
          return
        }
        getFormBySlug(response.formSlug)
          .then((form) => {
            if (cancelled) return
            setState(form ? { status: 'loaded', response, form } : { status: 'form-unavailable', response })
          })
          .catch(() => {
            if (cancelled) return
            setState({ status: 'error' })
          })
      })
      .catch(() => {
        if (cancelled) return
        setState({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [responseId])

  function safeFilenamePart(title: string): string {
    return title.replace(/[^a-zA-Z0-9åäöÅÄÖ]+/g, '-').replace(/^-+|-+$/g, '') || 'formular'
  }

  function handleExportCsv(response: SavedResponse, form?: FormDetail) {
    const csv = form ? buildResponseCsv(form.schema, response.answers) : buildResponseCsvFallback(response.answers)
    const dateStr = responseTimestamp(response).slice(0, 10)
    downloadCsv(`${safeFilenamePart(response.formTitle)}-${dateStr}.csv`, csv)
    exportDialogRef.current?.close()
  }

  function handleExportPdf(response: SavedResponse, form: FormDetail) {
    const pdf = buildResponsePdf(form.schema, response.answers, responseTimestamp(response))
    const dateStr = responseTimestamp(response).slice(0, 10)
    downloadPdf(`${safeFilenamePart(response.formTitle)}-${dateStr}.pdf`, pdf)
    exportDialogRef.current?.close()
  }

  async function handleShareCsv(response: SavedResponse, form: FormDetail) {
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

  async function handleSharePdf(response: SavedResponse, form: FormDetail) {
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

  function handleShareLink(linkUrl: string | null, formTitle: string) {
    if (!linkUrl) {
      showToast('Formuläret är för långt för att delas som länk. Använd Dela eller Exportera istället.', 'error')
      return
    }
    const subject = encodeURIComponent(formTitle)
    const body = encodeURIComponent(`Här är mitt ifyllda formulär:\n\n${linkUrl}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
    shareDialogRef.current?.close()
  }

  async function handleCopyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      showToast('Länk kopierad', 'success')
    } catch {
      showToast('Kunde inte kopiera länken', 'error')
    }
  }

  async function handleDelete(response: SavedResponse) {
    try {
      await deleteResponse(response.id)
      showToast('Svaret är raderat', 'success')
      navigate('/')
    } catch {
      showToast('Kunde inte radera svaret', 'error')
    }
  }

  if (state.status === 'loading') {
    return <p>Laddar…</p>
  }

  if (state.status === 'not-found') {
    return (
      <div>
        <h1>Svaret hittades inte</h1>
        <Link to="/">Tillbaka</Link>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div>
        <h1>Något gick fel</h1>
        <p>Kunde inte hämta svaret just nu.</p>
        <Link to="/">Tillbaka</Link>
      </div>
    )
  }

  const { response } = state
  const form = state.status === 'loaded' ? state.form : undefined
  const linkUrl = form
    ? buildSharedResponseUrl({
        formSlug: response.formSlug,
        formTitle: response.formTitle,
        answers: response.answers,
        filledInAt: responseTimestamp(response),
      })
    : null

  return (
    <div className="response-editor">
      <div className="response-editor__actions">
        <button type="button" onClick={() => exportDialogRef.current?.showModal()}>
          Exportera
        </button>
        {form && (
          <button type="button" onClick={() => shareDialogRef.current?.showModal()}>
            Dela
          </button>
        )}
        <button type="button" onClick={() => handleDelete(response)}>
          Ta bort
        </button>
      </div>

      <ExportDialog dialogRef={exportDialogRef} title="Exportera">
        <button type="button" onClick={() => handleExportCsv(response, form)}>
          CSV
        </button>
        {form && (
          <button type="button" onClick={() => handleExportPdf(response, form)}>
            PDF
          </button>
        )}
      </ExportDialog>

      {form && (
        <ExportDialog dialogRef={shareDialogRef} title="Dela">
          {isWebShareSupported() && (
            <>
              <button type="button" onClick={() => handleShareCsv(response, form)}>
                CSV
              </button>
              <button type="button" onClick={() => handleSharePdf(response, form)}>
                PDF
              </button>
            </>
          )}
          <button
            type="button"
            className={linkUrl ? undefined : 'export-dialog__option--muted'}
            title={linkUrl ? undefined : 'Formuläret är för långt för att delas som länk.'}
            onClick={() => handleShareLink(linkUrl, response.formTitle)}
          >
            Maila länk
          </button>
          <button
            type="button"
            className={linkUrl ? undefined : 'export-dialog__option--muted'}
            title={linkUrl ? undefined : 'Formuläret är för långt för att visas som QR-kod/länk.'}
            onClick={() => {
              if (!linkUrl) {
                showToast('Formuläret är för långt för att visas som QR-kod/länk.', 'error')
                return
              }
              shareDialogRef.current?.close()
              qrDialogRef.current?.showModal()
            }}
          >
            Visa QR/länk
          </button>
        </ExportDialog>
      )}

      {linkUrl && (
        <ExportDialog dialogRef={qrDialogRef} title="QR-kod">
          <div className="response-editor__qr">
            <div className="response-editor__qr-frame">
              <QRCode value={linkUrl} size={200} />
            </div>
            <div className="response-editor__link-copy">
              <input
                type="text"
                readOnly
                value={linkUrl}
                onFocus={(e) => e.target.select()}
                className="response-editor__link-input"
              />
              <button type="button" onClick={() => handleCopyLink(linkUrl)}>
                Kopiera länk
              </button>
            </div>
          </div>
        </ExportDialog>
      )}

      {state.status === 'form-unavailable' && (
        <div>
          <h1>{response.formTitle}</h1>
          <p>Formulärmallen finns inte längre. Du kan fortfarande exportera eller ta bort ditt sparade svar.</p>
        </div>
      )}

      {state.status === 'loaded' && (
        <FormFiller
          schema={state.form.schema}
          initialAnswers={{ ...defaultAnswersFor(state.form.schema), ...response.answers }}
          submitLabel="Spara ändringar"
          savingLabel="Sparar…"
          successToast="Ändringarna är sparade"
          errorToast="Kunde inte spara ändringarna"
          confirmation={{ title: 'Sparat', message: 'Ändringarna är sparade.' }}
          onSubmit={(answers) =>
            updateResponse(response.id, { answers, formVersion: state.form.currentVersion }).then(() => {})
          }
        />
      )}
    </div>
  )
}
