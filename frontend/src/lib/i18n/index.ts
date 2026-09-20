import { getStoredLanguage } from '../language'
import { en } from './en'
import { sv } from './sv'
import type { Dictionary } from './dictionary'

export const dictionaries = { sv, en }

// Non-hook accessor for genuinely non-React contexts (a future service-worker
// notification string, a one-shot script). Never call this inside a render
// path: a component reading the dictionary this way instead of through
// useTranslation() wouldn't re-render when the language changes, since
// nothing here subscribes to LanguageContext -- it would just show a stale
// translation until some unrelated re-render happened to occur.
export function getT(): Dictionary {
  return dictionaries[getStoredLanguage()]
}

export type { Dictionary }
