import { createContext, useContext } from 'react'

export interface OfflineModeContextValue {
  offlineMode: boolean
  setOfflineMode: (value: boolean) => void
}

export const OfflineModeContext = createContext<OfflineModeContextValue | null>(null)

export function useOfflineMode(): OfflineModeContextValue {
  const context = useContext(OfflineModeContext)
  if (!context) {
    throw new Error('useOfflineMode must be used within an OfflineModeProvider')
  }
  return context
}
