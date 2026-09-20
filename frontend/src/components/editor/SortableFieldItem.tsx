import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Field } from '../../lib/formSchema'
import { fieldTypeLabel } from '../../lib/formSchema'
import { blurActiveFieldIfKeyboardOpen } from '../../lib/device'
import { useTranslation } from '../languageContext'
import { FieldPreview } from './FieldPreview'
import './SortableFieldItem.css'

interface SortableFieldItemProps {
  field: Field
  autoFocus: boolean
  onChange: (patch: Partial<Field>) => void
  onFocused: () => void
  onRemove: () => void
}

export function SortableFieldItem({ field, autoFocus, onChange, onFocused, onRemove }: SortableFieldItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    data: { source: 'field', fieldId: field.id },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  const { t } = useTranslation()

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="sortable-field-item"
      data-dragging={isDragging || undefined}
      data-drag-source
    >
      <button
        type="button"
        className="sortable-field-item__handle"
        aria-label={t.sortableFieldItem.dragHandle}
        onPointerDownCapture={(e) => {
          if (blurActiveFieldIfKeyboardOpen()) {
            e.stopPropagation()
          }
        }}
        {...listeners}
        {...attributes}
      >
        ⠿
      </button>
      <div className="sortable-field-item__body">
        <span className="sortable-field-item__type">{fieldTypeLabel(field.type, t.fieldType)}</span>
        <FieldPreview field={field} autoFocus={autoFocus} onChange={onChange} onFocused={onFocused} />
      </div>
      <button type="button" className="sortable-field-item__remove" onClick={onRemove} aria-label={t.sortableFieldItem.remove}>
        ×
      </button>
    </div>
  )
}
