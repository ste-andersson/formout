import { decryptAnswers, encryptAnswers } from './responseCrypto'
import type { EncryptedAnswers } from './responseCrypto'
import type { FormAnswers } from './formAnswers'

// OWASP's current baseline for PBKDF2-HMAC-SHA256.
const PBKDF2_ITERATIONS = 600_000
const PBKDF2_HASH = 'SHA-256'
const SALT_LENGTH_BYTES = 16

export interface PasswordEncryptedAnswers {
  salt: Uint8Array<ArrayBuffer>
  encrypted: EncryptedAnswers
}

async function deriveKeyFromPassword(password: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const passwordBytes = new TextEncoder().encode(password) as Uint8Array<ArrayBuffer>
  const keyMaterial = await crypto.subtle.importKey('raw', passwordBytes, 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptAnswersWithPassword(
  password: string,
  answers: FormAnswers,
): Promise<PasswordEncryptedAnswers> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES))
  const key = await deriveKeyFromPassword(password, salt)
  return { salt, encrypted: await encryptAnswers(key, answers) }
}

// Throws (AES-GCM auth-tag mismatch) on a wrong password -- callers catch
// this to show a "wrong password" error rather than letting it surface as an
// unhandled rejection.
export async function decryptAnswersWithPassword(
  password: string,
  payload: PasswordEncryptedAnswers,
): Promise<FormAnswers> {
  const key = await deriveKeyFromPassword(password, payload.salt)
  return decryptAnswers(key, payload.encrypted)
}

export function bufferToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

export function base64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>
}
