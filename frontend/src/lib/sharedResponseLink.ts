import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { bufferToBase64, encryptAnswersWithPassword } from './passwordCrypto'
import type { FormAnswers } from './formAnswers'

interface SharedResponsePayloadBase {
  formSlug: string
  formTitle: string
  filledInAt: string
}

export interface PlainSharedResponsePayload extends SharedResponsePayloadBase {
  protected: false
  answers: FormAnswers
}

export interface PasswordProtectedSharedResponsePayload extends SharedResponsePayloadBase {
  protected: true
  salt: string
  iv: string
  ciphertext: string
}

export type SharedResponsePayload = PlainSharedResponsePayload | PasswordProtectedSharedResponsePayload

export function isPasswordProtectedSharedResponsePayload(
  payload: SharedResponsePayload,
): payload is PasswordProtectedSharedResponsePayload {
  return payload.protected === true
}

// Comfortably under the practical length limits of common mail clients/systems.
const MAX_URL_LENGTH = 1800

// password-protected payloads encrypt the answers with a key derived from
// `password` before building the URL -- everything else about the link
// (formSlug/formTitle/filledInAt) stays in the clear, same as an unprotected
// link, since there's nothing to gain from hiding metadata that's already
// visible on whatever page shows the link/QR.
export async function buildSharedResponsePayload(
  base: SharedResponsePayloadBase,
  answers: FormAnswers,
  password: string | null,
): Promise<SharedResponsePayload> {
  if (!password) {
    return { ...base, protected: false, answers }
  }
  const { salt, encrypted } = await encryptAnswersWithPassword(password, answers)
  return {
    ...base,
    protected: true,
    salt: bufferToBase64(salt),
    iv: bufferToBase64(encrypted.iv),
    ciphertext: bufferToBase64(new Uint8Array(encrypted.ciphertext)),
  }
}

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
    if (typeof parsed !== 'object' || parsed === null) return null

    const base = parsed as Record<string, unknown>
    if (
      typeof base.formSlug !== 'string' ||
      typeof base.formTitle !== 'string' ||
      typeof base.filledInAt !== 'string'
    ) {
      return null
    }

    if (base.protected === true) {
      if (typeof base.salt === 'string' && typeof base.iv === 'string' && typeof base.ciphertext === 'string') {
        return parsed as PasswordProtectedSharedResponsePayload
      }
      return null
    }

    if (base.protected === false && typeof base.answers === 'object' && base.answers !== null) {
      return parsed as PlainSharedResponsePayload
    }

    return null
  } catch {
    return null
  }
}
