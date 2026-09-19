import { useAuth } from '@clerk/clerk-react'
import { useEffect, useRef, useState } from 'react'
import { COLOR_SCHEMES, getStoredScheme, setScheme } from '../lib/colorScheme'
import { applyTheme, getStoredTheme, setTheme, type ThemePreference } from '../lib/theme'
import { useOfflineMode } from './offlineModeContext'
import { GearIcon } from './icons'
import { OfflineAuthExceptionModal } from './OfflineAuthExceptionModal'
import './SettingsMenu.css'

const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'light', label: 'Ljust' },
  { id: 'dark', label: 'Mörkt' },
  { id: 'system', label: 'System' },
]

export function SettingsMenu() {
  const [currentScheme, setCurrentScheme] = useState(() => getStoredScheme())
  const [currentTheme, setCurrentTheme] = useState(() => getStoredTheme())
  const { offlineMode, authExceptionsAllowed, setOfflineMode } = useOfflineMode()
  const { isSignedIn } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const exceptionDialogRef = useRef<HTMLDialogElement>(null)

  function handleOfflineToggleClick() {
    if (offlineMode) {
      // Turning it off never needs confirmation -- only turning it on while
      // signed in does, since that's the only case with a session to except.
      setOfflineMode(false)
      return
    }
    if (isSignedIn) {
      setOpen(false)
      exceptionDialogRef.current?.showModal()
      return
    }
    setOfflineMode(true)
  }

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
    <div className="settings-menu" ref={rootRef}>
      <button
        type="button"
        className="settings-menu__trigger"
        aria-label="Inställningar"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <GearIcon />
      </button>
      {open && (
        <div className="settings-menu__menu" role="menu">
          <div className="settings-menu__section-label">Språk</div>
          <div className="settings-menu__theme-row" role="group" aria-label="Språk">
            <button type="button" role="menuitemradio" aria-checked="true" className="settings-menu__theme-option">
              Svenska
            </button>
            <button
              type="button"
              role="menuitemradio"
              aria-checked="false"
              className="settings-menu__theme-option"
              disabled
              title="Kommer snart"
            >
              English
            </button>
          </div>

          <div className="settings-menu__divider" />

          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={offlineMode}
            className="settings-menu__option settings-menu__option--checkbox"
            onClick={handleOfflineToggleClick}
            title={
              offlineMode && authExceptionsAllowed
                ? 'Anrop till Clerk (inloggning) och Cloudflare (bot-skydd) är tillåtna för att hålla dig inloggad.'
                : undefined
            }
          >
            <span className="settings-menu__checkbox" aria-hidden="true" />
            <span>
              Offline-läge
              {offlineMode && authExceptionsAllowed && <span aria-hidden="true">*</span>}
            </span>
          </button>

          <div className="settings-menu__divider" />

          <div className="settings-menu__section-label">Läge</div>
          <div className="settings-menu__theme-row" role="group" aria-label="Ljust eller mörkt läge">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={option.id === currentTheme}
                className="settings-menu__theme-option"
                onClick={() => {
                  setTheme(option.id)
                  setCurrentTheme(option.id)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="settings-menu__divider" />

          <div className="settings-menu__section-label">Färgschema</div>
          {COLOR_SCHEMES.map((scheme) => (
            <button
              key={scheme.id}
              type="button"
              role="menuitemradio"
              aria-checked={scheme.id === currentScheme}
              className="settings-menu__option"
              onClick={() => {
                setScheme(scheme.id)
                setCurrentScheme(scheme.id)
                setOpen(false)
              }}
            >
              <span className="settings-menu__option-dot" style={{ background: scheme.swatch }} />
              {scheme.label}
            </button>
          ))}
        </div>
      )}
      <OfflineAuthExceptionModal
        dialogRef={exceptionDialogRef}
        variant="enable-offline"
        onAllow={() => setOfflineMode(true, true)}
        onCancel={() => {}}
      />
    </div>
  )
}
