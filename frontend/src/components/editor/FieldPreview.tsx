import { useEffect, useRef } from 'react'
import type { Field, FieldSettings } from '../../lib/formSchema'
import { isContentBlock } from '../../lib/formSchema'
import './FieldPreview.css'

interface FieldPreviewProps {
  field: Field
  autoFocus: boolean
  onChange: (patch: Partial<Field>) => void
  onFocused: () => void
}

export function FieldPreview({ field, autoFocus, onChange, onFocused }: FieldPreviewProps) {
  const primaryElRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const primaryRef = (el: HTMLInputElement | HTMLTextAreaElement | null) => {
    primaryElRef.current = el
  }

  useEffect(() => {
    if (autoFocus && primaryElRef.current) {
      primaryElRef.current.focus()
      primaryElRef.current.select()
      onFocused()
    }
  }, [autoFocus, onFocused])

  function updateSettings(patch: Partial<FieldSettings>) {
    onChange({ settings: { ...field.settings, ...patch } })
  }

  const options = field.settings.options ?? []

  function updateOption(index: number, value: string) {
    const next = [...options]
    next[index] = value
    updateSettings({ options: next })
  }

  function removeOption(index: number) {
    updateSettings({ options: options.filter((_, i) => i !== index) })
  }

  function addOption() {
    updateSettings({ options: [...options, `Alternativ ${options.length + 1}`] })
  }

  return (
    <div className="field-preview">
      {field.type === 'HEADING' && (
        <input
          ref={primaryRef}
          className="field-preview__heading"
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      )}

      {field.type === 'SUBHEADING' && (
        <input
          ref={primaryRef}
          className="field-preview__subheading"
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      )}

      {field.type === 'PARAGRAPH' && (
        <textarea
          ref={primaryRef}
          className="field-preview__paragraph"
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          rows={2}
        />
      )}

      {(field.type === 'TEXT' || field.type === 'NUMBER') && (
        <label className="field-preview__label">
          <input
            ref={primaryRef}
            type="text"
            className="field-preview__label-input"
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
          <input type={field.type === 'NUMBER' ? 'number' : 'text'} disabled />
        </label>
      )}

      {field.type === 'TEXTAREA' && (
        <label className="field-preview__label">
          <input
            ref={primaryRef}
            type="text"
            className="field-preview__label-input"
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
          <textarea disabled rows={3} />
        </label>
      )}

      {field.type === 'CHECKBOX' && (
        <label className="field-preview__checkbox-row">
          <input type="checkbox" disabled />
          <input
            ref={primaryRef}
            type="text"
            className="field-preview__label-input"
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </label>
      )}

      {(field.type === 'SINGLE_CHOICE' || field.type === 'MULTIPLE_CHOICE') && (
        <div className="field-preview__fieldset">
          <input
            ref={primaryRef}
            type="text"
            className="field-preview__label-input field-preview__legend"
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
          {options.map((option, index) => (
            <div key={index} className="field-preview__option-row">
              <input type={field.type === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'} name={field.id} disabled />
              <input
                type="text"
                className="field-preview__label-input"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
              />
              <button type="button" onClick={() => removeOption(index)} aria-label="Ta bort alternativ">
                ×
              </button>
            </div>
          ))}
          <button type="button" className="field-preview__add-option" onClick={addOption}>
            + Lägg till alternativ
          </button>
        </div>
      )}

      {field.type === 'SCALE' && (
        <div className="field-preview__scale">
          <input
            ref={primaryRef}
            type="text"
            className="field-preview__label-input"
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
          />
          <div className="field-preview__scale-track">
            <input
              type="number"
              className="field-preview__scale-number"
              value={field.settings.min ?? ''}
              onChange={(e) => updateSettings({ min: numberOrNull(e.target.value) })}
            />
            <input type="range" disabled min={field.settings.min ?? 1} max={field.settings.max ?? 5} />
            <input
              type="number"
              className="field-preview__scale-number"
              value={field.settings.max ?? ''}
              onChange={(e) => updateSettings({ max: numberOrNull(e.target.value) })}
            />
          </div>
          <div className="field-preview__scale-labels">
            <input
              type="text"
              className="field-preview__scale-endlabel"
              placeholder="Etikett för min"
              value={field.settings.minLabel ?? ''}
              onChange={(e) => updateSettings({ minLabel: e.target.value || null })}
            />
            <input
              type="text"
              className="field-preview__scale-endlabel field-preview__scale-endlabel--max"
              placeholder="Etikett för max"
              value={field.settings.maxLabel ?? ''}
              onChange={(e) => updateSettings({ maxLabel: e.target.value || null })}
            />
          </div>
        </div>
      )}

      {!isContentBlock(field.type) && (
        <label className="field-preview__required">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onChange({ required: e.target.checked })}
          />
          Obligatorisk
        </label>
      )}
    </div>
  )
}

function numberOrNull(value: string): number | null {
  if (value === '') return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}
