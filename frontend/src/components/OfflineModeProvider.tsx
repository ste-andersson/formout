import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  getOfflineModeSettings,
  setAuthExceptionsAllowed as persistAuthExceptionsAllowed,
  setOfflineModeEnabled,
} from '../lib/offlineMode'
import { OfflineModeContext } from './offlineModeContext'

export function OfflineModeProvider({ children }: { children: ReactNode }) {
  // Starts false (offline mode off) until the IndexedDB read below resolves
  // -- there's no synchronous storage a service worker can also read (see
  // lib/offlineMode.ts), so this can't be initialized synchronously the way
  // the old localStorage-backed version was. A few ms at most in practice.
  const [offlineMode, setOfflineModeState] = useState(false)
  const [authExceptionsAllowed, setAuthExceptionsAllowedState] = useState(false)

  useEffect(() => {
    let cancelled = false
    getOfflineModeSettings()
      .then((settings) => {
        if (cancelled) return
        setOfflineModeState(settings.enabled)
        setAuthExceptionsAllowedState(settings.authExceptionsAllowed)
      })
      .catch((error: unknown) => {
        console.error('Could not read offline mode from IndexedDB', error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setOfflineMode = useCallback((value: boolean, exceptionsAllowed = false) => {
    setOfflineModeState(value)
    setAuthExceptionsAllowedState(value && exceptionsAllowed)
    setOfflineModeEnabled(value, exceptionsAllowed).catch((error: unknown) => {
      console.error('Could not save offline mode', error)
    })
  }, [])

  const setAuthExceptionsAllowed = useCallback((value: boolean) => {
    setAuthExceptionsAllowedState(value)
    persistAuthExceptionsAllowed(value).catch((error: unknown) => {
      console.error('Could not save offline mode exception', error)
    })
  }, [])

  return (
    <OfflineModeContext.Provider value={{ offlineMode, authExceptionsAllowed, setOfflineMode, setAuthExceptionsAllowed }}>
      {children}
    </OfflineModeContext.Provider>
  )
}
