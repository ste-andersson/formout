export type Language = 'sv' | 'en'

// The key name is mirrored in public/prefs-init.js -- keep them in sync.
const STORAGE_KEY = 'formout:language'

function detectSystemLanguage(): Language {
  const candidates = navigator.languages ?? [navigator.language]
  return candidates.some((lang) => lang.toLowerCase().startsWith('sv')) ? 'sv' : 'en'
}

export function getStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'sv' || stored === 'en') return stored
  } catch {
    // localStorage may be unavailable -- fall through to system detection.
  }
  return detectSystemLanguage()
}

export function applyLanguage(language: Language): void {
  document.documentElement.setAttribute('lang', language)
}

export function setLanguage(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // localStorage may be unavailable -- the language still applies for this
    // page load, it just won't be remembered for the next one.
  }
  applyLanguage(language)
}
