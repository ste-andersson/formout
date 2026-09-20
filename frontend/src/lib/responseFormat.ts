import type { Language } from './language'

// en-GB, not en-US: with timeStyle: 'short', en-GB renders a 24-hour clock
// (14:32), matching sv-SE's existing convention -- en-US would switch to
// 12-hour AM/PM. Keeping one time convention across both languages avoids a
// source of misreading for a timestamp that can matter clinically (when a
// form response was filled in).
const LOCALE_BY_LANGUAGE: Record<Language, string> = { sv: 'sv-SE', en: 'en-GB' }

export function formatResponseDateTime(iso: string, language: Language): string {
  return new Date(iso).toLocaleString(LOCALE_BY_LANGUAGE[language], { dateStyle: 'medium', timeStyle: 'short' })
}
