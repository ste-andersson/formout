import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getFormBySlug } from '../lib/api'
import type { FormDetail } from '../lib/api'
import { defaultAnswersFor } from '../lib/formAnswers'
import type { SavedResponse } from '../lib/responseStorage'
import { createResponse } from '../lib/responseStorage'
import { recordFormVisit } from '../lib/visitedForms'
import { FormFiller } from '../components/FormFiller'
import { ResponseActions } from '../components/ResponseActions'

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
  // Captured on submit so the confirmation screen can offer Dela/Exportera/
  // Ändra for the response that was just saved.
  const [savedResponse, setSavedResponse] = useState<SavedResponse | null>(null)

  useEffect(() => {
    if (!slug) {
      return
    }

    let cancelled = false

    getFormBySlug(slug)
      .then((form) => {
        if (cancelled) return
        setState(form ? { status: 'loaded', form } : { status: 'not-found' })
        // Record the visit even if the component unmounts before this
        // resolves -- it's a fire-and-forget local write, not tied to render.
        if (form) {
          recordFormVisit(form).catch((error: unknown) => {
            console.error('Kunde inte spara besökt formulär lokalt', error)
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
  }, [slug])

  if (state.status === 'loading') {
    return <p>Laddar formulär…</p>
  }

  if (state.status === 'not-found') {
    return (
      <div>
        <h1>Formuläret hittades inte</h1>
        <p>Kontrollera att koden stämmer.</p>
        <Link to="/">Tillbaka</Link>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div>
        <h1>Något gick fel</h1>
        <p>Kunde inte hämta formuläret just nu.</p>
        <Link to="/">Tillbaka</Link>
      </div>
    )
  }

  const { form } = state

  return (
    <FormFiller
      schema={form.schema}
      initialAnswers={defaultAnswersFor(form.schema)}
      submitLabel="Spara på enheten"
      savingLabel="Sparar…"
      successToast="Formuläret är ifyllt"
      errorToast="Kunde inte spara svaret lokalt"
      confirmation={{
        title: 'Sparat!',
        message: 'Dina svar har nu sparats på den här enheten.',
        actions: savedResponse ? (
          <ResponseActions response={savedResponse} form={form} className="form-filler__confirmation-actions">
            <Link to={`/responses/${savedResponse.id}`} className="btn btn--neutral">
              Ändra
            </Link>
            <Link to="/" className="btn btn--neutral">
              Tillbaka
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
