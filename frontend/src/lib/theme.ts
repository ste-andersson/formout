export type ThemePreference = 'light' | 'dark' | 'system'

export const DEFAULT_THEME: ThemePreference = 'system'

// Nyckelnamnet speglas i inline-scriptet i index.html -- håll dem i synk.
const STORAGE_KEY = 'formout:theme'

const darkMediaQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

let systemListenerCleanup: (() => void) | null = null

export function getStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
    return DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function resolveEffectiveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') return darkMediaQuery().matches ? 'dark' : 'light'
  return preference
}

export function applyTheme(preference: ThemePreference): void {
  systemListenerCleanup?.()
  systemListenerCleanup = null

  document.documentElement.setAttribute('data-theme', resolveEffectiveTheme(preference))

  if (preference === 'system') {
    const mediaQuery = darkMediaQuery()
    const handleChange = () => {
      document.documentElement.setAttribute('data-theme', mediaQuery.matches ? 'dark' : 'light')
    }
    mediaQuery.addEventListener('change', handleChange)
    systemListenerCleanup = () => mediaQuery.removeEventListener('change', handleChange)
  }
}

export function setTheme(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // localStorage kan vara otillgängligt -- temat tillämpas ändå för den här
    // sidladdningen, det sparas bara inte till nästa.
  }
  applyTheme(preference)
}
