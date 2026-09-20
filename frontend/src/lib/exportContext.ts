import type { Dictionary } from './i18n'
import type { Language } from './language'

// Threaded through every response export function (CSV/PDF/XLSX) instead of
// those modules importing the dictionary/language state directly -- keeps
// them free of any React/UI dependency, same as before this feature existed.
export interface ExportContext {
  labels: Dictionary['exportChrome']
  language: Language
}
