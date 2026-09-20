export type ThemePreference = 'light' | 'dark' | 'system'

export const DEFAULT_THEME: ThemePreference = 'system'

// The key name is mirrored in public/prefs-init.js -- keep them in sync.
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
    // localStorage may be unavailable -- the theme still applies for this
    // page load, it just won't be saved for the next one.
  }
  applyTheme(preference)
}
