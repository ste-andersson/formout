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

export async function saveResponse(input: Omit<SavedResponse, 'id' | 'createdAt'>): Promise<SavedResponse> {
  const response: SavedResponse = {
    ...input,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }
  const db = await getDb()
  await db.put('responses', response)
  return response
}
