export type ColorSchemeId = 'terracotta' | 'burgundy' | 'ochre' | 'forest' | 'navy'

export interface ColorScheme {
  id: ColorSchemeId
  swatch: string
}

// Labels live in the translation dictionary (t.colorScheme[id]), not here --
// these are shown in SettingsMenu.tsx like any other UI chrome text.
export const COLOR_SCHEMES: ColorScheme[] = [
  { id: 'terracotta', swatch: '#ab4f2c' },
  { id: 'burgundy', swatch: '#7a2432' },
  { id: 'ochre', swatch: '#8c6a1e' },
  { id: 'forest', swatch: '#2f5233' },
  { id: 'navy', swatch: '#24365e' },
]

export const DEFAULT_SCHEME = 'terracotta'

// The key name is mirrored in public/prefs-init.js -- keep them in sync.
const STORAGE_KEY = 'formout:color-scheme'

export function getStoredScheme(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SCHEME
  } catch {
    return DEFAULT_SCHEME
  }
}

export function applyScheme(id: string): void {
  document.documentElement.setAttribute('data-scheme', id)
}

export function setScheme(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // localStorage may be unavailable (private mode, locked iframes) -- the
    // scheme still applies for this page load, it just won't be saved for
    // the next one.
  }
  applyScheme(id)
}
