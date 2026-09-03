import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Fragment } from 'react'
import type { Field } from '../../lib/formSchema'
import { SortableFieldItem } from './SortableFieldItem'
import './FieldCanvas.css'

interface FieldCanvasProps {
  fields: Field[]
  lastAddedFieldId: string | null
  dropIndicatorIndex: number | null
  onChangeElement: (fieldId: string, patch: Partial<Field>) => void
  onFieldFocused: () => void
  onRemoveElement: (fieldId: string) => void
}

export function FieldCanvas({
  fields,
  lastAddedFieldId,
  dropIndicatorIndex,
  onChangeElement,
  onFieldFocused,
  onRemoveElement,
}: FieldCanvasProps) {
  const { setNodeRef } = useDroppable({
    id: 'field-canvas',
    data: { source: 'canvas' },
  })

  return (
    <div className="field-canvas-wrapper">
      <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="field-canvas" data-drop-active={dropIndicatorIndex !== null || undefined}>
          {fields.length === 0 && dropIndicatorIndex === null && (
            <p className="field-canvas__empty">Dra ett element hit</p>
          )}
          {fields.map((field, index) => (
            <Fragment key={field.id}>
              {dropIndicatorIndex === index && <div className="drop-indicator" />}
              <SortableFieldItem
                field={field}
                autoFocus={field.id === lastAddedFieldId}
                onChange={(patch) => onChangeElement(field.id, patch)}
                onFocused={onFieldFocused}
                onRemove={() => onRemoveElement(field.id)}
              />
            </Fragment>
          ))}
          {dropIndicatorIndex === fields.length && <div className="drop-indicator" />}
        </div>
      </SortableContext>
    </div>
  )
}
