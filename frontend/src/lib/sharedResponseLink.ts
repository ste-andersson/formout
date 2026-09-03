import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { FormAnswers } from './formAnswers'

export interface SharedResponsePayload {
  formSlug: string
  formTitle: string
  answers: FormAnswers
  filledInAt: string
}

// Comfortably under the practical length limits of common mail clients/systems.
const MAX_URL_LENGTH = 1800

export function buildSharedResponseUrl(payload: SharedResponsePayload): string | null {
  const compressed = compressToEncodedURIComponent(JSON.stringify(payload))
  const url = `${window.location.origin}/shared#${compressed}`
  return url.length > MAX_URL_LENGTH ? null : url
}

export function decodeSharedResponsePayload(hash: string): SharedResponsePayload | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return null

  try {
    const decompressed = decompressFromEncodedURIComponent(raw)
    if (!decompressed) return null

    const parsed: unknown = JSON.parse(decompressed)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'formSlug' in parsed &&
      'formTitle' in parsed &&
      'answers' in parsed &&
      'filledInAt' in parsed &&
      typeof (parsed as SharedResponsePayload).formSlug === 'string' &&
      typeof (parsed as SharedResponsePayload).formTitle === 'string' &&
      typeof (parsed as SharedResponsePayload).filledInAt === 'string' &&
      typeof (parsed as SharedResponsePayload).answers === 'object'
    ) {
      return parsed as SharedResponsePayload
    }
    return null
  } catch {
    return null
  }
}
