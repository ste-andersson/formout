import type { Field, FieldType } from '../../lib/formSchema'
import { isContentBlock } from '../../lib/formSchema'
import './PropertiesPanel.css'

interface PropertiesPanelProps {
  field: Field
  onChange: (patch: Partial<Field>) => void
  onClose: () => void
}

export function PropertiesPanel({ field, onChange, onClose }: PropertiesPanelProps) {
  return (
    <div className="properties-panel">
      <div className="properties-panel__header">
        <h2>Egenskaper</h2>
        <button type="button" className="properties-panel__save" onClick={onClose}>
          Spara
        </button>
      </div>

      <label className="properties-panel__field">
        {labelFieldCaption(field.type)}
        <input type="text" value={field.label} onChange={(e) => onChange({ label: e.target.value })} />
      </label>

      {!isContentBlock(field.type) && (
        <label className="properties-panel__checkbox">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) => onChange({ required: e.target.checked })}
          />
          Obligatorisk
        </label>
      )}

      {field.type === 'SCALE' && (
        <>
          <label className="properties-panel__field">
            Min
            <input
              type="number"
              value={field.settings.min ?? ''}
              onChange={(e) => onChange({ settings: { ...field.settings, min: numberOrNull(e.target.value) } })}
            />
          </label>
          <label className="properties-panel__field">
            Max
            <input
              type="number"
              value={field.settings.max ?? ''}
              onChange={(e) => onChange({ settings: { ...field.settings, max: numberOrNull(e.target.value) } })}
            />
          </label>
          <label className="properties-panel__field">
            Etikett för min
            <input
              type="text"
              value={field.settings.minLabel ?? ''}
              onChange={(e) => onChange({ settings: { ...field.settings, minLabel: e.target.value || null } })}
            />
          </label>
          <label className="properties-panel__field">
            Etikett för max
            <input
              type="text"
              value={field.settings.maxLabel ?? ''}
              onChange={(e) => onChange({ settings: { ...field.settings, maxLabel: e.target.value || null } })}
            />
          </label>
        </>
      )}

      {(field.type === 'SINGLE_CHOICE' || field.type === 'MULTIPLE_CHOICE') && (
        <OptionsEditor
          options={field.settings.options ?? []}
          onChange={(options) => onChange({ settings: { ...field.settings, options } })}
        />
      )}
    </div>
  )
}

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (options: string[]) => void }) {
  return (
    <div className="properties-panel__options">
      <span>Alternativ</span>
      {options.map((option, index) => (
        <div key={index} className="properties-panel__option-row">
          <input
            type="text"
            value={option}
            onChange={(e) => {
              const next = [...options]
              next[index] = e.target.value
              onChange(next)
            }}
          />
          <button
            type="button"
            onClick={() => onChange(options.filter((_, i) => i !== index))}
            aria-label="Ta bort alternativ"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...options, `Alternativ ${options.length + 1}`])}>
        + Lägg till alternativ
      </button>
    </div>
  )
}

function labelFieldCaption(type: FieldType): string {
  switch (type) {
    case 'HEADING':
    case 'SUBHEADING':
      return 'Rubriktext'
    case 'PARAGRAPH':
      return 'Text'
    default:
      return 'Etikett'
  }
}

function numberOrNull(value: string): number | null {
  if (value === '') return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}
