import { useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import '../components/ExportDialog.css'
import './PasswordPromptModal.css'

interface PasswordPromptModalProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  // 'set': the sharer/exporter chooses a password.
  // 'enter': the recipient types the password someone else already set --
  // same single field, plus an inline error slot for a wrong attempt.
  variant: 'set' | 'enter'
  // Wrong-password feedback for the 'enter' variant -- set by the caller
  // after a failed decrypt attempt, stays visible until the next submit.
  error?: string | null
  onSubmit: (password: string) => void
  onCancel: () => void
}

const COPY = {
  set: { heading: 'Välj ett lösenord', submitLabel: 'Fortsätt' },
  enter: { heading: 'Ange lösenord', submitLabel: 'Visa svar' },
} as const

export function PasswordPromptModal({ dialogRef, variant, error, onSubmit, onCancel }: PasswordPromptModalProps) {
  const [password, setPassword] = useState('')
  const copy = COPY[variant]

  function reset() {
    setPassword('')
  }

  function close() {
    dialogRef.current?.close()
  }

  function handleCancel() {
    onCancel()
    reset()
    close()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSubmit(password)
    // Only the 'set' variant closes itself -- 'enter' stays open until the
    // caller confirms the password actually worked (see decryptAnswersWithPassword).
    if (variant === 'set') {
      reset()
      close()
    } else {
      setPassword('')
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="export-dialog"
      onCancel={handleCancel}
      onClick={(event) => {
        if (event.target === dialogRef.current) handleCancel()
      }}
    >
      <div className="export-dialog__panel">
        <h2>{copy.heading}</h2>
        <form onSubmit={handleSubmit} className="password-prompt-modal__form">
          <input
            type="password"
            required
            minLength={4}
            autoFocus
            placeholder="Lösenord"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="password-prompt-modal__input"
          />
          {variant === 'enter' && error && <p className="password-prompt-modal__error">{error}</p>}
          <div className="export-dialog__options">
            <button type="submit" className="btn btn--primary">
              {copy.submitLabel}
            </button>
            <button type="button" className="btn btn--neutral" onClick={handleCancel}>
              Avbryt
            </button>
          </div>
        </form>
      </div>
    </dialog>
  )
}
