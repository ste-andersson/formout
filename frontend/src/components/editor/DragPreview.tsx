import type { Field, FieldType } from '../../lib/formSchema'
import { FieldTypeIcon } from './fieldTypeIcons'
import { FieldPreview } from './FieldPreview'
import './DragPreview.css'

export type ActiveDragItem =
  | { source: 'palette'; fieldType: FieldType }
  | { source: 'field'; field: Field }

interface DragPreviewProps {
  item: ActiveDragItem
  // Storleken på elementet som faktiskt dras (mätt vid drag-start) -- så
  // spöket matchar exakt det man drar, istället för en fast standardstorlek.
  size: { width: number; height: number } | null
}

export function DragPreview({ item, size }: DragPreviewProps) {
  if (item.source === 'palette') {
    return (
      <div className="drag-preview drag-preview--chip" style={size ? { width: size.width, height: size.height } : undefined}>
        <FieldTypeIcon type={item.fieldType} size={size ? Math.round(size.width * 0.6) : 26} />
      </div>
    )
  }

  return (
    <div className="drag-preview" style={size ? { width: size.width } : undefined}>
      <FieldPreview field={item.field} autoFocus={false} onChange={() => {}} onFocused={() => {}} />
    </div>
  )
}
