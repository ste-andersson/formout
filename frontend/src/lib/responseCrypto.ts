import type { FormAnswers } from './formAnswers'

const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH_BYTES = 12

export interface EncryptedAnswers {
  __enc: 1
  iv: Uint8Array<ArrayBuffer>
  ciphertext: ArrayBuffer
}

export function isEncryptedAnswers(value: unknown): value is EncryptedAnswers {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { __enc?: unknown }).__enc === 1 &&
    (value as { iv?: unknown }).iv instanceof Uint8Array &&
    (value as { ciphertext?: unknown }).ciphertext instanceof ArrayBuffer
  )
}

export function generateDeviceKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: ALGORITHM, length: KEY_LENGTH }, false, ['encrypt', 'decrypt'])
}

export async function encryptAnswers(key: CryptoKey, answers: FormAnswers): Promise<EncryptedAnswers> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES))
  const plaintext = new TextEncoder().encode(JSON.stringify(answers))
  const ciphertext = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, plaintext)
  return { __enc: 1, iv, ciphertext }
}

export async function decryptAnswers(key: CryptoKey, payload: EncryptedAnswers): Promise<FormAnswers> {
  const plaintext = await crypto.subtle.decrypt({ name: ALGORITHM, iv: payload.iv }, key, payload.ciphertext)
  return JSON.parse(new TextDecoder().decode(plaintext)) as FormAnswers
}
