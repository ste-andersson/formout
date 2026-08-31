import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Section } from '../../lib/formSchema'
import { SortableFieldItem } from './SortableFieldItem'
import './SectionCanvas.css'

interface SectionCanvasProps {
  sections: Section[]
  selectedElementId: string | null
  onSelectElement: (fieldId: string) => void
  onRemoveElement: (fieldId: string) => void
  onRenameSection: (sectionId: string, title: string) => void
  onRemoveSection: (sectionId: string) => void
  onMoveSectionUp: (sectionId: string) => void
  onMoveSectionDown: (sectionId: string) => void
  onAddSection: () => void
}

export function SectionCanvas({
  sections,
  selectedElementId,
  onSelectElement,
  onRemoveElement,
  onRenameSection,
  onRemoveSection,
  onMoveSectionUp,
  onMoveSectionDown,
  onAddSection,
}: SectionCanvasProps) {
  return (
    <div className="section-canvas">
      {sections.map((section, index) => (
        <SectionBlock
          key={section.id}
          section={section}
          isFirst={index === 0}
          isLast={index === sections.length - 1}
          selectedElementId={selectedElementId}
          onSelectElement={onSelectElement}
          onRemoveElement={onRemoveElement}
          onRenameSection={onRenameSection}
          onRemoveSection={onRemoveSection}
          onMoveUp={() => onMoveSectionUp(section.id)}
          onMoveDown={() => onMoveSectionDown(section.id)}
        />
      ))}
      <button type="button" className="section-canvas__add-section" onClick={onAddSection}>
        + Lägg till sektion
      </button>
    </div>
  )
}

interface SectionBlockProps {
  section: Section
  isFirst: boolean
  isLast: boolean
  selectedElementId: string | null
  onSelectElement: (fieldId: string) => void
  onRemoveElement: (fieldId: string) => void
  onRenameSection: (sectionId: string, title: string) => void
  onRemoveSection: (sectionId: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function SectionBlock({
  section,
  isFirst,
  isLast,
  selectedElementId,
  onSelectElement,
  onRemoveElement,
  onRenameSection,
  onRemoveSection,
  onMoveUp,
  onMoveDown,
}: SectionBlockProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `section-container-${section.id}`,
    data: { source: 'section-container', sectionId: section.id },
  })

  return (
    <section className="section-block">
      <div className="section-block__header">
        <input
          className="section-block__title"
          value={section.title}
          onChange={(e) => onRenameSection(section.id, e.target.value)}
          aria-label="Sektionens titel"
        />
        <div className="section-block__controls">
          <button type="button" onClick={onMoveUp} disabled={isFirst} aria-label="Flytta sektion upp">
            ↑
          </button>
          <button type="button" onClick={onMoveDown} disabled={isLast} aria-label="Flytta sektion ner">
            ↓
          </button>
          <button type="button" onClick={() => onRemoveSection(section.id)} aria-label="Ta bort sektion">
            Ta bort
          </button>
        </div>
      </div>

      <SortableContext items={section.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="section-block__fields" data-drop-active={isOver || undefined}>
          {section.fields.length === 0 && <p className="section-block__empty">Dra ett element hit</p>}
          {section.fields.map((field) => (
            <SortableFieldItem
              key={field.id}
              field={field}
              sectionId={section.id}
              isSelected={field.id === selectedElementId}
              onSelect={() => onSelectElement(field.id)}
              onRemove={() => onRemoveElement(field.id)}
            />
          ))}
        </div>
      </SortableContext>
    </section>
  )
}
