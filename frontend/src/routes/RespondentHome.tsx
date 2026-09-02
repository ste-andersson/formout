import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { listResponses, responseTimestamp } from '../lib/responseStorage'
import type { SavedResponse } from '../lib/responseStorage'
import { formatResponseDateTime } from '../lib/responseFormat'
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

export function RespondentHome() {
  const [code, setCode] = useState('')
  const [groups, setGroups] = useState<ResponseGroup[]>([])
  const [responsesError, setResponsesError] = useState(false)
  const navigate = useNavigate()

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
        <button type="submit" className="respondent-home__submit">
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
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
