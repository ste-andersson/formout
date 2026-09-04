export interface ColorScheme {
  id: string
  label: string
  swatch: string
}

export const COLOR_SCHEMES: ColorScheme[] = [
  { id: 'terracotta', label: 'Terrakotta', swatch: '#ab4f2c' },
  { id: 'burgundy', label: 'Vinröd', swatch: '#7a2432' },
  { id: 'ochre', label: 'Ockra', swatch: '#8c6a1e' },
  { id: 'forest', label: 'Skog', swatch: '#2f5233' },
  { id: 'navy', label: 'Marinblå', swatch: '#24365e' },
]

export const DEFAULT_SCHEME = 'terracotta'

// Nyckelnamnet speglas i inline-scriptet i index.html -- håll dem i synk.
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
    // localStorage kan vara otillgängligt (privat läge, låsta iframes) -- schemat
    // tillämpas ändå för den här sidladdningen, det bara sparas inte till nästa.
  }
  applyScheme(id)
}
