import { useEffect, useRef, useState } from 'react'
import { COLOR_SCHEMES, getStoredScheme, setScheme } from '../lib/colorScheme'
import { applyTheme, getStoredTheme, setTheme, type ThemePreference } from '../lib/theme'
import './AppearancePicker.css'

const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'light', label: 'Ljust' },
  { id: 'dark', label: 'Mörkt' },
  { id: 'system', label: 'System' },
]

export function AppearancePicker() {
  const [currentScheme, setCurrentScheme] = useState(() => getStoredScheme())
  const [currentTheme, setCurrentTheme] = useState(() => getStoredTheme())
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Sätter upp en live-lyssnare på OS-temat om preferensen är "system" --
    // anti-flash-scriptet i index.html sätter bara det initiala värdet en gång.
    applyTheme(getStoredTheme())
  }, [])

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
    <div className="appearance-picker" ref={rootRef}>
      <button
        type="button"
        className="appearance-picker__trigger"
        aria-label="Utseende"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="appearance-picker__dot" />
      </button>
      {open && (
        <div className="appearance-picker__menu" role="menu">
          <div className="appearance-picker__theme-row" role="group" aria-label="Ljust eller mörkt läge">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={option.id === currentTheme}
                className="appearance-picker__theme-option"
                onClick={() => {
                  setTheme(option.id)
                  setCurrentTheme(option.id)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="appearance-picker__divider" />
          {COLOR_SCHEMES.map((scheme) => (
            <button
              key={scheme.id}
              type="button"
              role="menuitemradio"
              aria-checked={scheme.id === currentScheme}
              className="appearance-picker__option"
              onClick={() => {
                setScheme(scheme.id)
                setCurrentScheme(scheme.id)
                setOpen(false)
              }}
            >
              <span className="appearance-picker__option-dot" style={{ background: scheme.swatch }} />
              {scheme.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
