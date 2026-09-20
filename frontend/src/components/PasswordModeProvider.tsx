import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getPasswordModeSettings, setPasswordModeEnabled } from '../lib/passwordMode'
import { PasswordModeContext } from './passwordModeContext'

export function PasswordModeProvider({ children }: { children: ReactNode }) {
  // Starts false until the IndexedDB read below resolves, same as
  // OfflineModeProvider -- no synchronous storage available.
  const [passwordMode, setPasswordModeState] = useState(false)

  useEffect(() => {
    let cancelled = false
    getPasswordModeSettings()
      .then((settings) => {
        if (cancelled) return
        setPasswordModeState(settings.enabled)
      })
      .catch((error: unknown) => {
        console.error('Could not read password mode from IndexedDB', error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setPasswordMode = useCallback((value: boolean) => {
    setPasswordModeState(value)
    setPasswordModeEnabled(value).catch((error: unknown) => {
      console.error('Could not save password mode', error)
    })
  }, [])

  return (
    <PasswordModeContext.Provider value={{ passwordMode, setPasswordMode }}>{children}</PasswordModeContext.Provider>
  )
}
