import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getFormBySlugWithFallback } from '../lib/api'
import type { FormDetail } from '../lib/api'
import { defaultAnswersFor } from '../lib/formAnswers'
import type { SavedResponse } from '../lib/responseStorage'
import { createResponse } from '../lib/responseStorage'
import { recordFormVisit } from '../lib/visitedForms'
import { FormFiller } from '../components/FormFiller'
import { ResponseActions } from '../components/ResponseActions'
import { useOfflineMode } from '../components/offlineModeContext'
import { useTranslation } from '../components/languageContext'

type LoadState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'loaded'; form: FormDetail }

export function FormViewer() {
  const { slug } = useParams<{ slug: string }>()
  return <FormViewerContent key={slug} slug={slug} />
}

function FormViewerContent({ slug }: { slug?: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  // Captured on submit so the confirmation screen can offer Share/Export/
  // Edit for the response that was just saved.
  const [savedResponse, setSavedResponse] = useState<SavedResponse | null>(null)
  const { offlineMode } = useOfflineMode()
  const { t } = useTranslation()

  useEffect(() => {
    if (!slug) {
      return
    }

    let cancelled = false

    getFormBySlugWithFallback(slug, offlineMode)
      .then((form) => {
        if (cancelled) return
        setState(form ? { status: 'loaded', form } : { status: 'not-found' })
        // Record the visit even if the component unmounts before this
        // resolves -- it's a fire-and-forget local write, not tied to render.
        if (form) {
          recordFormVisit(form).catch((error: unknown) => {
            console.error('Could not save visited form locally', error)
          })
        }
      })
      .catch(() => {
        if (cancelled) return
        setState({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [slug, offlineMode])

  if (state.status === 'loading') {
    return <p>{t.formViewer.loading}</p>
  }

  if (state.status === 'not-found') {
    return (
      <div>
        <h1>{t.formViewer.notFoundTitle}</h1>
        <p>{t.formViewer.notFoundMessage}</p>
        <Link to="/">{t.common.back}</Link>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div>
        <h1>{t.errorBoundary.title}</h1>
        <p>{t.formViewer.errorMessage}</p>
        <Link to="/">{t.common.back}</Link>
      </div>
    )
  }

  const { form } = state

  return (
    <FormFiller
      schema={form.schema}
      initialAnswers={defaultAnswersFor(form.schema)}
      submitLabel={t.formViewer.submitLabel}
      savingLabel={t.formViewer.savingLabel}
      successToast={t.formViewer.successToast}
      errorToast={t.formViewer.errorToast}
      confirmation={{
        title: t.formViewer.savedTitle,
        message: t.formViewer.savedMessage,
        actions: savedResponse ? (
          <ResponseActions response={savedResponse} form={form} className="form-filler__confirmation-actions">
            <Link to={`/responses/${savedResponse.id}`} className="btn btn--neutral">
              {t.formViewer.edit}
            </Link>
            <Link to="/" className="btn btn--neutral">
              {t.common.back}
            </Link>
          </ResponseActions>
        ) : undefined,
      }}
      onSubmit={(answers) =>
        createResponse({
          formId: form.id,
          formSlug: form.slug,
          formTitle: form.title,
          formVersion: form.currentVersion,
          answers,
        }).then((saved) => {
          setSavedResponse(saved)
        })
      }
    />
  )
}
