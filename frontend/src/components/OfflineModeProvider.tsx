import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { getStoredOfflineMode, setStoredOfflineMode } from '../lib/offlineMode'
import { OfflineModeContext } from './offlineModeContext'

export function OfflineModeProvider({ children }: { children: ReactNode }) {
  const [offlineMode, setOfflineModeState] = useState(() => getStoredOfflineMode())

  const setOfflineMode = useCallback((value: boolean) => {
    setStoredOfflineMode(value)
    setOfflineModeState(value)
  }, [])

  return (
    <OfflineModeContext.Provider value={{ offlineMode, setOfflineMode }}>{children}</OfflineModeContext.Provider>
  )
}
