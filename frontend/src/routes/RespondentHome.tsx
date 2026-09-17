import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { getFormBySlug } from '../lib/api'
import type { FormDetail } from '../lib/api'
import { listResponses, responseTimestamp } from '../lib/responseStorage'
import type { SavedResponse } from '../lib/responseStorage'
import { listVisitedForms, refreshVisitedFormMeta, setHiddenLocally } from '../lib/visitedForms'
import type { VisitedForm } from '../lib/visitedForms'
import { formatResponseDateTime } from '../lib/responseFormat'
import { buildBulkResponseCsv, buildCsvFile, downloadCsv } from '../lib/responseExport'
import { buildBulkResponsePdf, downloadPdf } from '../lib/responsePdf'
import { isWebShareSupported, shareFiles } from '../lib/webShare'
import { useToast } from '../components/toastContext'
import { ExportDialog } from '../components/ExportDialog'
import './RespondentHome.css'

// A form the respondent has loaded and/or filled in, merged from two local
// sources: visitedForms (every load, even without a saved response) and
// responses (every saved fill-in). A form with saved responses but no
// visited-forms record (saved before this feature existed) gets a minimal
// synthesized card instead of being dropped.
interface FormCard {
  formId: string
  formTitle: string
  formDescription: string | null
  formSlug: string
  // Owner-set relevance flag -- the only thing that decides aktuell/inaktuell.
  // Respondents can't override this themselves, only hide a card entirely
  // (hiddenLocally, via "Ta bort").
  active: boolean
  hiddenLocally: boolean
  responses: SavedResponse[]
  sortKey: string
}

function buildFormCards(visited: VisitedForm[], responses: SavedResponse[]): FormCard[] {
  const visitedById = new Map(visited.map((v) => [v.formId, v]))
  const responsesByFormId = new Map<string, SavedResponse[]>()
  for (const response of responses) {
    const list = responsesByFormId.get(response.formId) ?? []
    list.push(response)
    responsesByFormId.set(response.formId, list)
  }
  for (const list of responsesByFormId.values()) {
    list.sort((a, b) => responseTimestamp(b).localeCompare(responseTimestamp(a)))
  }

  const formIds = new Set([...visitedById.keys(), ...responsesByFormId.keys()])
  const cards: FormCard[] = []

  for (const formId of formIds) {
    const v = visitedById.get(formId)
    const formResponses = responsesByFormId.get(formId) ?? []
    const latestResponse = formResponses[0]

    cards.push({
      formId,
      formTitle: v?.formTitle ?? latestResponse?.formTitle ?? 'Okänt formulär',
      formDescription: v?.formDescription ?? null,
      formSlug: v?.formSlug ?? latestResponse?.formSlug ?? '',
      // No visited-record yet (a response saved before this feature existed)
      // -- assume current until the form is loaded again and we learn better.
      active: v?.active ?? true,
      hiddenLocally: v?.hiddenLocally ?? false,
      responses: formResponses,
      sortKey: latestResponse ? responseTimestamp(latestResponse) : (v?.visitedAt ?? ''),
    })
  }

  return cards.sort((a, b) => b.sortKey.localeCompare(a.sortKey))
}

type ExportLoadState = 'idle' | 'loading' | 'error'

export function RespondentHome() {
  const [code, setCode] = useState('')
  const [cards, setCards] = useState<FormCard[]>([])
  const [loadError, setLoadError] = useState(false)
  const [exportCard, setExportCard] = useState<FormCard | null>(null)
  const [exportForm, setExportForm] = useState<FormDetail | null>(null)
  const [exportLoadState, setExportLoadState] = useState<ExportLoadState>('idle')
  const exportDialogRef = useRef<HTMLDialogElement>(null)
  const shareDialogRef = useRef<HTMLDialogElement>(null)
  const navigate = useNavigate()
  const { showToast } = useToast()

  // Pure data loading, no setState -- kept separate from the effect/handlers
  // that call it so each caller decides for itself when/how to render.
  const loadCardsFromCache = useCallback(async (): Promise<FormCard[]> => {
    const [visited, responses] = await Promise.all([listVisitedForms(), listResponses()])
    return buildFormCards(visited, responses)
  }, [])

  // Refreshes each visited form's owner-controlled metadata (title/
  // description/active) from the server and writes it back to the local
  // cache. Without this, a form the owner marks inactive would keep
  // showing as current on the respondent's home page until they happened to
  // re-open that specific form via its code -- the cached flag only updates
  // on an active visit (see recordFormVisit), and the home page itself
  // never talked to the backend before. Returns whether anything changed,
  // so the caller knows whether a re-render is worth it.
  const refreshActiveStatusFromServer = useCallback(async (cards: FormCard[]): Promise<boolean> => {
    const results = await Promise.all(
      cards.map((card) =>
        getFormBySlug(card.formSlug)
          .then((form) => (form ? { formId: card.formId, form } : null))
          .catch(() => null),
      ),
    )
    const changed = results.filter((r): r is { formId: string; form: FormDetail } => r !== null)
    if (changed.length === 0) return false
    await Promise.all(changed.map(({ formId, form }) => refreshVisitedFormMeta(formId, form)))
    return true
  }, [])

  // Used by the local-action buttons (toggle/remove) below -- a plain reload
  // from cache, no server round-trip needed since those actions don't touch
  // anything server-side.
  const reloadFromCache = useCallback(() => {
    loadCardsFromCache()
      .then(setCards)
      .catch((error: unknown) => {
        console.error('Kunde inte läsa sparade formulär från IndexedDB', error)
      })
  }, [loadCardsFromCache])

  useEffect(() => {
    let cancelled = false

    loadCardsFromCache()
      .then((cards) => {
        if (cancelled) return
        setCards(cards)
        return refreshActiveStatusFromServer(cards).then((changed) => {
          if (cancelled || !changed) return
          return loadCardsFromCache().then((refreshed) => {
            if (!cancelled) setCards(refreshed)
          })
        })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        console.error('Kunde inte läsa sparade formulär från IndexedDB', error)
        setLoadError(true)
      })

    return () => {
      cancelled = true
    }
  }, [loadCardsFromCache, refreshActiveStatusFromServer])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = code.trim().toLowerCase()
    if (trimmed.length === 0) {
      return
    }
    navigate(`/forms/${encodeURIComponent(trimmed)}`)
  }

  function handleRemove(card: FormCard) {
    if (card.responses.length > 0) return
    setHiddenLocally(card.formId, true).then(reloadFromCache)
  }

  function beginExportFetch(card: FormCard) {
    setExportCard(card)
    setExportForm(null)
    setExportLoadState('loading')

    getFormBySlug(card.formSlug)
      .then((form) => {
        if (form) {
          setExportForm(form)
          setExportLoadState('idle')
        } else {
          setExportLoadState('error')
        }
      })
      .catch(() => setExportLoadState('error'))
  }

  function handleOpenExportAll(card: FormCard) {
    beginExportFetch(card)
    exportDialogRef.current?.showModal()
  }

  function handleOpenShareAll(card: FormCard) {
    beginExportFetch(card)
    shareDialogRef.current?.showModal()
  }

  function safeFilenamePart(title: string): string {
    return title.replace(/[^a-zA-Z0-9åäöÅÄÖ]+/g, '-').replace(/^-+|-+$/g, '') || 'formular'
  }

  function handleExportAllCsv() {
    if (!exportCard || !exportForm) return
    const csv = buildBulkResponseCsv(exportForm.schema, exportCard.responses)
    downloadCsv(`${safeFilenamePart(exportCard.formTitle)}-alla-svar.csv`, csv)
    exportDialogRef.current?.close()
  }

  function handleExportAllPdf() {
    if (!exportCard || !exportForm) return
    const pdf = buildBulkResponsePdf(exportForm.schema, exportCard.responses)
    downloadPdf(`${safeFilenamePart(exportCard.formTitle)}-alla-svar.pdf`, pdf)
    exportDialogRef.current?.close()
  }

  async function handleShareAllCsv() {
    if (!exportCard || !exportForm) return
    const csvFile = buildCsvFile(
      `${safeFilenamePart(exportCard.formTitle)}-alla-svar.csv`,
      buildBulkResponseCsv(exportForm.schema, exportCard.responses),
    )
    const result = await shareFiles([csvFile], exportCard.formTitle)
    if (result === 'shared') {
      shareDialogRef.current?.close()
    } else if (result === 'error' || result === 'unsupported') {
      showToast('Kunde inte dela filen', 'error')
    }
  }

  async function handleShareAllPdf() {
    if (!exportCard || !exportForm) return
    const pdfBlob = buildBulkResponsePdf(exportForm.schema, exportCard.responses)
    const pdfFile = new File([pdfBlob], `${safeFilenamePart(exportCard.formTitle)}-alla-svar.pdf`, {
      type: 'application/pdf',
    })
    const result = await shareFiles([pdfFile], exportCard.formTitle)
    if (result === 'shared') {
      shareDialogRef.current?.close()
    } else if (result === 'error' || result === 'unsupported') {
      showToast('Kunde inte dela filen', 'error')
    }
  }

  const visibleCards = cards.filter((card) => !card.hiddenLocally)
  const currentCards = visibleCards.filter((card) => card.active)
  const outdatedCards = visibleCards.filter((card) => !card.active)

  function renderCard(card: FormCard, muted: boolean) {
    const hasResponses = card.responses.length > 0
    return (
      <section
        key={card.formId}
        className={`respondent-home__card${muted ? ' respondent-home__card--muted' : ''}`}
      >
        <div className="respondent-home__card-section">
          <div className="respondent-home__card-header">
            <h4 className="respondent-home__card-title">{card.formTitle}</h4>
            {!hasResponses && (
              <button
                type="button"
                className="respondent-home__card-remove"
                onClick={() => handleRemove(card)}
                aria-label="Ta bort formulär"
              >
                ×
              </button>
            )}
          </div>
          {card.formDescription && <p className="respondent-home__card-description">{card.formDescription}</p>}
        </div>
        <div className="respondent-home__card-section respondent-home__card-actions">
          <button
            type="button"
            className="btn btn--primary btn--small"
            onClick={() => navigate(`/forms/${encodeURIComponent(card.formSlug)}`)}
          >
            {hasResponses ? 'Fyll i igen' : 'Fyll i'}
          </button>
          {hasResponses && (
            <>
              <button type="button" className="btn btn--neutral btn--small" onClick={() => handleOpenExportAll(card)}>
                Exportera alla
              </button>
              {isWebShareSupported() && (
                <button type="button" className="btn btn--neutral btn--small" onClick={() => handleOpenShareAll(card)}>
                  Dela alla
                </button>
              )}
            </>
          )}
        </div>
        {hasResponses && (
          <div className="respondent-home__card-section">
            <h5 className="respondent-home__response-list-heading">Formulärsvar</h5>
            <ul className="respondent-home__response-list">
              {card.responses.map((response) => (
                <li key={response.id}>
                  <Link to={`/responses/${response.id}`}>
                    <span>{formatResponseDateTime(responseTimestamp(response))}</span>
                    <span className="respondent-home__response-arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="respondent-home">
      <h1>Fyll i ett formulär</h1>
      <p>Ange koden du fått för formuläret.</p>
      <form onSubmit={handleSubmit} className="respondent-home__form">
        <label htmlFor="form-code" className="respondent-home__label">
          Formulärkod
        </label>
        <input
          id="form-code"
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="respondent-home__input"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
        />
        <button type="submit" className="btn btn--primary">
          Ladda formulär
        </button>
      </form>

      {loadError && <p className="respondent-home__responses-error">Kunde inte hämta dina formulär.</p>}

      {(currentCards.length > 0 || outdatedCards.length > 0) && (
        <div className="respondent-home__responses">
          <h2 className="respondent-home__list-heading">Mina formulär</h2>

          {currentCards.length > 0 && (
            <div className="respondent-home__responses-group">
              <h3 className="respondent-home__responses-heading">Aktuella formulär</h3>
              {currentCards.map((card) => renderCard(card, false))}
            </div>
          )}

          {outdatedCards.length > 0 && (
            <div className="respondent-home__responses-group">
              <h3 className="respondent-home__responses-heading">Inaktuella formulär</h3>
              {outdatedCards.map((card) => renderCard(card, true))}
            </div>
          )}
        </div>
      )}

      <ExportDialog dialogRef={exportDialogRef} title="Exportera alla">
        {exportLoadState === 'loading' && <p>Hämtar formulär…</p>}
        {exportLoadState === 'error' && <p>Kunde inte hämta formuläret.</p>}
        {exportLoadState === 'idle' && exportForm && (
          <>
            <button type="button" className="btn btn--neutral" onClick={handleExportAllCsv}>
              CSV
            </button>
            <button type="button" className="btn btn--neutral" onClick={handleExportAllPdf}>
              PDF
            </button>
          </>
        )}
      </ExportDialog>

      <ExportDialog dialogRef={shareDialogRef} title="Dela alla">
        {exportLoadState === 'loading' && <p>Hämtar formulär…</p>}
        {exportLoadState === 'error' && <p>Kunde inte hämta formuläret.</p>}
        {exportLoadState === 'idle' && exportForm && (
          <>
            <button type="button" className="btn btn--neutral" onClick={handleShareAllCsv}>
              CSV
            </button>
            <button type="button" className="btn btn--neutral" onClick={handleShareAllPdf}>
              PDF
            </button>
          </>
        )}
      </ExportDialog>
    </div>
  )
}
