export type FieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'CHECKBOX'
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'SCALE'
  | 'HEADING'
  | 'SUBHEADING'
  | 'PARAGRAPH'

export interface FieldSettings {
  min: number | null
  max: number | null
  minLabel: string | null
  maxLabel: string | null
  options: string[] | null
}

export interface Field {
  id: string
  type: FieldType
  label: string
  required: boolean
  settings: FieldSettings
}

export interface Section {
  id: string
  title: string
  fields: Field[]
}

export interface FormSchema {
  schemaVersion: number
  title: string
  description: string | null
  sections: Section[]
}

export function emptyFieldSettings(): FieldSettings {
  return { min: null, max: null, minLabel: null, maxLabel: null, options: null }
}

export const FIELD_TYPE_GROUPS: { label: string; types: FieldType[] }[] = [
  { label: 'Innehåll', types: ['HEADING', 'SUBHEADING', 'PARAGRAPH'] },
  {
    label: 'Svarstyper',
    types: ['TEXT', 'TEXTAREA', 'NUMBER', 'CHECKBOX', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SCALE'],
  },
]

export function fieldTypeLabel(type: FieldType): string {
  switch (type) {
    case 'HEADING':
      return 'Rubrik'
    case 'SUBHEADING':
      return 'Underrubrik'
    case 'PARAGRAPH':
      return 'Text'
    case 'TEXT':
      return 'Kort text'
    case 'TEXTAREA':
      return 'Lång text'
    case 'NUMBER':
      return 'Nummer'
    case 'CHECKBOX':
      return 'Kryssruta'
    case 'SINGLE_CHOICE':
      return 'Ett val'
    case 'MULTIPLE_CHOICE':
      return 'Flera val'
    case 'SCALE':
      return 'Skala'
  }
}

export function isContentBlock(type: FieldType): boolean {
  return type === 'HEADING' || type === 'SUBHEADING' || type === 'PARAGRAPH'
}

function defaultLabelFor(type: FieldType): string {
  switch (type) {
    case 'HEADING':
      return 'Rubrik'
    case 'SUBHEADING':
      return 'Underrubrik'
    case 'PARAGRAPH':
      return 'Förklarande text'
    case 'TEXT':
      return 'Skriv ett kort svar'
    case 'TEXTAREA':
      return 'Skriv ett långt svar'
    case 'NUMBER':
      return 'Skriv en siffra'
    case 'CHECKBOX':
      return 'Kryssa i rutan'
    case 'SINGLE_CHOICE':
      return 'Välj ett alternativ'
    case 'MULTIPLE_CHOICE':
      return 'Välj ett eller flera alternativ'
    case 'SCALE':
      return 'Välj en position på skalan'
  }
}

function defaultSettingsFor(type: FieldType): FieldSettings {
  if (type === 'SCALE') {
    return { min: 1, max: 5, minLabel: null, maxLabel: null, options: null }
  }
  if (type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') {
    return { min: null, max: null, minLabel: null, maxLabel: null, options: ['Alternativ 1', 'Alternativ 2'] }
  }
  return emptyFieldSettings()
}

export function createField(type: FieldType): Field {
  return {
    id: generateId(),
    type,
    label: defaultLabelFor(type),
    required: false,
    settings: defaultSettingsFor(type),
  }
}

export function createSection(): Section {
  return { id: generateId(), title: 'Ny sektion', fields: [] }
}

/**
 * crypto.randomUUID() only exists in secure contexts (HTTPS or localhost).
 * Testing over a LAN IP (e.g. from a phone) is an insecure context, where it
 * would be undefined and throw. This falls back to crypto.getRandomValues
 * (not secure-context-restricted), and finally to Math.random.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
