import type { Field, FormSchema } from '../lib/formSchema'
import type { FieldAnswerValue, FormAnswers } from '../lib/formAnswers'
import './FormRenderer.css'

interface FormRendererProps {
  schema: FormSchema
  answers?: FormAnswers
  errors?: Record<string, string>
  onAnswerChange?: (fieldId: string, value: FieldAnswerValue) => void
  readOnly?: boolean
}

export function FormRenderer({ schema, answers, errors, onAnswerChange, readOnly }: FormRendererProps) {
  return (
    <div className="form-renderer">
      <h1>{schema.title || 'Namnlöst formulär'}</h1>
      {schema.description && <p className="form-renderer__description">{schema.description}</p>}
      {schema.fields.map((field) => (
        <FormRendererField
          key={field.id}
          field={field}
          answer={answers?.[field.id]}
          error={errors?.[field.id]}
          onAnswerChange={onAnswerChange}
          readOnly={readOnly}
        />
      ))}
    </div>
  )
}

function FormRendererField({
  field,
  answer,
  error,
  onAnswerChange,
  readOnly,
}: {
  field: Field
  answer?: FieldAnswerValue
  error?: string
  onAnswerChange?: (fieldId: string, value: FieldAnswerValue) => void
  readOnly?: boolean
}) {
  const options = field.settings.options ?? []

  switch (field.type) {
    case 'HEADING':
      return <h3 className="form-renderer__heading">{field.label}</h3>

    case 'SUBHEADING':
      return <h4 className="form-renderer__subheading">{field.label}</h4>

    case 'PARAGRAPH':
      return <p className="form-renderer__paragraph">{field.label}</p>

    case 'DIVIDER':
      return <hr className="form-renderer__divider" />

    case 'TEXT': {
      const controlledProps = readOnly
        ? { value: (answer as string) ?? '', disabled: true }
        : onAnswerChange
          ? { value: (answer as string) ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement>) => onAnswerChange(field.id, e.target.value) }
          : {}
      return (
        <label className="form-renderer__field">
          <FieldLabel field={field} />
          <input type="text" {...controlledProps} />
          <FieldError error={error} />
        </label>
      )
    }

    case 'TEXTAREA': {
      const controlledProps = readOnly
        ? { value: (answer as string) ?? '', disabled: true }
        : onAnswerChange
          ? {
              value: (answer as string) ?? '',
              onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onAnswerChange(field.id, e.target.value),
            }
          : {}
      return (
        <label className="form-renderer__field">
          <FieldLabel field={field} />
          <textarea rows={3} {...controlledProps} />
          <FieldError error={error} />
        </label>
      )
    }

    case 'NUMBER': {
      const controlledProps = readOnly
        ? { value: (answer as string) ?? '', disabled: true }
        : onAnswerChange
          ? { value: (answer as string) ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement>) => onAnswerChange(field.id, e.target.value) }
          : {}
      return (
        <label className="form-renderer__field">
          <FieldLabel field={field} />
          <input type="number" {...controlledProps} />
          <FieldError error={error} />
        </label>
      )
    }

    case 'DATE':
    case 'TIME':
    case 'DATETIME': {
      const inputType = field.type === 'DATE' ? 'date' : field.type === 'TIME' ? 'time' : 'datetime-local'
      const controlledProps = readOnly
        ? { value: (answer as string) ?? '', disabled: true }
        : onAnswerChange
          ? { value: (answer as string) ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement>) => onAnswerChange(field.id, e.target.value) }
          : {}
      return (
        <label className="form-renderer__field">
          <FieldLabel field={field} />
          <input type={inputType} {...controlledProps} />
          <FieldError error={error} />
        </label>
      )
    }

    case 'CHECKBOX': {
      const controlledProps = readOnly
        ? { checked: answer === true, disabled: true }
        : onAnswerChange
          ? { checked: answer === true, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onAnswerChange(field.id, e.target.checked) }
          : {}
      return (
        <div className="form-renderer__field">
          <label className="form-renderer__checkbox-row">
            <input type="checkbox" {...controlledProps} />
            <FieldLabel field={field} />
          </label>
          <FieldError error={error} />
        </div>
      )
    }

    case 'SINGLE_CHOICE':
      return (
        <fieldset className="form-renderer__fieldset">
          <legend>
            <FieldLabel field={field} />
          </legend>
          {options.map((option, index) => {
            const controlledProps = readOnly
              ? { checked: answer === option, disabled: true }
              : onAnswerChange
                ? { checked: answer === option, onChange: () => onAnswerChange(field.id, option) }
                : {}
            return (
              <label key={index} className="form-renderer__checkbox-row">
                <input type="radio" name={field.id} {...controlledProps} />
                {option}
              </label>
            )
          })}
          <FieldError error={error} />
        </fieldset>
      )

    case 'MULTIPLE_CHOICE': {
      const selected = Array.isArray(answer) ? answer : []
      return (
        <fieldset className="form-renderer__fieldset">
          <legend>
            <FieldLabel field={field} />
          </legend>
          {options.map((option, index) => {
            const controlledProps = readOnly
              ? { checked: selected.includes(option), disabled: true }
              : onAnswerChange
                ? {
                    checked: selected.includes(option),
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                      const next = e.target.checked ? [...selected, option] : selected.filter((o) => o !== option)
                      onAnswerChange(field.id, next)
                    },
                  }
                : {}
            return (
              <label key={index} className="form-renderer__checkbox-row">
                <input type="checkbox" {...controlledProps} />
                {option}
              </label>
            )
          })}
          <FieldError error={error} />
        </fieldset>
      )
    }

    case 'SCALE': {
      const min = field.settings.min ?? 1
      const max = field.settings.max ?? 5
      const defaultValue = Math.round((min + max) / 2)
      const currentValue = readOnly || onAnswerChange ? ((answer as number) ?? defaultValue) : defaultValue
      const rangePercent = (currentValue - min) / (max - min)
      const controlledProps = readOnly
        ? { value: currentValue, disabled: true }
        : onAnswerChange
          ? {
              value: currentValue,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => onAnswerChange(field.id, Number(e.target.value)),
            }
          : { defaultValue }
      return (
        <div className="form-renderer__field">
          <FieldLabel field={field} />
          <div className="form-renderer__scale-track">
            <input
              type="range"
              min={min}
              max={max}
              className="form-renderer__scale-input"
              style={{ '--range-percent': rangePercent } as React.CSSProperties}
              onInput={(e) => {
                const percent = (Number(e.currentTarget.value) - min) / (max - min)
                e.currentTarget.style.setProperty('--range-percent', String(percent))
              }}
              {...controlledProps}
            />
          </div>
          <div className="form-renderer__scale-labels">
            <span>{field.settings.minLabel ?? min}</span>
            <span>{field.settings.maxLabel ?? max}</span>
          </div>
        </div>
      )
    }
  }
}

function FieldLabel({ field }: { field: Field }) {
  return (
    <span className="form-renderer__label">
      {field.label}
      {field.required && <span className="form-renderer__required-mark"> *</span>}
    </span>
  )
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return <p className="form-renderer__error">{error}</p>
}
