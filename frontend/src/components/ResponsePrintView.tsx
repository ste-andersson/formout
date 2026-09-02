import type { Field, FormSchema } from '../lib/formSchema'
import type { FieldAnswerValue, FormAnswers } from '../lib/formAnswers'
import { formatResponseDateTime } from '../lib/responseFormat'
import './ResponsePrintView.css'

interface ResponsePrintViewProps {
  schema: FormSchema
  answers: FormAnswers
  filledInAt: string
}

export function ResponsePrintView({ schema, answers, filledInAt }: ResponsePrintViewProps) {
  return (
    <div className="response-print">
      <h1>{schema.title || 'Namnlöst formulär'}</h1>
      <p className="response-print__meta">Ifyllt: {formatResponseDateTime(filledInAt)}</p>
      {schema.sections.map((section) => (
        <section key={section.id} className="response-print__section">
          <h2>{section.title}</h2>
          {section.fields.map((field) => (
            <ResponsePrintField key={field.id} field={field} answer={answers[field.id]} />
          ))}
        </section>
      ))}
    </div>
  )
}

function ResponsePrintField({ field, answer }: { field: Field; answer: FieldAnswerValue | undefined }) {
  const options = field.settings.options ?? []

  switch (field.type) {
    case 'HEADING':
      return <h3 className="response-print__heading">{field.label}</h3>

    case 'SUBHEADING':
      return <h4 className="response-print__subheading">{field.label}</h4>

    case 'PARAGRAPH':
      return <p className="response-print__paragraph">{field.label}</p>

    case 'TEXT':
    case 'NUMBER':
      return (
        <div className="response-print__field">
          <p className="response-print__label">{field.label}</p>
          <div className="response-print__box">{typeof answer === 'string' ? answer : ''}</div>
        </div>
      )

    case 'TEXTAREA':
      return (
        <div className="response-print__field">
          <p className="response-print__label">{field.label}</p>
          <div className="response-print__box response-print__box--tall">
            {typeof answer === 'string' ? answer : ''}
          </div>
        </div>
      )

    case 'CHECKBOX': {
      const checked = answer === true
      return (
        <div className="response-print__field response-print__field--row">
          <span className={`response-print__checkbox${checked ? ' response-print__checkbox--checked' : ''}`}>
            {checked ? '✓' : ''}
          </span>
          <span className="response-print__label">{field.label}</span>
        </div>
      )
    }

    case 'SINGLE_CHOICE':
      return (
        <div className="response-print__field">
          <p className="response-print__label">{field.label}</p>
          {options.map((option, index) => {
            const checked = answer === option
            return (
              <div key={index} className="response-print__field--row">
                <span className={`response-print__radio${checked ? ' response-print__radio--checked' : ''}`} />
                <span>{option}</span>
              </div>
            )
          })}
        </div>
      )

    case 'MULTIPLE_CHOICE': {
      const selected = Array.isArray(answer) ? answer : []
      return (
        <div className="response-print__field">
          <p className="response-print__label">{field.label}</p>
          {options.map((option, index) => {
            const checked = selected.includes(option)
            return (
              <div key={index} className="response-print__field--row">
                <span className={`response-print__checkbox${checked ? ' response-print__checkbox--checked' : ''}`}>
                  {checked ? '✓' : ''}
                </span>
                <span>{option}</span>
              </div>
            )
          })}
        </div>
      )
    }

    case 'SCALE': {
      const min = field.settings.min ?? 1
      const max = field.settings.max ?? 5
      const value = typeof answer === 'number' ? answer : Math.round((min + max) / 2)
      const position = ((value - min) / (max - min)) * 100
      return (
        <div className="response-print__field">
          <p className="response-print__label">{field.label}</p>
          <div className="response-print__scale-track">
            <span className="response-print__scale-marker" style={{ left: `${position}%` }} />
          </div>
          <div className="response-print__scale-labels">
            <span>{field.settings.minLabel ?? min}</span>
            <span>{field.settings.maxLabel ?? max}</span>
          </div>
        </div>
      )
    }
  }
}
