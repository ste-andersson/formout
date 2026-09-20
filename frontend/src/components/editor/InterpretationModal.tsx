import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../languageContext'
import './InterpretationModal.css'

// No real step-by-step progress exists from the backend (one single long AI
// call), so these steps are a time-based, honest approximation of what's
// happening -- nothing specific ("field 3 of 12") that could be wrong.
const STEP_INTERVAL_MS = 2500

export function InterpretationModal({ open }: { open: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const { t } = useTranslation()
  const steps = t.interpretationModal.steps

  // <dialog> must be closed via close() -- just letting React remove the node
  // from the DOM (as conditional rendering did before) leaves the browser's
  // modal/inert state stuck on the rest of the page, so it stops being
  // clickable even though the dialog itself is gone. The component is
  // therefore always kept mounted and opened/closed imperatively instead.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      if (!dialog.open) dialog.showModal()
    } else if (dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => {
      setStepIndex((index) => Math.min(index + 1, steps.length - 1))
    }, STEP_INTERVAL_MS)
    return () => {
      clearInterval(interval)
      setStepIndex(0)
    }
  }, [open, steps.length])

  return (
    <dialog ref={dialogRef} className="interpretation-modal">
      <div className="interpretation-modal__panel">
        <div className="interpretation-modal__spinner" aria-hidden="true" />
        <p className="interpretation-modal__step" aria-live="polite">
          {steps[stepIndex]}
        </p>
        <p className="interpretation-modal__hint">{t.interpretationModal.hint}</p>
      </div>
    </dialog>
  )
}
