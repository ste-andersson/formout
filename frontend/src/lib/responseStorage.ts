import type { DBSchema, IDBPDatabase } from 'idb'
import { openDB } from 'idb'
import { generateId } from './formSchema'
import type { FormAnswers } from './formAnswers'

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

interface FormoutResponsesDB extends DBSchema {
  responses: {
    key: string
    value: SavedResponse
    indexes: { 'by-formId': string }
  }
}

let dbPromise: Promise<IDBPDatabase<FormoutResponsesDB>> | null = null

function getDb(): Promise<IDBPDatabase<FormoutResponsesDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FormoutResponsesDB>('formout-responses', 1, {
      upgrade(db) {
        const store = db.createObjectStore('responses', { keyPath: 'id' })
        store.createIndex('by-formId', 'formId')
      },
    })
  }
  return dbPromise
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
  await db.put('responses', response)
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
  await db.put('responses', updated)
  return updated
}

export async function getResponse(id: string): Promise<SavedResponse | undefined> {
  const db = await getDb()
  return db.get('responses', id)
}

export async function listResponses(): Promise<SavedResponse[]> {
  const db = await getDb()
  return db.getAll('responses')
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
