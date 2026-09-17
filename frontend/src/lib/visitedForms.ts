import { getFormoutDb } from './responseStorage'
import type { FormDetail } from './api'

export interface VisitedForm {
  formId: string
  formSlug: string
  formTitle: string
  formDescription: string | null
  // Owner's relevance flag, cached from the last time this form was loaded.
  active: boolean
  // Updated every time the form is loaded again.
  visitedAt: string
  // Respondent-local, never sent to the server -- drives the "Ta bort"-knapp.
  // Whether a form is aktuell/inaktuell is decided solely by the owner's
  // `active` flag above; respondents can't override that themselves.
  hiddenLocally: boolean
}

/**
 * Upserts a visited-form record on every successful form load (not just on
 * submission) -- this is what makes a loaded-but-never-filled-in form show
 * up on the respondent's home page. Explicitly resets `hiddenLocally` to
 * false: a fresh, deliberate load (e.g. re-entering the form's code) is the
 * one case where a previously "removed" card should reappear -- otherwise
 * "Ta bort" would be permanent instead of just hiding the card.
 */
export async function recordFormVisit(form: FormDetail): Promise<void> {
  const db = await getFormoutDb()
  const record: VisitedForm = {
    formId: form.id,
    formSlug: form.slug,
    formTitle: form.title,
    formDescription: form.description,
    active: form.active,
    visitedAt: new Date().toISOString(),
    hiddenLocally: false,
  }
  await db.put('visitedForms', record)
}

export async function listVisitedForms(): Promise<VisitedForm[]> {
  const db = await getFormoutDb()
  return db.getAll('visitedForms')
}

/**
 * Refreshes only the owner-controlled display metadata (title, description,
 * active flag) for an already-visited form, WITHOUT the side effects
 * `recordFormVisit` has -- doesn't touch `visitedAt` and, crucially, doesn't
 * reset `hiddenLocally`. This is for a passive background sync (so the
 * respondent's home page reflects the owner marking a form current/outdated
 * without requiring them to re-open that specific form first), not an
 * active visit. No-op if the form was never visited.
 */
export async function refreshVisitedFormMeta(
  formId: string,
  meta: { title: string; description: string | null; active: boolean },
): Promise<void> {
  const db = await getFormoutDb()
  const existing = await db.get('visitedForms', formId)
  if (!existing) return
  await db.put('visitedForms', {
    ...existing,
    formTitle: meta.title,
    formDescription: meta.description,
    active: meta.active,
  })
}

export async function setHiddenLocally(formId: string, hidden: boolean): Promise<void> {
  const db = await getFormoutDb()
  const existing = await db.get('visitedForms', formId)
  if (!existing) return
  await db.put('visitedForms', { ...existing, hiddenLocally: hidden })
}
