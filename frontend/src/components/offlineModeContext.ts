import { createContext, useContext } from 'react'

export interface OfflineModeContextValue {
  offlineMode: boolean
  authExceptionsAllowed: boolean
  // authExceptionsAllowed here lets a caller turn offline mode on and grant
  // the exception in one atomic write (see SettingsMenu.tsx) instead of two
  // separate racing writes.
  setOfflineMode: (value: boolean, authExceptionsAllowed?: boolean) => void
  setAuthExceptionsAllowed: (value: boolean) => void
}

export const OfflineModeContext = createContext<OfflineModeContextValue | null>(null)

export function useOfflineMode(): OfflineModeContextValue {
  const context = useContext(OfflineModeContext)
  if (!context) {
    throw new Error('useOfflineMode must be used within an OfflineModeProvider')
  }
  return context
}
