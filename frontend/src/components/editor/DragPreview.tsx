import type { Field, FieldType } from '../../lib/formSchema'
import { FieldTypeIcon } from './fieldTypeIcons'
import { FieldPreview } from './FieldPreview'
import './DragPreview.css'

export type ActiveDragItem =
  | { source: 'palette'; fieldType: FieldType }
  | { source: 'field'; field: Field }

interface DragPreviewProps {
  item: ActiveDragItem
}

export function DragPreview({ item }: DragPreviewProps) {
  if (item.source === 'palette') {
    return (
      <div className="drag-preview drag-preview--chip">
        <FieldTypeIcon type={item.fieldType} />
      </div>
    )
  }

  return (
    <div className="drag-preview">
      <FieldPreview field={item.field} autoFocus={false} onChange={() => {}} onFocused={() => {}} />
    </div>
  )
}
