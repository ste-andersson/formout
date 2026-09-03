import { useEffect, useRef, useState } from 'react'
import { COLOR_SCHEMES, getStoredScheme, setScheme } from '../lib/colorScheme'
import './ColorSchemePicker.css'

export function ColorSchemePicker() {
  const [current, setCurrent] = useState(() => getStoredScheme())
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  return (
    <div className="color-scheme-picker" ref={rootRef}>
      <button
        type="button"
        className="color-scheme-picker__trigger"
        aria-label="Färgschema"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="color-scheme-picker__dot" />
      </button>
      {open && (
        <div className="color-scheme-picker__menu" role="menu">
          {COLOR_SCHEMES.map((scheme) => (
            <button
              key={scheme.id}
              type="button"
              role="menuitemradio"
              aria-checked={scheme.id === current}
              className="color-scheme-picker__option"
              onClick={() => {
                setScheme(scheme.id)
                setCurrent(scheme.id)
                setOpen(false)
              }}
            >
              <span
                className="color-scheme-picker__option-dot"
                style={{ background: scheme.swatch }}
              />
              {scheme.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
