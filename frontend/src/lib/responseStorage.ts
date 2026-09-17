import type { DBSchema, IDBPDatabase } from 'idb'
import { openDB } from 'idb'
import { generateId } from './formSchema'
import type { FormAnswers } from './formAnswers'
import { decryptAnswers, encryptAnswers, generateDeviceKey, isEncryptedAnswers } from './responseCrypto'
import type { EncryptedAnswers } from './responseCrypto'

export interface SavedResponse {
  id: string
  formId: string
  formSlug: string
  formTitle: string
  formVersion: number
  answers: FormAnswers
  createdAt: string
  updatedAt: string
}

// On-disk shape: `answers` is either the new encrypted payload, or -- for
// records written before encryption was introduced -- the legacy plaintext
// FormAnswers. decryptOrMigrate() upgrades the latter to the former on read.
interface StoredResponse extends Omit<SavedResponse, 'answers'> {
  answers: EncryptedAnswers | FormAnswers
}

const DEVICE_KEY_ID = 'device-key'

// visitedForms lives in this same database (see visitedForms.ts) -- idb only
// runs one `upgrade` callback per `openDB` call, so both stores' schemas are
// defined here in one place and visitedForms.ts reuses this same connection
// via getFormoutDb(), rather than opening a second, independent connection
// that could race with this one and skip creating whichever store's owning
// module happened to call openDB() second.
interface FormoutResponsesDB extends DBSchema {
  responses: {
    key: string
    value: StoredResponse
    indexes: { 'by-formId': string }
  }
  keys: {
    key: string
    value: CryptoKey
  }
  visitedForms: {
    key: string
    value: import('./visitedForms').VisitedForm
  }
}

let dbPromise: Promise<IDBPDatabase<FormoutResponsesDB>> | null = null

export function getFormoutDb(): Promise<IDBPDatabase<FormoutResponsesDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FormoutResponsesDB>('formout-responses', 3, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('responses', { keyPath: 'id' })
          store.createIndex('by-formId', 'formId')
        }
        if (oldVersion < 2) {
          // No crypto calls here: awaiting a non-IDB async op inside the
          // versionchange transaction can cause it to auto-commit early in
          // some browsers. Key generation happens separately, after this
          // transaction has completed.
          db.createObjectStore('keys')
        }
        if (oldVersion < 3) {
          db.createObjectStore('visitedForms', { keyPath: 'formId' })
        }
      },
    })
  }
  return dbPromise
}

function getDb(): Promise<IDBPDatabase<FormoutResponsesDB>> {
  return getFormoutDb()
}

let deviceKeyPromise: Promise<CryptoKey> | null = null

async function getDeviceKey(): Promise<CryptoKey> {
  if (!deviceKeyPromise) {
    deviceKeyPromise = (async () => {
      const db = await getDb()
      const existing = await db.get('keys', DEVICE_KEY_ID)
      if (existing) return existing
      const key = await generateDeviceKey()
      await db.put('keys', key, DEVICE_KEY_ID)
      return key
    })()
  }
  return deviceKeyPromise
}

async function decryptOrMigrate(
  db: IDBPDatabase<FormoutResponsesDB>,
  key: CryptoKey,
  stored: StoredResponse,
): Promise<SavedResponse> {
  if (isEncryptedAnswers(stored.answers)) {
    return { ...stored, answers: await decryptAnswers(key, stored.answers) }
  }
  // Legacy record predating encryption: `answers` is already plaintext.
  // Re-encrypt it in place so it's protected from now on.
  const plaintext = stored.answers
  await db.put('responses', { ...stored, answers: await encryptAnswers(key, plaintext) })
  return { ...stored, answers: plaintext }
}

export async function createResponse(
  input: Omit<SavedResponse, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<SavedResponse> {
  const now = new Date().toISOString()
  const response: SavedResponse = {
    ...input,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  }
  const db = await getDb()
  const key = await getDeviceKey()
  await db.put('responses', { ...response, answers: await encryptAnswers(key, response.answers) })
  return response
}

export async function updateResponse(
  id: string,
  patch: { answers: FormAnswers; formVersion: number },
): Promise<SavedResponse> {
  const db = await getDb()
  const existing = await db.get('responses', id)
  if (!existing) {
    throw new Error(`No saved response with id ${id}`)
  }
  const updated: SavedResponse = {
    ...existing,
    answers: patch.answers,
    formVersion: patch.formVersion,
    updatedAt: new Date().toISOString(),
  }
  const key = await getDeviceKey()
  await db.put('responses', { ...updated, answers: await encryptAnswers(key, updated.answers) })
  return updated
}

export async function getResponse(id: string): Promise<SavedResponse | undefined> {
  const db = await getDb()
  const stored = await db.get('responses', id)
  if (!stored) return undefined
  const key = await getDeviceKey()
  return decryptOrMigrate(db, key, stored)
}

export async function listResponses(): Promise<SavedResponse[]> {
  const db = await getDb()
  const stored = await db.getAll('responses')
  const key = await getDeviceKey()
  return Promise.all(stored.map((response) => decryptOrMigrate(db, key, response)))
}

export async function deleteResponse(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('responses', id)
}

/**
 * Responses saved before `updatedAt` existed only have `createdAt` -- old
 * IndexedDB records aren't retroactively migrated when the code's shape
 * changes, so reads need to tolerate that instead of assuming the field.
 */
export function responseTimestamp(response: SavedResponse): string {
  return response.updatedAt ?? response.createdAt
}
