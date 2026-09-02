import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getFormBySlug } from '../lib/api'
import type { FormDetail } from '../lib/api'
import { defaultAnswersFor } from '../lib/formAnswers'
import type { SavedResponse } from '../lib/responseStorage'
import { deleteResponse, getResponse, responseTimestamp, updateResponse } from '../lib/responseStorage'
import { buildResponseCsv, buildResponseCsvFallback, downloadCsv } from '../lib/responseExport'
import { useToast } from '../components/toastContext'
import { FormFiller } from '../components/FormFiller'
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

  function handleExportCsv(response: SavedResponse, form?: FormDetail) {
    const csv = form ? buildResponseCsv(form.schema, response.answers) : buildResponseCsvFallback(response.answers)
    const safeTitle = response.formTitle.replace(/[^a-zA-Z0-9åäöÅÄÖ]+/g, '-').replace(/^-+|-+$/g, '') || 'formular'
    const dateStr = responseTimestamp(response).slice(0, 10)
    downloadCsv(`${safeTitle}-${dateStr}.csv`, csv)
    exportDialogRef.current?.close()
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

  return (
    <div className="response-editor">
      <div className="response-editor__actions">
        <button type="button" onClick={() => exportDialogRef.current?.showModal()}>
          Exportera
        </button>
        <button type="button" onClick={() => handleDelete(response)}>
          Ta bort
        </button>
      </div>

      <dialog ref={exportDialogRef} className="response-editor__export-dialog">
        <h2>Exportera</h2>
        <div className="response-editor__export-options">
          <button type="button" onClick={() => handleExportCsv(response, form)}>
            CSV
          </button>
        </div>
        <button type="button" onClick={() => exportDialogRef.current?.close()}>
          Avbryt
        </button>
      </dialog>

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
