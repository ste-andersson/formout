import { API_BASE_URL } from './apiBaseUrl'
import type { FormSchema } from './formSchema'
import { getCachedFormBySlug } from './visitedForms'

export interface FormDetail {
  id: string
  title: string
  description: string | null
  slug: string
  // Owner-set relevance flag ("aktuell"/"inaktuell") -- purely a listing
  // hint for respondents, never an access restriction: an inactive form is
  // still fully served here.
  active: boolean
  currentVersion: number
  schema: FormSchema
  updatedAt: string
}

export async function getFormBySlug(slug: string): Promise<FormDetail | null> {
  const response = await fetch(`${API_BASE_URL}/api/forms/${encodeURIComponent(slug)}`)

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to load form: ${response.status}`)
  }

  return (await response.json()) as FormDetail
}

/**
 * Same as getFormBySlug, but falls back to a previously-cached copy of the
 * form (see visitedForms.ts) when the network request can't be made or
 * fails -- skipNetwork (offline mode switched on) skips straight to the
 * cache instead of waiting on a doomed fetch; otherwise a live fetch is
 * always tried first, cache is only the fallback.
 */
export async function getFormBySlugWithFallback(slug: string, skipNetwork: boolean): Promise<FormDetail | null> {
  if (skipNetwork) {
    return getCachedFormBySlug(slug)
  }
  try {
    return await getFormBySlug(slug)
  } catch {
    return getCachedFormBySlug(slug)
  }
}
