import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import type { FormSchema } from '../lib/formSchema'
import type { FieldAnswerValue, FormAnswers } from '../lib/formAnswers'
import { validateRequiredFields } from '../lib/formAnswers'
import { useToast } from './toastContext'
import { FormRenderer } from './FormRenderer'
import './FormFiller.css'

interface FormFillerProps {
  schema: FormSchema
  initialAnswers: FormAnswers
  submitLabel: string
  savingLabel: string
  successToast: string
  errorToast: string
  confirmation: { title: string; message: string }
  onSubmit: (answers: FormAnswers) => Promise<void>
}

export function FormFiller({
  schema,
  initialAnswers,
  submitLabel,
  savingLabel,
  successToast,
  errorToast,
  confirmation,
  onSubmit,
}: FormFillerProps) {
  const [answers, setAnswers] = useState<FormAnswers>(initialAnswers)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { showToast } = useToast()

  function handleAnswerChange(fieldId: string, value: FieldAnswerValue) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const validationErrors = validateRequiredFields(schema, answers)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      showToast('Fyll i de obligatoriska fälten', 'error')
      return
    }

    setIsSaving(true)
    try {
      await onSubmit(answers)
      setSubmitted(true)
      showToast(successToast, 'success')
    } catch {
      showToast(errorToast, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (submitted) {
    return (
      <div className="form-filler__confirmation">
        <h1>{confirmation.title}</h1>
        <p>{confirmation.message}</p>
        <Link to="/">Till startsidan</Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="form-filler">
      <FormRenderer schema={schema} answers={answers} errors={errors} onAnswerChange={handleAnswerChange} />
      <button type="submit" className="btn btn--primary form-filler__submit" disabled={isSaving}>
        {isSaving ? savingLabel : submitLabel}
      </button>
    </form>
  )
}
