import { getFormoutDb } from './responseStorage'
import type { AdminFormSummary } from './adminApi'

// Local cache of the signed-in owner's own form list, so it (and "Dela" for
// each form, which is already fully local) still works in offline mode.
// Always mirrors the last known-good server response exactly -- cleared and
// rewritten wholesale on every successful fetch, so a form deleted on the
// server also disappears from here instead of lingering.
export async function cacheMyForms(forms: AdminFormSummary[]): Promise<void> {
  const db = await getFormoutDb()
  const tx = db.transaction('myForms', 'readwrite')
  await tx.store.clear()
  await Promise.all(forms.map((form) => tx.store.put(form)))
  await tx.done
}

export async function listCachedMyForms(): Promise<AdminFormSummary[]> {
  const db = await getFormoutDb()
  return db.getAll('myForms')
}
