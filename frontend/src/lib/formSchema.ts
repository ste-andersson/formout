import type { Dictionary } from './i18n'

export type FieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'CHECKBOX'
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'SCALE'
  | 'DATE'
  | 'TIME'
  | 'DATETIME'
  | 'HEADING'
  | 'SUBHEADING'
  | 'PARAGRAPH'
  | 'DIVIDER'

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

export interface FormSchema {
  schemaVersion: number
  title: string
  description: string | null
  fields: Field[]
}

export function emptyFieldSettings(): FieldSettings {
  return { min: null, max: null, minLabel: null, maxLabel: null, options: null }
}

// A module-level constant can't react to a language change -- called from
// the render body instead (see ElementPalette.tsx), fresh every render.
export function getFieldTypeGroups(t: Dictionary['fieldTypeGroup']): { label: string; types: FieldType[] }[] {
  return [
    { label: t.content, types: ['HEADING', 'SUBHEADING', 'PARAGRAPH', 'DIVIDER'] },
    {
      label: t.answerTypes,
      types: ['TEXT', 'TEXTAREA', 'NUMBER', 'CHECKBOX', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SCALE', 'DATE', 'TIME', 'DATETIME'],
    },
  ]
}

export function fieldTypeLabel(type: FieldType, t: Dictionary['fieldType']): string {
  return t[type]
}

export function isContentBlock(type: FieldType): boolean {
  return type === 'HEADING' || type === 'SUBHEADING' || type === 'PARAGRAPH' || type === 'DIVIDER'
}

function defaultSettingsFor(type: FieldType, t: Dictionary['fieldDefaults']): FieldSettings {
  if (type === 'SCALE') {
    return { min: 1, max: 5, minLabel: null, maxLabel: null, options: null }
  }
  if (type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE') {
    return { min: null, max: null, minLabel: null, maxLabel: null, options: [...t.options] }
  }
  return emptyFieldSettings()
}

export function createField(type: FieldType, t: Dictionary['fieldDefaults']): Field {
  return {
    id: generateId(),
    type,
    label: t.labels[type],
    required: false,
    settings: defaultSettingsFor(type, t),
  }
}

/**
 * crypto.randomUUID() only exists in secure contexts (HTTPS or localhost).
 * Testing over a LAN IP (e.g. from a phone) is an insecure context, where it
 * would be undefined and throw. This falls back to crypto.getRandomValues
 * (not secure-context-restricted), and finally to Math.random.
 */
export function generateId(): string {
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
