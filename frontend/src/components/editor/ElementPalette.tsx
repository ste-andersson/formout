import { useDraggable } from '@dnd-kit/core'
import type { FieldType } from '../../lib/formSchema'
import { getFieldTypeGroups, fieldTypeLabel } from '../../lib/formSchema'
import { blurActiveFieldIfKeyboardOpen } from '../../lib/device'
import { useTranslation } from '../languageContext'
import { FieldTypeIcon } from './fieldTypeIcons'
import './ElementPalette.css'

export function ElementPalette() {
  const { t } = useTranslation()
  return (
    <div className="element-palette">
      {getFieldTypeGroups(t.fieldTypeGroup).map((group) => (
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
  const { t } = useTranslation()

  const label = fieldTypeLabel(fieldType, t.fieldType)

  return (
    <button
      type="button"
      ref={setNodeRef}
      className="element-palette__item"
      aria-label={label}
      title={label}
      data-dragging={isDragging || undefined}
      data-drag-source
      onPointerDownCapture={(e) => {
        if (blurActiveFieldIfKeyboardOpen()) {
          e.stopPropagation()
        }
      }}
      {...listeners}
      {...attributes}
    >
      <FieldTypeIcon type={fieldType} />
    </button>
  )
}
