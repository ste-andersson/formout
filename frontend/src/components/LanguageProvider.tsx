import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { getStoredLanguage, setLanguage as persistLanguage } from '../lib/language'
import type { Language } from '../lib/language'
import { dictionaries } from '../lib/i18n'
import { LanguageContext } from './languageContext'

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Synchronous localStorage read on first render, same as getStoredTheme()/
  // getStoredScheme() -- unlike OfflineModeProvider's IndexedDB read (which
  // resolves async because a service worker needs that same storage), there's
  // no such constraint here, and the anti-flash requirement is stronger: this
  // determines which LANGUAGE renders, not just a CSS attribute, so it must
  // be correct on the very first render, not patched in a few ms later.
  const [language, setLanguageState] = useState<Language>(() => getStoredLanguage())

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    persistLanguage(next)
  }, [])

  return (
    <LanguageContext.Provider value={{ language, t: dictionaries[language], setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}
