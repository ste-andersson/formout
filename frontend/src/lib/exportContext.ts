import type { Dictionary } from './i18n'
import type { Language } from './language'
import type { FieldAnswerValue } from './formAnswers'

// Threaded through every response export function (CSV/PDF/XLSX) instead of
// those modules importing the dictionary/language state directly -- keeps
// them free of any React/UI dependency, same as before this feature existed.
export interface ExportContext {
  labels: Dictionary['exportChrome']
  language: Language
}

// Shared by responseExport.ts (CSV) and responseXlsx.ts -- both need the
// exact same value formatting, so it lives once here instead of drifting
// apart as two copies.
export function formatAnswer(value: FieldAnswerValue | undefined, labels: ExportContext['labels']): string {
  if (value === undefined) return ''
  if (typeof value === 'boolean') return value ? labels.yes : labels.no
  if (Array.isArray(value)) return value.join('; ')
  return String(value)
}
