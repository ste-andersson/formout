import { createContext, useContext } from 'react'

export interface PasswordModeContextValue {
  passwordMode: boolean
  setPasswordMode: (value: boolean) => void
}

export const PasswordModeContext = createContext<PasswordModeContextValue | null>(null)

export function usePasswordMode(): PasswordModeContextValue {
  const context = useContext(PasswordModeContext)
  if (!context) {
    throw new Error('usePasswordMode must be used within a PasswordModeProvider')
  }
  return context
}
