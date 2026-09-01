import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Fragment } from 'react'
import type { Field, Section } from '../../lib/formSchema'
import { TrashIcon } from '../icons'
import { SortableFieldItem } from './SortableFieldItem'
import './SectionCanvas.css'

export interface DropIndicator {
  sectionId: string
  index: number
}

interface SectionCanvasProps {
  sections: Section[]
  lastAddedFieldId: string | null
  dropIndicator: DropIndicator | null
  onChangeElement: (fieldId: string, patch: Partial<Field>) => void
  onFieldFocused: () => void
  onRemoveElement: (fieldId: string) => void
  onRenameSection: (sectionId: string, title: string) => void
  onRemoveSection: (sectionId: string) => void
  onMoveSectionUp: (sectionId: string) => void
  onMoveSectionDown: (sectionId: string) => void
  onAddSection: () => void
}

export function SectionCanvas({
  sections,
  lastAddedFieldId,
  dropIndicator,
  onChangeElement,
  onFieldFocused,
  onRemoveElement,
  onRenameSection,
  onRemoveSection,
  onMoveSectionUp,
  onMoveSectionDown,
  onAddSection,
}: SectionCanvasProps) {
  return (
    <div className="section-canvas-wrapper">
      <div className="section-canvas">
        {sections.map((section, index) => (
          <SectionBlock
            key={section.id}
            section={section}
            isFirst={index === 0}
            isLast={index === sections.length - 1}
            lastAddedFieldId={lastAddedFieldId}
            dropIndicatorIndex={dropIndicator?.sectionId === section.id ? dropIndicator.index : null}
            onChangeElement={onChangeElement}
            onFieldFocused={onFieldFocused}
            onRemoveElement={onRemoveElement}
            onRenameSection={onRenameSection}
            onRemoveSection={onRemoveSection}
            onMoveUp={() => onMoveSectionUp(section.id)}
            onMoveDown={() => onMoveSectionDown(section.id)}
          />
        ))}
      </div>
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
  lastAddedFieldId: string | null
  dropIndicatorIndex: number | null
  onChangeElement: (fieldId: string, patch: Partial<Field>) => void
  onFieldFocused: () => void
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
  lastAddedFieldId,
  dropIndicatorIndex,
  onChangeElement,
  onFieldFocused,
  onRemoveElement,
  onRenameSection,
  onRemoveSection,
  onMoveUp,
  onMoveDown,
}: SectionBlockProps) {
  const { setNodeRef } = useDroppable({
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
            <TrashIcon />
          </button>
        </div>
      </div>

      <SortableContext items={section.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="section-block__fields"
          data-drop-active={dropIndicatorIndex !== null || undefined}
        >
          {section.fields.length === 0 && dropIndicatorIndex === null && (
            <p className="section-block__empty">Dra ett element hit</p>
          )}
          {section.fields.map((field, index) => (
            <Fragment key={field.id}>
              {dropIndicatorIndex === index && <div className="drop-indicator" />}
              <SortableFieldItem
                field={field}
                sectionId={section.id}
                autoFocus={field.id === lastAddedFieldId}
                onChange={(patch) => onChangeElement(field.id, patch)}
                onFocused={onFieldFocused}
                onRemove={() => onRemoveElement(field.id)}
              />
            </Fragment>
          ))}
          {dropIndicatorIndex === section.fields.length && <div className="drop-indicator" />}
        </div>
      </SortableContext>
    </section>
  )
}
