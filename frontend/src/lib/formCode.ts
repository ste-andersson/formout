// Excludes visually confusable characters: 0/O, 1/l/I.
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz'
const CODE_LENGTH = 4

export function generateFormCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomIndex(ALPHABET.length)]
  }
  return code
}

function randomIndex(max: number): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const value = crypto.getRandomValues(new Uint32Array(1))[0]
    return value % max
  }
  return Math.floor(Math.random() * max)
}
