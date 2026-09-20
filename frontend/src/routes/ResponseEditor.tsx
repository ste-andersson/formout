import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getFormBySlugWithFallback } from '../lib/api'
import type { FormDetail } from '../lib/api'
import { defaultAnswersFor } from '../lib/formAnswers'
import type { SavedResponse } from '../lib/responseStorage'
import { deleteResponse, getResponse, updateResponse } from '../lib/responseStorage'
import { useToast } from '../components/toastContext'
import { FormFiller } from '../components/FormFiller'
import { ResponseActions } from '../components/ResponseActions'
import { useOfflineMode } from '../components/offlineModeContext'
import { useTranslation } from '../components/languageContext'
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
  // Captured on submit so the confirmation screen's Share/Export reflect the
  // just-saved answers, not the ones the page loaded with.
  const [savedResponse, setSavedResponse] = useState<SavedResponse | null>(null)
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { offlineMode } = useOfflineMode()
  const { t } = useTranslation()

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
        getFormBySlugWithFallback(response.formSlug, offlineMode)
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
  }, [responseId, offlineMode])

  async function handleDelete(response: SavedResponse) {
    try {
      await deleteResponse(response.id)
      showToast(t.responseEditor.deleteSuccessToast, 'success')
      navigate('/')
    } catch {
      showToast(t.responseEditor.deleteErrorToast, 'error')
    }
  }

  if (state.status === 'loading') {
    return <p>{t.responseEditor.loading}</p>
  }

  if (state.status === 'not-found') {
    return (
      <div>
        <h1>{t.responseEditor.notFoundTitle}</h1>
        <Link to="/">{t.common.back}</Link>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div>
        <h1>{t.errorBoundary.title}</h1>
        <p>{t.responseEditor.errorMessage}</p>
        <Link to="/">{t.common.back}</Link>
      </div>
    )
  }

  const { response } = state
  const form = state.status === 'loaded' ? state.form : undefined
  // Once saved, the confirmation screen below takes over with its own
  // Share/Export/Back -- keeping this bar too would just duplicate them.
  const submitted = savedResponse !== null

  return (
    <div className="response-editor">
      {!submitted && (
        <ResponseActions response={response} form={form} className="response-editor__actions">
          <button type="button" className="btn btn--neutral" onClick={() => handleDelete(response)}>
            {t.responseEditor.remove}
          </button>
        </ResponseActions>
      )}

      {state.status === 'form-unavailable' && (
        <div>
          <h1>{response.formTitle}</h1>
          <p>{t.responseEditor.formUnavailableMessage}</p>
        </div>
      )}

      {state.status === 'loaded' && (
        <FormFiller
          schema={state.form.schema}
          initialAnswers={{ ...defaultAnswersFor(state.form.schema), ...response.answers }}
          submitLabel={t.responseEditor.submitLabel}
          savingLabel={t.responseEditor.savingLabel}
          successToast={t.responseEditor.successToast}
          errorToast={t.responseEditor.errorToast}
          confirmation={{
            title: t.responseEditor.savedTitle,
            message: t.responseEditor.savedMessage,
            actions: savedResponse ? (
              <ResponseActions response={savedResponse} form={state.form} className="form-filler__confirmation-actions">
                <Link to="/" className="btn btn--neutral">
                  {t.common.back}
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
