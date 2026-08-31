import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Field } from '../../lib/formSchema'
import { fieldTypeLabel } from '../../lib/formSchema'
import { FieldPreview } from './FieldPreview'
import './SortableFieldItem.css'

interface SortableFieldItemProps {
  field: Field
  sectionId: string
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
}

export function SortableFieldItem({ field, sectionId, isSelected, onSelect, onRemove }: SortableFieldItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
    data: { source: 'field', sectionId, fieldId: field.id },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="sortable-field-item"
      data-selected={isSelected || undefined}
      data-dragging={isDragging || undefined}
    >
      <button
        type="button"
        className="sortable-field-item__handle"
        aria-label="Dra för att flytta"
        {...listeners}
        {...attributes}
      >
        ⠿
      </button>
      <button type="button" className="sortable-field-item__body" onClick={onSelect}>
        <span className="sortable-field-item__type">{fieldTypeLabel(field.type)}</span>
        <FieldPreview field={field} />
      </button>
      <button type="button" className="sortable-field-item__remove" onClick={onRemove} aria-label="Ta bort">
        ×
      </button>
    </div>
  )
}
