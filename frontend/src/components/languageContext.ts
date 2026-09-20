import { createContext, useContext } from 'react'
import type { Language } from '../lib/language'
import type { Dictionary } from '../lib/i18n'

export interface LanguageContextValue {
  language: Language
  t: Dictionary
  setLanguage: (language: Language) => void
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)

export function useTranslation(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider')
  }
  return context
}
