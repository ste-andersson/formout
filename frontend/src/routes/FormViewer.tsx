import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getFormBySlug } from '../lib/api'
import type { FormDetail } from '../lib/api'
import { defaultAnswersFor } from '../lib/formAnswers'
import { createResponse } from '../lib/responseStorage'
import { FormFiller } from '../components/FormFiller'

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

  useEffect(() => {
    if (!slug) {
      return
    }

    let cancelled = false

    getFormBySlug(slug)
      .then((form) => {
        if (cancelled) return
        setState(form ? { status: 'loaded', form } : { status: 'not-found' })
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
      confirmation={{ title: 'Tack!', message: 'Dina svar är sparade på den här enheten.' }}
      onSubmit={(answers) =>
        createResponse({
          formId: form.id,
          formSlug: form.slug,
          formTitle: form.title,
          formVersion: form.currentVersion,
          answers,
        }).then(() => {})
      }
    />
  )
}
