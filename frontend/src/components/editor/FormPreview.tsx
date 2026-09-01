import type { Field, FormSchema } from '../../lib/formSchema'
import './FormPreview.css'

interface FormPreviewProps {
  schema: FormSchema
}

export function FormPreview({ schema }: FormPreviewProps) {
  return (
    <div className="form-preview">
      <h1>{schema.title || 'Namnlöst formulär'}</h1>
      {schema.description && <p className="form-preview__description">{schema.description}</p>}
      {schema.sections.map((section) => (
        <section key={section.id} className="form-preview__section">
          <h2>{section.title}</h2>
          {section.fields.map((field) => (
            <FormPreviewField key={field.id} field={field} />
          ))}
        </section>
      ))}
    </div>
  )
}

function FormPreviewField({ field }: { field: Field }) {
  const options = field.settings.options ?? []

  switch (field.type) {
    case 'HEADING':
      return <h3 className="form-preview__heading">{field.label}</h3>

    case 'SUBHEADING':
      return <h4 className="form-preview__subheading">{field.label}</h4>

    case 'PARAGRAPH':
      return <p className="form-preview__paragraph">{field.label}</p>

    case 'TEXT':
      return (
        <label className="form-preview__field">
          <FieldLabel field={field} />
          <input type="text" />
        </label>
      )

    case 'TEXTAREA':
      return (
        <label className="form-preview__field">
          <FieldLabel field={field} />
          <textarea rows={3} />
        </label>
      )

    case 'NUMBER':
      return (
        <label className="form-preview__field">
          <FieldLabel field={field} />
          <input type="number" />
        </label>
      )

    case 'CHECKBOX':
      return (
        <label className="form-preview__checkbox-row">
          <input type="checkbox" />
          <FieldLabel field={field} />
        </label>
      )

    case 'SINGLE_CHOICE':
      return (
        <fieldset className="form-preview__fieldset">
          <legend>
            <FieldLabel field={field} />
          </legend>
          {options.map((option, index) => (
            <label key={index} className="form-preview__checkbox-row">
              <input type="radio" name={field.id} />
              {option}
            </label>
          ))}
        </fieldset>
      )

    case 'MULTIPLE_CHOICE':
      return (
        <fieldset className="form-preview__fieldset">
          <legend>
            <FieldLabel field={field} />
          </legend>
          {options.map((option, index) => (
            <label key={index} className="form-preview__checkbox-row">
              <input type="checkbox" />
              {option}
            </label>
          ))}
        </fieldset>
      )

    case 'SCALE': {
      const min = field.settings.min ?? 1
      const max = field.settings.max ?? 5
      return (
        <div className="form-preview__field">
          <FieldLabel field={field} />
          <div className="form-preview__scale-track">
            <input type="range" min={min} max={max} defaultValue={Math.round((min + max) / 2)} />
          </div>
          <div className="form-preview__scale-labels">
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
    <span className="form-preview__label">
      {field.label}
      {field.required && <span className="form-preview__required-mark"> *</span>}
    </span>
  )
}
