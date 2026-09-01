import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import './RespondentHome.css'

export function RespondentHome() {
  const [code, setCode] = useState('')
  const navigate = useNavigate()

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
    </div>
  )
}
