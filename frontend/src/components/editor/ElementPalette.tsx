import { useDraggable } from '@dnd-kit/core'
import type { FieldType } from '../../lib/formSchema'
import { FIELD_TYPE_GROUPS, fieldTypeLabel } from '../../lib/formSchema'
import { blurActiveFieldIfKeyboardOpen } from '../../lib/device'
import './ElementPalette.css'

export function ElementPalette() {
  return (
    <div className="element-palette">
      {FIELD_TYPE_GROUPS.map((group) => (
        <div key={group.label} className="element-palette__group">
          <h2 className="element-palette__group-title">{group.label}</h2>
          <div className="element-palette__items">
            {group.types.map((type) => (
              <PaletteItem key={type} fieldType={type} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PaletteItem({ fieldType }: { fieldType: FieldType }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${fieldType}`,
    data: { source: 'palette', fieldType },
  })

  return (
    <button
      type="button"
      ref={setNodeRef}
      className="element-palette__item"
      data-dragging={isDragging || undefined}
      onPointerDownCapture={(e) => {
        if (blurActiveFieldIfKeyboardOpen()) {
          e.stopPropagation()
        }
      }}
      {...listeners}
      {...attributes}
    >
      {fieldTypeLabel(fieldType)}
    </button>
  )
}
