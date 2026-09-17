import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getFormBySlug } from '../lib/api'
import type { FormDetail } from '../lib/api'
import { defaultAnswersFor } from '../lib/formAnswers'
import type { SavedResponse } from '../lib/responseStorage'
import { deleteResponse, getResponse, updateResponse } from '../lib/responseStorage'
import { useToast } from '../components/toastContext'
import { FormFiller } from '../components/FormFiller'
import { ResponseActions } from '../components/ResponseActions'
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
  // Captured on submit so the confirmation screen's Dela/Exportera reflect
  // the just-saved answers, not the ones the page loaded with.
  const [savedResponse, setSavedResponse] = useState<SavedResponse | null>(null)
  const navigate = useNavigate()
  const { showToast } = useToast()

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
  // Once saved, the confirmation screen below takes over with its own
  // Dela/Exportera/Tillbaka -- keeping this bar too would just duplicate them.
  const submitted = savedResponse !== null

  return (
    <div className="response-editor">
      {!submitted && (
        <ResponseActions response={response} form={form} className="response-editor__actions">
          <button type="button" className="btn btn--neutral" onClick={() => handleDelete(response)}>
            Ta bort
          </button>
        </ResponseActions>
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
          confirmation={{
            title: 'Sparat!',
            message: 'Dina ändringar har nu sparats på den här enheten.',
            actions: savedResponse ? (
              <ResponseActions response={savedResponse} form={state.form} className="form-filler__confirmation-actions">
                <Link to="/" className="btn btn--neutral">
                  Tillbaka
                </Link>
              </ResponseActions>
            ) : undefined,
          }}
          onSubmit={(answers) =>
            updateResponse(response.id, { answers, formVersion: state.form.currentVersion }).then((updated) => {
              setSavedResponse(updated)
            })
          }
        />
      )}
    </div>
  )
}
