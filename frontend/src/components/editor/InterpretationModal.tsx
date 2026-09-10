import { useEffect, useRef, useState } from 'react'
import './InterpretationModal.css'

// Ingen riktig stegvis progress finns från backend (ett enda långt AI-anrop),
// så de här stegen är en tidsstyrd, ärlig approximation av vad som pågår --
// inget specifikt ("fält 3 av 12") som skulle kunna vara fel.
const STEPS = ['Läser av bilden…', 'Tolkar formulärets innehåll…', 'Identifierar fält och frågor…', 'Bygger ditt formulär…']

const STEP_INTERVAL_MS = 2500

export function InterpretationModal({ open }: { open: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [stepIndex, setStepIndex] = useState(0)

  // <dialog> måste stängas via close() -- att bara låta React ta bort noden ur
  // DOM:en (som conditional rendering gjorde tidigare) lämnar webbläsarens
  // modal-/inert-tillstånd kvar på resten av sidan, så den slutar gå att
  // klicka i trots att dialogen själv är borta. Komponenten hålls därför
  // alltid monterad och öppnas/stängs imperativt istället.
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
      setStepIndex((index) => Math.min(index + 1, STEPS.length - 1))
    }, STEP_INTERVAL_MS)
    return () => {
      clearInterval(interval)
      setStepIndex(0)
    }
  }, [open])

  return (
    <dialog ref={dialogRef} className="interpretation-modal">
      <div className="interpretation-modal__panel">
        <div className="interpretation-modal__spinner" aria-hidden="true" />
        <p className="interpretation-modal__step" aria-live="polite">
          {STEPS[stepIndex]}
        </p>
        <p className="interpretation-modal__hint">Det här kan ta upp till någon minut.</p>
      </div>
    </dialog>
  )
}
