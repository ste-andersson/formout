import { getFormoutDb } from './responseStorage'
import type { FormDetail } from './api'
import type { FormSchema } from './formSchema'

export interface VisitedForm {
  formId: string
  formSlug: string
  formTitle: string
  formDescription: string | null
  // Owner's relevance flag, cached from the last time this form was loaded.
  active: boolean
  // The form's fields and current version, cached so the form can still be
  // filled in (and its answers saved) with no network at all -- see
  // getCachedFormBySlug() and lib/api.ts's getFormBySlugWithFallback().
  schema: FormSchema
  currentVersion: number
  // Updated every time the form is loaded again.
  visitedAt: string
  // Respondent-local, never sent to the server -- drives the "Ta bort"-knapp.
  // Whether a form is aktuell/inaktuell is decided solely by the owner's
  // `active` flag above; respondents can't override that themselves.
  hiddenLocally: boolean
}

export async function recordFormVisit(form: FormDetail): Promise<void> {
  const db = await getFormoutDb()
  const record: VisitedForm = {
    formId: form.id,
    formSlug: form.slug,
    formTitle: form.title,
    formDescription: form.description,
    active: form.active,
    schema: form.schema,
    currentVersion: form.currentVersion,
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
 * Reconstructs a full FormDetail from a cached visit, for use when the form
 * can't be fetched live (offline mode, or a failed network request). Only
 * ever returns a form the respondent has actually opened at least once
 * before -- there's no way to fill in a never-seen form without a network
 * request no matter what's cached.
 */
export async function getCachedFormBySlug(slug: string): Promise<FormDetail | null> {
  const visited = await listVisitedForms()
  const match = visited.find((v) => v.formSlug === slug)
  if (!match) return null
  return {
    id: match.formId,
    title: match.formTitle,
    description: match.formDescription,
    slug: match.formSlug,
    active: match.active,
    currentVersion: match.currentVersion,
    schema: match.schema,
    updatedAt: match.visitedAt,
  }
}

export async function refreshVisitedFormMeta(
  formId: string,
  meta: {
    title: string
    description: string | null
    active: boolean
    schema: FormSchema
    currentVersion: number
  },
): Promise<void> {
  const db = await getFormoutDb()
  const existing = await db.get('visitedForms', formId)
  if (!existing) return
  await db.put('visitedForms', {
    ...existing,
    formTitle: meta.title,
    formDescription: meta.description,
    active: meta.active,
    schema: meta.schema,
    currentVersion: meta.currentVersion,
  })
}

export async function setHiddenLocally(formId: string, hidden: boolean): Promise<void> {
  const db = await getFormoutDb()
  const existing = await db.get('visitedForms', formId)
  if (!existing) return
  await db.put('visitedForms', { ...existing, hiddenLocally: hidden })
}
