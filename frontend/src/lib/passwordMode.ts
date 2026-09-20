import { getFormoutDb } from './responseStorage'

const SETTINGS_ID = 'passwordMode'

export interface PasswordModeSettings {
  id: typeof SETTINGS_ID
  enabled: boolean
}

const DEFAULT_SETTINGS: PasswordModeSettings = {
  id: SETTINGS_ID,
  enabled: false,
}

export async function getPasswordModeSettings(): Promise<PasswordModeSettings> {
  const db = await getFormoutDb()
  // See the matching comment in offlineMode.ts -- the 'settings' store holds
  // more than one shape, keyed lookups by a fixed id are always this one.
  const existing = (await db.get('settings', SETTINGS_ID)) as PasswordModeSettings | undefined
  return existing ?? DEFAULT_SETTINGS
}

export async function setPasswordModeEnabled(enabled: boolean): Promise<PasswordModeSettings> {
  const db = await getFormoutDb()
  const settings: PasswordModeSettings = { id: SETTINGS_ID, enabled }
  await db.put('settings', settings)
  return settings
}
