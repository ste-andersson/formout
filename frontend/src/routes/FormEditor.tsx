import { SignedIn, SignedOut, SignInButton, useAuth } from '@clerk/clerk-react'
import type { DragEndEvent } from '@dnd-kit/core'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useEffect, useReducer, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import * as adminApi from '../lib/adminApi'
import type { FieldType } from '../lib/formSchema'
import { ElementPalette } from '../components/editor/ElementPalette'
import { JsonPreview } from '../components/editor/JsonPreview'
import { PropertiesPanel } from '../components/editor/PropertiesPanel'
import { SectionCanvas } from '../components/editor/SectionCanvas'
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const activeData = active.data.current as PaletteDragData | FieldDragData | undefined
    const overData = over.data.current as FieldDragData | SectionContainerDropData | undefined

    if (!activeData || !overData) return

    const targetSectionId = overData.sectionId
    const targetSection = state.sections.find((s) => s.id === targetSectionId)
    if (!targetSection) return

    const targetIndex =
      overData.source === 'field' ? targetSection.fields.findIndex((f) => f.id === overData.fieldId) : targetSection.fields.length

    if (activeData.source === 'palette') {
      dispatch({
        type: 'ADD_ELEMENT',
        sectionId: targetSectionId,
        fieldType: activeData.fieldType,
        index: targetIndex,
      })
    } else {
      dispatch({ type: 'MOVE_ELEMENT', fieldId: activeData.fieldId, toSectionId: targetSectionId, toIndex: targetIndex })
    }
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
        const created = await adminApi.createForm(token, {
          title: state.title,
          description: state.description || null,
          slug: state.slug,
          schema,
        })
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
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
          <label>
            Kod (slug)
            <input value={state.slug} onChange={(e) => dispatch({ type: 'SET_SLUG', slug: e.target.value })} />
          </label>
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
    </DndContext>
  )
}
