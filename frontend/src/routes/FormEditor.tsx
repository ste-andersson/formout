import { SignedIn, SignedOut, SignInButton, useAuth } from '@clerk/clerk-react'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import * as adminApi from '../lib/adminApi'
import { generateFormCode } from '../lib/formCode'
import { resizeImageForUpload } from '../lib/imageResize'
import type { Field, FieldType } from '../lib/formSchema'
import { useToast } from '../components/toastContext'
import { FormRenderer } from '../components/FormRenderer'
import { ShareFormLink } from '../components/ShareFormLink'
import type { ActiveDragItem } from '../components/editor/DragPreview'
import { DragPreview } from '../components/editor/DragPreview'
import { ElementPalette } from '../components/editor/ElementPalette'
import { InterpretationModal } from '../components/editor/InterpretationModal'
import { FieldCanvas } from '../components/editor/FieldCanvas'
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
type FieldDragData = { source: 'field'; fieldId: string }
type CanvasDropData = { source: 'canvas' }

function FormEditorContent() {
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()

  const [uploadedImages, setUploadedImages] = useState<File[]>(() => {
    const navState = location.state as { uploadedFiles?: File[] } | null
    return navState?.uploadedFiles ?? []
  })
  // Object URLs are cached per File (by reference) so re-renders never create
  // duplicates; all of them are revoked together when the editor unmounts.
  const [imageUrls] = useState<Map<File, string>>(() => new Map())
  function getImageUrl(file: File): string {
    let url = imageUrls.get(file)
    if (!url) {
      url = URL.createObjectURL(file)
      imageUrls.set(file, url)
    }
    return url
  }
  useEffect(() => {
    return () => {
      imageUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [imageUrls])

  const [state, dispatch] = useReducer(editorReducer, initialEditorState())
  const [loadState, setLoadState] = useState<LoadState>(isEditMode ? { status: 'loading' } : { status: 'ready' })
  const [saveState, setSaveState] = useState<LoadState>({ status: 'ready' })
  const [interpretState, setInterpretState] = useState<LoadState>(
    uploadedImages.length > 0 ? { status: 'loading' } : { status: 'ready' },
  )
  const [activeTab, setActiveTab] = useState<'build' | 'image' | 'preview'>(
    uploadedImages.length > 0 ? 'image' : 'build',
  )
  const [formStatus, setFormStatus] = useState<adminApi.FormStatus | null>(null)
  // Owner-set relevance flag (aktuell/inaktuell), separate from formStatus --
  // see the "Relevans"-row below and adminApi.markCurrent/markOutdated.
  const [formActive, setFormActive] = useState<boolean | null>(null)
  const addPageInputRef = useRef<HTMLInputElement>(null)
  const lightboxRef = useRef<HTMLDialogElement>(null)
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null)

  const [activeDragItem, setActiveDragItem] = useState<ActiveDragItem | null>(null)
  const [activeDragSize, setActiveDragSize] = useState<{ width: number; height: number } | null>(null)
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null)

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
          fields: form.schema.fields,
        })
        setFormStatus(form.status)
        setFormActive(form.active)
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

  // The first page interpreted replaces title/description/fields (as before);
  // every page after that is interpreted independently and only APPENDS its
  // fields -- it never touches what an earlier page already produced, even
  // if the admin has since edited those fields by hand. The already-tolkade
  // fields (minus their internal ids) are sent along as read-only context so
  // the AI can avoid repeating a running header and can follow a repeating
  // pattern, but the response is still only ever used for the new page.
  const isFirstPageRef = useRef(true)
  const fieldsSoFarRef = useRef<Field[]>([])
  const lastAttemptedFileRef = useRef<File | null>(null)

  const interpretPage = useCallback(
    async (file: File): Promise<boolean> => {
      lastAttemptedFileRef.current = file
      try {
        const token = await getToken()
        if (!token) throw new Error('Not signed in')
        const fileToSend = await resizeImageForUpload(file)

        if (isFirstPageRef.current) {
          const schema = await adminApi.interpretImage(token, fileToSend)
          dispatch({
            type: 'LOAD_INTERPRETED',
            title: schema.title,
            description: schema.description ?? '',
            fields: schema.fields,
          })
          fieldsSoFarRef.current = schema.fields
          isFirstPageRef.current = false
        } else {
          const schema = await adminApi.interpretImage(token, fileToSend, fieldsSoFarRef.current)
          dispatch({ type: 'APPEND_INTERPRETED_FIELDS', fields: schema.fields })
          fieldsSoFarRef.current = [...fieldsSoFarRef.current, ...schema.fields]
        }
        return true
      } catch {
        return false
      }
    },
    [getToken],
  )

  const attemptPage = useCallback(
    async (file: File) => {
      const wasFirstPage = isFirstPageRef.current
      setInterpretState({ status: 'loading' })
      const ok = await interpretPage(file)
      if (ok) {
        setInterpretState({ status: 'ready' })
        showToast(wasFirstPage ? 'Formuläret är tolkat' : 'Sidan är tolkad', 'success')
        if (wasFirstPage) setActiveTab('preview')
      } else {
        setInterpretState({
          status: 'error',
          message: wasFirstPage ? 'Kunde inte tolka formuläret.' : 'Kunde inte tolka den nya sidan.',
        })
        showToast(wasFirstPage ? 'Kunde inte tolka formuläret' : 'Kunde inte tolka den nya sidan', 'error')
      }
    },
    [interpretPage, showToast],
  )

  const runInitialInterpretation = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const wasFirstPage = isFirstPageRef.current
        setInterpretState({ status: 'loading' })
        const ok = await interpretPage(file)
        if (!ok) {
          setInterpretState({
            status: 'error',
            message: wasFirstPage ? 'Kunde inte tolka formuläret.' : 'Kunde inte tolka den nya sidan.',
          })
          showToast(wasFirstPage ? 'Kunde inte tolka formuläret' : 'Kunde inte tolka den nya sidan', 'error')
          return
        }
      }
      setInterpretState({ status: 'ready' })
      showToast('Formuläret är tolkat', 'success')
      setActiveTab('preview')
    },
    [interpretPage, showToast],
  )

  const handleAddPage = useCallback(
    (file: File) => {
      setUploadedImages((prev) => [...prev, file])
      attemptPage(file)
    },
    [attemptPage],
  )

  const retryInterpretation = useCallback(() => {
    const file = lastAttemptedFileRef.current
    if (file) attemptPage(file)
  }, [attemptPage])

  // Auto-run once per mounted editor instance, over the initial batch of
  // uploaded pages. Guarded with a ref (not just the effect dependency
  // array) so React StrictMode's dev-only double-invoke of effects can't
  // trigger duplicate real OpenAI calls.
  const hasStartedInterpretation = useRef(false)
  useEffect(() => {
    if (uploadedImages.length > 0 && !hasStartedInterpretation.current) {
      hasStartedInterpretation.current = true
      runInitialInterpretation(uploadedImages)
    }
    // Only the initial batch (captured at mount) should auto-run; pages added
    // later go through handleAddPage instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Publish automatically as soon as the initial upload has been interpreted
  // -- feedback was that people upload a photo, see the preview, and assume
  // that's the finished step, then forget the separate "Publicera" click and
  // never notice the form was never actually reachable by respondents. Only
  // for the brand-new-form flow (never in edit mode) and only once; further
  // pages added afterwards (handleAddPage) still go through the normal
  // manual "Publicera" save, unchanged.
  const hasAutoPublishedRef = useRef(false)
  useEffect(() => {
    if (isEditMode || uploadedImages.length === 0 || interpretState.status !== 'ready') return
    if (hasAutoPublishedRef.current) return
    hasAutoPublishedRef.current = true
    handlePublish()
    // handlePublish reads the latest `state` when it runs, so it's
    // deliberately not in the dependency array -- adding it would re-run
    // this effect (and re-check the ref guard, harmlessly) on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, uploadedImages.length, interpretState])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function resolveDropTarget(
    fields: Field[],
    activeData: PaletteDragData | FieldDragData | undefined,
    overData: FieldDragData | CanvasDropData | undefined,
  ): number | null {
    if (!activeData || !overData) return null

    return overData.source === 'field' ? fields.findIndex((f) => f.id === overData.fieldId) : fields.length
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as PaletteDragData | FieldDragData | undefined
    if (!data) return

    // event.active.rect.current.initial is populated by an effect that only
    // runs *after* onDragStart fires, so it's still null/stale here -- measure
    // the real source element directly instead, via the event that actually
    // triggered the drag.
    const activatorTarget = event.activatorEvent.target
    const sourceElement = activatorTarget instanceof Element ? activatorTarget.closest('[data-drag-source]') : null
    const measuredRect = sourceElement?.getBoundingClientRect() ?? null
    setActiveDragSize(measuredRect ? { width: measuredRect.width, height: measuredRect.height } : null)

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
    const overData = event.over?.data.current as FieldDragData | CanvasDropData | undefined
    setDropIndicatorIndex(resolveDropTarget(state.fields, activeData, overData))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragItem(null)
    setActiveDragSize(null)
    setDropIndicatorIndex(null)

    const { active, over } = event
    if (!over) return

    const activeData = active.data.current as PaletteDragData | FieldDragData | undefined
    const overData = over.data.current as FieldDragData | CanvasDropData | undefined
    const targetIndex = resolveDropTarget(state.fields, activeData, overData)

    if (!activeData || targetIndex === null) return

    if (activeData.source === 'palette') {
      dispatch({ type: 'ADD_ELEMENT', fieldType: activeData.fieldType, index: targetIndex })
    } else {
      dispatch({ type: 'MOVE_ELEMENT', fieldId: activeData.fieldId, toIndex: targetIndex })
    }
  }

  function handleDragCancel() {
    setActiveDragItem(null)
    setActiveDragSize(null)
    setDropIndicatorIndex(null)
  }

  const handleFieldFocused = useCallback(() => {
    dispatch({ type: 'CLEAR_LAST_ADDED' })
  }, [])

  // The one place "publish" actually happens -- used by both the bottom
  // action button and the status row's "Publicera" button, so the two can
  // never mean different things (one only publishing whatever was last
  // saved, the other saving-then-publishing) -- that mismatch is exactly the
  // kind of status confusion this whole change is meant to remove.
  async function handlePublish() {
    setSaveState({ status: 'loading' })
    try {
      const token = await getToken()
      if (!token) throw new Error('Not signed in')

      const schema = buildFormSchema(state)

      if (isEditMode && id) {
        await adminApi.updateMetadata(token, id, { title: state.title, description: state.description || null })
        await adminApi.addVersion(token, id, { schema })
        const updated = await adminApi.publish(token, id)
        setFormStatus(updated.status)
        setSaveState({ status: 'ready' })
        showToast('Formuläret är publicerat', 'success')
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
        await adminApi.publish(token, created.id)
        showToast('Formuläret är publicerat', 'success')
        navigate(`/admin/forms/${created.id}/edit`)
      }
    } catch {
      setSaveState({ status: 'error', message: 'Kunde inte publicera formuläret.' })
      showToast('Kunde inte publicera formuläret', 'error')
    }
  }

  async function handleStatusAction(action: 'unpublish' | 'delete') {
    if (!id) return
    try {
      const token = await getToken()
      if (!token) throw new Error('Not signed in')

      if (action === 'unpublish') {
        const updated = await adminApi.unpublish(token, id)
        setFormStatus(updated.status)
        showToast('Formuläret är avpublicerat', 'success')
      } else {
        await adminApi.deleteForm(token, id)
        showToast('Formuläret är raderat', 'success')
        navigate('/admin')
      }
    } catch {
      showToast('Något gick fel, försök igen', 'error')
    }
  }

  async function handleRelevanceAction(action: 'mark-current' | 'mark-outdated') {
    if (!id) return
    try {
      const token = await getToken()
      if (!token) throw new Error('Not signed in')

      const updated =
        action === 'mark-current' ? await adminApi.markCurrent(token, id) : await adminApi.markOutdated(token, id)
      setFormActive(updated.active)
      showToast(action === 'mark-current' ? 'Formuläret är markerat som aktuellt' : 'Formuläret är markerat som inaktuellt', 'success')
    } catch {
      showToast('Något gick fel, försök igen', 'error')
    }
  }

  if (loadState.status === 'loading') {
    return <p>Laddar…</p>
  }

  if (loadState.status === 'error') {
    return <p>{loadState.message}</p>
  }

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
        <div className="form-editor__intro">
          <h1>Bygg eller redigera formulär</h1>
          <p>
            Dra in element från paletten och släpp dem där du vill ha dem. Du kan när som helst flytta ett element
            till en ny plats genom att dra det dit.
          </p>
        </div>

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
          <div className="form-editor__meta-rows">
            <div className="form-editor__code">
              <span>Kod:</span>
              <strong>{state.slug}</strong>
              <button
                type="button"
                className="btn btn--neutral btn--small"
                onClick={() => dispatch({ type: 'SET_SLUG', slug: generateFormCode() })}
              >
                Generera ny kod
              </button>
            </div>
            {isEditMode && formStatus && (
              <div className="form-editor__status">
                <span>Status:</span>
                <strong>{adminApi.formStatusLabel(formStatus)}</strong>
                {formStatus === 'DRAFT' && (
                  <button type="button" className="btn btn--neutral btn--small" onClick={handlePublish}>
                    Publicera
                  </button>
                )}
                {formStatus === 'PUBLISHED' && (
                  <button type="button" className="btn btn--neutral btn--small" onClick={() => handleStatusAction('unpublish')}>
                    Avpublicera
                  </button>
                )}
              </div>
            )}
            {isEditMode && formActive !== null && (
              <div className="form-editor__relevance">
                <span>Relevans:</span>
                <strong>{formActive ? 'Aktuell' : 'Inaktuell'}</strong>
                {formActive ? (
                  <button
                    type="button"
                    className="btn btn--neutral btn--small"
                    onClick={() => handleRelevanceAction('mark-outdated')}
                  >
                    Markera som inaktuell
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn--neutral btn--small"
                    onClick={() => handleRelevanceAction('mark-current')}
                  >
                    Markera som aktuell
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="form-editor__tabs">
          {uploadedImages.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('image')}
              data-active={activeTab === 'image' || undefined}
            >
              Bild
            </button>
          )}
          <button type="button" onClick={() => setActiveTab('build')} data-active={activeTab === 'build' || undefined}>
            Bygg
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            data-active={activeTab === 'preview' || undefined}
          >
            Förhandsvisning
          </button>
        </div>

        <div className="form-editor__body">
          {uploadedImages.length > 0 && (
            <div className="form-editor__image" data-hidden={activeTab !== 'image' || undefined}>
              {interpretState.status === 'error' && (
                <div className="form-editor__image-status form-editor__image-status--error">
                  <p>{interpretState.message}</p>
                  <button type="button" className="btn btn--neutral btn--small" onClick={retryInterpretation}>
                    Försök igen
                  </button>
                </div>
              )}
              <div className="form-editor__image-gallery">
                {uploadedImages.map((file, index) => {
                  const url = getImageUrl(file)
                  return (
                    <div className="form-editor__image-page" key={index}>
                      <button
                        type="button"
                        className="form-editor__image-page-remove"
                        aria-label="Ta bort sidan"
                        title="Ta bort sidan"
                        onClick={() => setUploadedImages((prev) => prev.filter((f) => f !== file))}
                      >
                        ×
                      </button>
                      {file.type === 'application/pdf' ? (
                        <a href={url} download={file.name} className="form-editor__image-page-pdf">
                          <span>PDF</span>
                          <span className="form-editor__image-page-filename">{file.name}</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          className="form-editor__image-page-enlarge"
                          onClick={() => {
                            setEnlargedImageUrl(url)
                            lightboxRef.current?.showModal()
                          }}
                        >
                          <img src={url} alt={`Sida ${index + 1}`} className="form-editor__image-preview" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              <button type="button" className="btn btn--neutral" onClick={() => addPageInputRef.current?.click()}>
                + Lägg till sida
              </button>
              <input
                ref={addPageInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) handleAddPage(file)
                }}
                hidden
              />
            </div>
          )}
          <div className="form-editor__build" data-hidden={activeTab !== 'build' || undefined}>
            <ElementPalette />
            <FieldCanvas
              fields={state.fields}
              lastAddedFieldId={state.lastAddedFieldId}
              dropIndicatorIndex={dropIndicatorIndex}
              onChangeElement={(fieldId, patch) => dispatch({ type: 'UPDATE_ELEMENT', fieldId, patch })}
              onFieldFocused={handleFieldFocused}
              onRemoveElement={(fieldId) => dispatch({ type: 'REMOVE_ELEMENT', fieldId })}
            />
          </div>
          <div className="form-editor__preview" data-hidden={activeTab !== 'preview' || undefined}>
            <FormRenderer schema={schema} />
          </div>
        </div>

        <InterpretationModal open={interpretState.status === 'loading'} />

        <dialog
          ref={lightboxRef}
          className="form-editor__lightbox"
          onClick={(e) => {
            // Klick på ::backdrop bubblar som ett klick på <dialog> själv.
            if (e.target === lightboxRef.current) lightboxRef.current?.close()
          }}
        >
          {enlargedImageUrl && <img src={enlargedImageUrl} alt="Förstorad sida" />}
          <button
            type="button"
            className="form-editor__lightbox-close"
            aria-label="Stäng"
            onClick={() => lightboxRef.current?.close()}
          >
            ×
          </button>
        </dialog>

        <div className="form-editor__actions">
          <button type="button" className="btn btn--primary" onClick={handlePublish} disabled={saveState.status === 'loading'}>
            Publicera
          </button>
          {isEditMode && (
            <>
              <ShareFormLink slug={state.slug} title={state.title} disabled={formStatus !== 'PUBLISHED'} />
              <button type="button" className="btn btn--neutral" onClick={() => handleStatusAction('delete')}>
                Radera
              </button>
            </>
          )}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDragItem && <DragPreview item={activeDragItem} size={activeDragSize} />}
      </DragOverlay>
    </DndContext>
  )
}
