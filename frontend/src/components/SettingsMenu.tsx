import { useAuth } from '@clerk/clerk-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { COLOR_SCHEMES, getStoredScheme, setScheme } from '../lib/colorScheme'
import { applyTheme, getStoredTheme, setTheme, type ThemePreference } from '../lib/theme'
import type { Language } from '../lib/language'
import { useOfflineMode } from './offlineModeContext'
import { usePasswordMode } from './passwordModeContext'
import { useTranslation } from './languageContext'
import { GearIcon } from './icons'
import { OfflineAuthExceptionModal } from './OfflineAuthExceptionModal'
import './SettingsMenu.css'

// Language names are conventionally shown in their own language regardless
// of the current UI language (same convention every OS/browser language
// picker uses) -- deliberately not run through `t`.
const LANGUAGE_OPTIONS: { id: Language; label: string }[] = [
  { id: 'sv', label: 'Svenska' },
  { id: 'en', label: 'English' },
]

export function SettingsMenu() {
  const [currentScheme, setCurrentScheme] = useState(() => getStoredScheme())
  const [currentTheme, setCurrentTheme] = useState(() => getStoredTheme())
  const { offlineMode, authExceptionsAllowed, setOfflineMode } = useOfflineMode()
  const { passwordMode, setPasswordMode } = usePasswordMode()
  const { t, language, setLanguage } = useTranslation()
  const { isSignedIn } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const exceptionDialogRef = useRef<HTMLDialogElement>(null)

  const themeOptions = useMemo<{ id: ThemePreference; label: string }[]>(
    () => [
      { id: 'light', label: t.settingsMenu.themeLight },
      { id: 'dark', label: t.settingsMenu.themeDark },
      { id: 'system', label: t.settingsMenu.themeSystem },
    ],
    [t],
  )

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
    // Sets up a live listener on the OS theme when the preference is
    // "system" -- the anti-flash script in index.html only sets the initial
    // value once.
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
        aria-label={t.settingsMenu.trigger}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <GearIcon />
      </button>
      {open && (
        <div className="settings-menu__menu" role="menu">
          <div className="settings-menu__section-label">{t.settingsMenu.languageSectionLabel}</div>
          <div className="settings-menu__theme-row" role="group" aria-label={t.settingsMenu.languageSectionLabel}>
            {LANGUAGE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={option.id === language}
                className="settings-menu__theme-option"
                onClick={() => setLanguage(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="settings-menu__divider" />

          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={offlineMode}
            className="settings-menu__option settings-menu__option--checkbox"
            onClick={handleOfflineToggleClick}
            title={offlineMode && authExceptionsAllowed ? t.settingsMenu.offlineAuthHint : undefined}
          >
            <span className="settings-menu__checkbox" aria-hidden="true" />
            <span>
              {t.settingsMenu.offlineLabel}
              {offlineMode && authExceptionsAllowed && <span aria-hidden="true">*</span>}
            </span>
          </button>

          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={passwordMode}
            className="settings-menu__option settings-menu__option--checkbox"
            onClick={() => setPasswordMode(!passwordMode)}
            title={t.settingsMenu.passwordHint}
          >
            <span className="settings-menu__checkbox" aria-hidden="true" />
            <span>{t.settingsMenu.passwordLabel}</span>
          </button>

          <div className="settings-menu__divider" />

          <div className="settings-menu__section-label">{t.settingsMenu.modeSectionLabel}</div>
          <div className="settings-menu__theme-row" role="group" aria-label={t.settingsMenu.modeSectionLabel}>
            {themeOptions.map((option) => (
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

          <div className="settings-menu__section-label">{t.settingsMenu.schemeSectionLabel}</div>
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
              }}
            >
              <span className="settings-menu__option-dot" style={{ background: scheme.swatch }} />
              {t.colorScheme[scheme.id]}
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
