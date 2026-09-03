import type { Field, FieldType, FormSchema } from '../../lib/formSchema'
import { createField } from '../../lib/formSchema'
import { generateFormCode } from '../../lib/formCode'

export interface EditorState {
  title: string
  description: string
  slug: string
  fields: Field[]
  lastAddedFieldId: string | null
}

export type EditorAction =
  | { type: 'LOAD'; title: string; description: string; slug: string; fields: Field[] }
  | { type: 'LOAD_INTERPRETED'; title: string; description: string; fields: Field[] }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_DESCRIPTION'; description: string }
  | { type: 'SET_SLUG'; slug: string }
  | { type: 'ADD_ELEMENT'; fieldType: FieldType; index: number }
  | { type: 'REMOVE_ELEMENT'; fieldId: string }
  | { type: 'UPDATE_ELEMENT'; fieldId: string; patch: Partial<Field> }
  | { type: 'MOVE_ELEMENT'; fieldId: string; toIndex: number }
  | { type: 'CLEAR_LAST_ADDED' }

export function initialEditorState(): EditorState {
  return {
    title: '',
    description: '',
    slug: generateFormCode(),
    fields: [],
    lastAddedFieldId: null,
  }
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'LOAD':
      return {
        title: action.title,
        description: action.description,
        slug: action.slug,
        fields: action.fields,
        lastAddedFieldId: null,
      }

    case 'LOAD_INTERPRETED':
      return {
        ...state,
        title: action.title,
        description: action.description,
        fields: action.fields,
        lastAddedFieldId: null,
      }

    case 'SET_TITLE':
      return { ...state, title: action.title }

    case 'SET_DESCRIPTION':
      return { ...state, description: action.description }

    case 'SET_SLUG':
      return { ...state, slug: action.slug }

    case 'ADD_ELEMENT': {
      const field = createField(action.fieldType)
      const fields = [...state.fields]
      fields.splice(action.index, 0, field)
      return { ...state, fields, lastAddedFieldId: field.id }
    }

    case 'REMOVE_ELEMENT':
      return { ...state, fields: state.fields.filter((f) => f.id !== action.fieldId) }

    case 'UPDATE_ELEMENT':
      return {
        ...state,
        fields: state.fields.map((f) => (f.id === action.fieldId ? { ...f, ...action.patch } : f)),
      }

    case 'MOVE_ELEMENT': {
      const fromIndex = state.fields.findIndex((f) => f.id === action.fieldId)
      if (fromIndex === -1) return state
      const fields = [...state.fields]
      const [field] = fields.splice(fromIndex, 1)
      fields.splice(action.toIndex, 0, field)
      return { ...state, fields }
    }

    case 'CLEAR_LAST_ADDED':
      return { ...state, lastAddedFieldId: null }
  }
}

export function findField(state: EditorState, fieldId: string): Field | undefined {
  return state.fields.find((f) => f.id === fieldId)
}

export function buildFormSchema(state: EditorState): FormSchema {
  return {
    schemaVersion: 1,
    title: state.title,
    description: state.description || null,
    fields: state.fields,
  }
}
