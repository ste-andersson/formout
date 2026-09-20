import { getFormoutDb } from './responseStorage'

const SETTINGS_ID = 'offlineMode'

export interface OfflineModeSettings {
  id: typeof SETTINGS_ID
  enabled: boolean
  // Lets a signed-in admin's Clerk session (and its Cloudflare Turnstile bot
  // check) keep working while offline mode is on -- granted explicitly per
  // use via a confirmation modal (see OfflineAuthExceptionModal.tsx), never
  // implied. Always false whenever `enabled` is false: there's nothing to
  // except when offline mode itself is off.
  authExceptionsAllowed: boolean
}

const DEFAULT_SETTINGS: OfflineModeSettings = {
  id: SETTINGS_ID,
  enabled: false,
  authExceptionsAllowed: false,
}

// IndexedDB, not localStorage: a service worker can't read localStorage, but
// it needs this same state to decide whether to let a request through (see
// sw.ts). Kept as the single source of truth for both the React app and the
// service worker, rather than duplicating it in two storage layers.
export async function getOfflineModeSettings(): Promise<OfflineModeSettings> {
  const db = await getFormoutDb()
  // The 'settings' store holds more than one settings shape now (see
  // passwordMode.ts) -- this lookup is keyed by a fixed id that's always
  // this specific shape, which the store's own value type can't express.
  const existing = (await db.get('settings', SETTINGS_ID)) as OfflineModeSettings | undefined
  return existing ?? DEFAULT_SETTINGS
}

// authExceptionsAllowed defaults to false -- every call resets the exception
// unless explicitly granted in the same write (see SettingsMenu.tsx, which
// passes true here directly instead of a separate setAuthExceptionsAllowed
// call, to keep the two fields written atomically in one transaction rather
// than racing two independent read-modify-write calls). Forced to false
// whenever enabled is false regardless of what's passed in: there's nothing
// to except when offline mode itself is off.
export async function setOfflineModeEnabled(
  enabled: boolean,
  authExceptionsAllowed = false,
): Promise<OfflineModeSettings> {
  const db = await getFormoutDb()
  const settings: OfflineModeSettings = { id: SETTINGS_ID, enabled, authExceptionsAllowed: enabled && authExceptionsAllowed }
  await db.put('settings', settings)
  return settings
}

export async function setAuthExceptionsAllowed(allowed: boolean): Promise<OfflineModeSettings> {
  const db = await getFormoutDb()
  const current = await getOfflineModeSettings()
  const settings: OfflineModeSettings = { ...current, authExceptionsAllowed: allowed }
  await db.put('settings', settings)
  return settings
}
