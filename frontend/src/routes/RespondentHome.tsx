import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { getFormBySlug } from '../lib/api'
import type { FormDetail } from '../lib/api'
import { listResponses, responseTimestamp } from '../lib/responseStorage'
import type { SavedResponse } from '../lib/responseStorage'
import { formatResponseDateTime } from '../lib/responseFormat'
import { buildBulkResponseCsv, buildCsvFile, downloadCsv } from '../lib/responseExport'
import { buildBulkResponsePdf, downloadPdf } from '../lib/responsePdf'
import { isWebShareSupported, shareFiles } from '../lib/webShare'
import { useToast } from '../components/toastContext'
import { ExportDialog } from '../components/ExportDialog'
import './RespondentHome.css'

interface ResponseGroup {
  formId: string
  formTitle: string
  responses: SavedResponse[]
}

function groupResponses(responses: SavedResponse[]): ResponseGroup[] {
  const groups = new Map<string, ResponseGroup>()
  for (const response of responses) {
    let group = groups.get(response.formId)
    if (!group) {
      group = { formId: response.formId, formTitle: response.formTitle, responses: [] }
      groups.set(response.formId, group)
    }
    group.responses.push(response)
  }
  for (const group of groups.values()) {
    group.responses.sort((a, b) => responseTimestamp(b).localeCompare(responseTimestamp(a)))
  }
  return Array.from(groups.values()).sort((a, b) =>
    responseTimestamp(b.responses[0]).localeCompare(responseTimestamp(a.responses[0])),
  )
}

type ExportLoadState = 'idle' | 'loading' | 'error'

export function RespondentHome() {
  const [code, setCode] = useState('')
  const [groups, setGroups] = useState<ResponseGroup[]>([])
  const [responsesError, setResponsesError] = useState(false)
  const [exportGroup, setExportGroup] = useState<ResponseGroup | null>(null)
  const [exportForm, setExportForm] = useState<FormDetail | null>(null)
  const [exportLoadState, setExportLoadState] = useState<ExportLoadState>('idle')
  const exportDialogRef = useRef<HTMLDialogElement>(null)
  const shareDialogRef = useRef<HTMLDialogElement>(null)
  const navigate = useNavigate()
  const { showToast } = useToast()

  useEffect(() => {
    let cancelled = false

    listResponses()
      .then((responses) => {
        if (cancelled) return
        setGroups(groupResponses(responses))
      })
      .catch((error: unknown) => {
        if (cancelled) return
        console.error('Kunde inte läsa sparade svar från IndexedDB', error)
        setResponsesError(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = code.trim().toLowerCase()
    if (trimmed.length === 0) {
      return
    }
    navigate(`/forms/${encodeURIComponent(trimmed)}`)
  }

  function beginExportFetch(group: ResponseGroup) {
    setExportGroup(group)
    setExportForm(null)
    setExportLoadState('loading')

    const latestSlug = group.responses[0].formSlug
    getFormBySlug(latestSlug)
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

  function handleOpenExportAll(group: ResponseGroup) {
    beginExportFetch(group)
    exportDialogRef.current?.showModal()
  }

  function handleOpenShareAll(group: ResponseGroup) {
    beginExportFetch(group)
    shareDialogRef.current?.showModal()
  }

  function safeFilenamePart(title: string): string {
    return title.replace(/[^a-zA-Z0-9åäöÅÄÖ]+/g, '-').replace(/^-+|-+$/g, '') || 'formular'
  }

  function handleExportAllCsv() {
    if (!exportGroup || !exportForm) return
    const csv = buildBulkResponseCsv(exportForm.schema, exportGroup.responses)
    downloadCsv(`${safeFilenamePart(exportGroup.formTitle)}-alla-svar.csv`, csv)
    exportDialogRef.current?.close()
  }

  function handleExportAllPdf() {
    if (!exportGroup || !exportForm) return
    const pdf = buildBulkResponsePdf(exportForm.schema, exportGroup.responses)
    downloadPdf(`${safeFilenamePart(exportGroup.formTitle)}-alla-svar.pdf`, pdf)
    exportDialogRef.current?.close()
  }

  async function handleShareAllCsv() {
    if (!exportGroup || !exportForm) return
    const csvFile = buildCsvFile(
      `${safeFilenamePart(exportGroup.formTitle)}-alla-svar.csv`,
      buildBulkResponseCsv(exportForm.schema, exportGroup.responses),
    )
    const result = await shareFiles([csvFile], exportGroup.formTitle)
    if (result === 'shared') {
      shareDialogRef.current?.close()
    } else if (result === 'error' || result === 'unsupported') {
      showToast('Kunde inte dela filen', 'error')
    }
  }

  async function handleShareAllPdf() {
    if (!exportGroup || !exportForm) return
    const pdfBlob = buildBulkResponsePdf(exportForm.schema, exportGroup.responses)
    const pdfFile = new File([pdfBlob], `${safeFilenamePart(exportGroup.formTitle)}-alla-svar.pdf`, {
      type: 'application/pdf',
    })
    const result = await shareFiles([pdfFile], exportGroup.formTitle)
    if (result === 'shared') {
      shareDialogRef.current?.close()
    } else if (result === 'error' || result === 'unsupported') {
      showToast('Kunde inte dela filen', 'error')
    }
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

      {responsesError && <p className="respondent-home__responses-error">Kunde inte hämta dina sparade svar.</p>}

      {groups.length > 0 && (
        <div className="respondent-home__responses">
          <h2 className="respondent-home__responses-heading">Mina ifyllda formulär</h2>
          {groups.map((group) => (
            <section key={group.formId} className="respondent-home__group">
              <h3 className="respondent-home__group-title">{group.formTitle}</h3>
              <ul className="respondent-home__response-list">
                {group.responses.map((response) => (
                  <li key={response.id}>
                    <Link to={`/responses/${response.id}`}>{formatResponseDateTime(responseTimestamp(response))}</Link>
                  </li>
                ))}
              </ul>
              <div className="respondent-home__group-actions">
                <button
                  type="button"
                  className="btn btn--neutral btn--small"
                  onClick={() => navigate(`/forms/${encodeURIComponent(group.responses[0].formSlug)}`)}
                >
                  Fyll i igen
                </button>
                <button
                  type="button"
                  className="btn btn--neutral btn--small"
                  onClick={() => handleOpenExportAll(group)}
                >
                  Exportera alla
                </button>
                {isWebShareSupported() && (
                  <button
                    type="button"
                    className="btn btn--neutral btn--small"
                    onClick={() => handleOpenShareAll(group)}
                  >
                    Dela alla
                  </button>
                )}
              </div>
            </section>
          ))}
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
