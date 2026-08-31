import type { Field } from '../../lib/formSchema'
import './FieldPreview.css'

interface FieldPreviewProps {
  field: Field
}

export function FieldPreview({ field }: FieldPreviewProps) {
  return (
    <div className="field-preview">
      <FieldPreviewBody field={field} />
    </div>
  )
}

function FieldPreviewBody({ field }: FieldPreviewProps) {
  const options = field.settings.options ?? []

  switch (field.type) {
    case 'HEADING':
      return <h2 className="field-preview__heading">{field.label || 'Rubrik'}</h2>

    case 'SUBHEADING':
      return <h3 className="field-preview__subheading">{field.label || 'Underrubrik'}</h3>

    case 'PARAGRAPH':
      return <p className="field-preview__paragraph">{field.label || 'Förklarande text'}</p>

    case 'TEXT':
      return (
        <label className="field-preview__label">
          {field.label}
          <input type="text" disabled placeholder={field.label} />
        </label>
      )

    case 'TEXTAREA':
      return (
        <label className="field-preview__label">
          {field.label}
          <textarea disabled placeholder={field.label} rows={3} />
        </label>
      )

    case 'NUMBER':
      return (
        <label className="field-preview__label">
          {field.label}
          <input type="number" disabled placeholder={field.label} />
        </label>
      )

    case 'CHECKBOX':
      return (
        <label className="field-preview__checkbox-row">
          <input type="checkbox" disabled />
          {field.label}
        </label>
      )

    case 'SINGLE_CHOICE':
      return (
        <fieldset className="field-preview__fieldset">
          <legend>{field.label}</legend>
          {options.map((option, index) => (
            <label key={index} className="field-preview__checkbox-row">
              <input type="radio" name={field.id} disabled />
              {option}
            </label>
          ))}
        </fieldset>
      )

    case 'MULTIPLE_CHOICE':
      return (
        <fieldset className="field-preview__fieldset">
          <legend>{field.label}</legend>
          {options.map((option, index) => (
            <label key={index} className="field-preview__checkbox-row">
              <input type="checkbox" disabled />
              {option}
            </label>
          ))}
        </fieldset>
      )

    case 'SCALE': {
      const min = field.settings.min ?? 1
      const max = field.settings.max ?? 5
      return (
        <div className="field-preview__scale">
          <span>{field.label}</span>
          <div className="field-preview__scale-track">
            <span>{field.settings.minLabel ?? min}</span>
            <input type="range" disabled min={min} max={max} />
            <span>{field.settings.maxLabel ?? max}</span>
          </div>
        </div>
      )
    }
  }
}
