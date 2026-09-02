import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { getFormBySlug } from '../lib/api'
import type { FormDetail } from '../lib/api'
import { defaultAnswersFor, validateRequiredFields } from '../lib/formAnswers'
import type { FieldAnswerValue, FormAnswers } from '../lib/formAnswers'
import { useToast } from '../components/toastContext'
import { FormRenderer } from '../components/FormRenderer'
import './FormViewer.css'

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
  const [answers, setAnswers] = useState<FormAnswers>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (!slug) {
      return
    }

    let cancelled = false

    getFormBySlug(slug)
      .then((form) => {
        if (cancelled) return
        if (form) {
          setState({ status: 'loaded', form })
          setAnswers(defaultAnswersFor(form.schema))
        } else {
          setState({ status: 'not-found' })
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

  function handleAnswerChange(fieldId: string, value: FieldAnswerValue) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }))
  }

  function handleSubmit(event: FormEvent, form: FormDetail) {
    event.preventDefault()
    const validationErrors = validateRequiredFields(form.schema, answers)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      showToast('Fyll i de obligatoriska fälten', 'error')
      return
    }
    setSubmitted(true)
    showToast('Formuläret är ifyllt', 'success')
  }

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

  if (submitted) {
    return (
      <div className="form-viewer__confirmation">
        <h1>Tack!</h1>
        <p>Dina svar är ifyllda. Lokal sparning av svaren kommer i ett senare steg.</p>
        <Link to="/">Till startsidan</Link>
      </div>
    )
  }

  return (
    <form onSubmit={(event) => handleSubmit(event, form)} className="form-viewer">
      <FormRenderer schema={form.schema} answers={answers} errors={errors} onAnswerChange={handleAnswerChange} />
      <button type="submit" className="form-viewer__submit">
        Skicka in
      </button>
    </form>
  )
}
