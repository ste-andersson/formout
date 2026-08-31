import { SignedIn, SignedOut, SignInButton, useAuth } from '@clerk/clerk-react'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useEffect, useReducer, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import * as adminApi from '../lib/adminApi'
import { generateFormCode } from '../lib/formCode'
import type { FieldType, Section } from '../lib/formSchema'
import type { ActiveDragItem } from '../components/editor/DragPreview'
import { DragPreview } from '../components/editor/DragPreview'
import { ElementPalette } from '../components/editor/ElementPalette'
import { JsonPreview } from '../components/editor/JsonPreview'
import { PropertiesPanel } from '../components/editor/PropertiesPanel'
import { SectionCanvas } from '../components/editor/SectionCanvas'
import type { DropIndicator } from '../components/editor/SectionCanvas'
import { buildFormSchema, editorReducer, findField, initialEditorState } from '../components/editor/editorState'
import './FormEditor.css'

export function FormEditor() {
  return (
    <>
      <SignedOut>
        <p>Du måste logga in för att komma åt admin.</p>
        <SignInButton mode="modal" />
      </SignedOut>
      <SignedIn>
        <FormEditorContent />
      </SignedIn>
    </>
  )
}

type LoadState = { status: 'ready' } | { status: 'loading' } | { status: 'error'; message: string }

type PaletteDragData = { source: 'palette'; fieldType: FieldType }
type FieldDragData = { source: 'field'; sectionId: string; fieldId: string }
type SectionContainerDropData = { source: 'section-container'; sectionId: string }

function FormEditorContent() {
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)
  const { getToken } = useAuth()
  const navigate = useNavigate()

  const [state, dispatch] = useReducer(editorReducer, initialEditorState())
  const [loadState, setLoadState] = useState<LoadState>(isEditMode ? { status: 'loading' } : { status: 'ready' })
  const [saveState, setSaveState] = useState<LoadState>({ status: 'ready' })
  const [activeTab, setActiveTab] = useState<'build' | 'json'>('build')
  const [activeDragItem, setActiveDragItem] = useState<ActiveDragItem | null>(null)
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null)

  useEffect(() => {
    if (!isEditMode || !id) return
    let cancelled = false

    getToken()
      .then((token) => {
        if (!token) throw new Error('Not signed in')
        return adminApi.getForm(token, id)
      })
      .then((form) => {
        if (cancelled) return
        dispatch({
          type: 'LOAD',
          title: form.title,
          description: form.description ?? '',
          slug: form.slug,
          sections: form.schema.sections,
        })
        setLoadState({ status: 'ready' })
      })
      .catch(() => {
        if (cancelled) return
        setLoadState({ status: 'error', message: 'Kunde inte hämta formuläret.' })
      })

    return () => {
      cancelled = true
    }
  }, [isEditMode, id, getToken])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function resolveDropTarget(
    sections: Section[],
    activeData: PaletteDragData | FieldDragData | undefined,
    overData: FieldDragData | SectionContainerDropData | undefined,
  ): DropIndicator | null {
    if (!activeData || !overData) return null

    const targetSectionId = overData.sectionId
    const targetSection = sections.find((s) => s.id === targetSectionId)
    if (!targetSection) return null

    const index =
      overData.source === 'field' ? targetSection.fields.findIndex((f) => f.id === overData.fieldId) : targetSection.fields.length

    return { sectionId: targetSectionId, index }
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as PaletteDragData | FieldDragData | undefined
    if (!data) return

    if (data.source === 'palette') {
      setActiveDragItem({ source: 'palette', fieldType: data.fieldType })
      return
    }

    const field = findField(state, data.fieldId)
    if (field) {
      setActiveDragItem({ source: 'field', field })
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const activeData = event.active.data.current as PaletteDragData | FieldDragData | undefined
    const overData = event.over?.data.current as FieldDragData | SectionContainerDropData | undefined
    setDropIndicator(resolveDropTarget(state.sections, activeData, overData))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragItem(null)
    setDropIndicator(null)

    const { active, over } = event
    if (!over) return

    const activeData = active.data.current as PaletteDragData | FieldDragData | undefined
    const overData = over.data.current as FieldDragData | SectionContainerDropData | undefined
    const target = resolveDropTarget(state.sections, activeData, overData)

    if (!activeData || !target) return

    if (activeData.source === 'palette') {
      dispatch({
        type: 'ADD_ELEMENT',
        sectionId: target.sectionId,
        fieldType: activeData.fieldType,
        index: target.index,
      })
    } else {
      dispatch({ type: 'MOVE_ELEMENT', fieldId: activeData.fieldId, toSectionId: target.sectionId, toIndex: target.index })
    }
  }

  function handleDragCancel() {
    setActiveDragItem(null)
    setDropIndicator(null)
  }

  async function handleSave() {
    setSaveState({ status: 'loading' })
    try {
      const token = await getToken()
      if (!token) throw new Error('Not signed in')

      const schema = buildFormSchema(state)

      if (isEditMode && id) {
        await adminApi.updateMetadata(token, id, { title: state.title, description: state.description || null })
        await adminApi.addVersion(token, id, { schema })
        setSaveState({ status: 'ready' })
      } else {
        let slug = state.slug
        let created: adminApi.AdminFormDetail | undefined

        for (let attempt = 0; attempt < 5 && !created; attempt++) {
          try {
            created = await adminApi.createForm(token, {
              title: state.title,
              description: state.description || null,
              slug,
              schema,
            })
          } catch (err) {
            if (err instanceof adminApi.AdminApiError && err.status === 409) {
              slug = generateFormCode()
              dispatch({ type: 'SET_SLUG', slug })
            } else {
              throw err
            }
          }
        }

        if (!created) throw new Error('Could not generate a unique code')
        navigate(`/admin/forms/${created.id}/edit`)
      }
    } catch {
      setSaveState({ status: 'error', message: 'Kunde inte spara formuläret.' })
    }
  }

  async function handleStatusAction(action: 'publish' | 'archive' | 'delete') {
    if (!id) return
    const token = await getToken()
    if (!token) return

    if (action === 'publish') {
      await adminApi.publish(token, id)
      return
    }
    if (action === 'archive') {
      await adminApi.archive(token, id)
      return
    }
    await adminApi.deleteForm(token, id)
    navigate('/admin')
  }

  if (loadState.status === 'loading') {
    return <p>Laddar…</p>
  }

  if (loadState.status === 'error') {
    return <p>{loadState.message}</p>
  }

  const selectedField = state.selectedElementId ? findField(state, state.selectedElementId) : undefined
  const schema = buildFormSchema(state)

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="form-editor">
        <div className="form-editor__meta">
          <label>
            Titel
            <input value={state.title} onChange={(e) => dispatch({ type: 'SET_TITLE', title: e.target.value })} />
          </label>
          <label>
            Beskrivning
            <input
              value={state.description}
              onChange={(e) => dispatch({ type: 'SET_DESCRIPTION', description: e.target.value })}
            />
          </label>
          <div className="form-editor__code">
            <span>
              Kod: <strong>{state.slug}</strong>
            </span>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_SLUG', slug: generateFormCode() })}
            >
              Generera ny kod
            </button>
          </div>
        </div>

        <div className="form-editor__tabs">
          <button type="button" onClick={() => setActiveTab('build')} data-active={activeTab === 'build' || undefined}>
            Bygg
          </button>
          <button type="button" onClick={() => setActiveTab('json')} data-active={activeTab === 'json' || undefined}>
            JSON
          </button>
        </div>

        <div className="form-editor__body">
          <div className="form-editor__build" data-hidden={activeTab !== 'build' || undefined}>
            <ElementPalette />
            <SectionCanvas
              sections={state.sections}
              selectedElementId={state.selectedElementId}
              dropIndicator={dropIndicator}
              onSelectElement={(fieldId) => dispatch({ type: 'SELECT_ELEMENT', fieldId })}
              onRemoveElement={(fieldId) => dispatch({ type: 'REMOVE_ELEMENT', fieldId })}
              onRenameSection={(sectionId, title) => dispatch({ type: 'RENAME_SECTION', sectionId, title })}
              onRemoveSection={(sectionId) => dispatch({ type: 'REMOVE_SECTION', sectionId })}
              onMoveSectionUp={(sectionId) => {
                const idx = state.sections.findIndex((s) => s.id === sectionId)
                if (idx > 0) dispatch({ type: 'MOVE_SECTION', sectionId, toIndex: idx - 1 })
              }}
              onMoveSectionDown={(sectionId) => {
                const idx = state.sections.findIndex((s) => s.id === sectionId)
                if (idx < state.sections.length - 1) dispatch({ type: 'MOVE_SECTION', sectionId, toIndex: idx + 1 })
              }}
              onAddSection={() => dispatch({ type: 'ADD_SECTION' })}
            />
          </div>
          <div className="form-editor__json" data-hidden={activeTab !== 'json' || undefined}>
            <JsonPreview schema={schema} />
          </div>
        </div>

        {selectedField && (
          <div className="form-editor__properties-overlay">
            <PropertiesPanel
              field={selectedField}
              onChange={(patch) => dispatch({ type: 'UPDATE_ELEMENT', fieldId: selectedField.id, patch })}
              onClose={() => dispatch({ type: 'SELECT_ELEMENT', fieldId: null })}
            />
          </div>
        )}

        <div className="form-editor__actions">
          <button type="button" onClick={handleSave} disabled={saveState.status === 'loading'}>
            Spara
          </button>
          {isEditMode && (
            <>
              <button type="button" onClick={() => handleStatusAction('publish')}>
                Publicera
              </button>
              <button type="button" onClick={() => handleStatusAction('archive')}>
                Arkivera
              </button>
              <button type="button" onClick={() => handleStatusAction('delete')}>
                Radera
              </button>
            </>
          )}
          {saveState.status === 'error' && <p>{saveState.message}</p>}
        </div>
      </div>
      <DragOverlay>{activeDragItem && <DragPreview item={activeDragItem} />}</DragOverlay>
    </DndContext>
  )
}
