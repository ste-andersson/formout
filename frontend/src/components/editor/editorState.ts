import type { Field, FieldType, FormSchema, Section } from '../../lib/formSchema'
import { createField, createSection } from '../../lib/formSchema'
import { slugify } from '../../lib/slugify'

export interface EditorState {
  title: string
  description: string
  slug: string
  slugEditedManually: boolean
  sections: Section[]
  selectedElementId: string | null
}

export type EditorAction =
  | { type: 'LOAD'; title: string; description: string; slug: string; sections: Section[] }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_DESCRIPTION'; description: string }
  | { type: 'SET_SLUG'; slug: string }
  | { type: 'ADD_SECTION' }
  | { type: 'REMOVE_SECTION'; sectionId: string }
  | { type: 'RENAME_SECTION'; sectionId: string; title: string }
  | { type: 'ADD_ELEMENT'; sectionId: string; fieldType: FieldType; index: number }
  | { type: 'REMOVE_ELEMENT'; fieldId: string }
  | { type: 'UPDATE_ELEMENT'; fieldId: string; patch: Partial<Field> }
  | { type: 'MOVE_ELEMENT'; fieldId: string; toSectionId: string; toIndex: number }
  | { type: 'MOVE_SECTION'; sectionId: string; toIndex: number }
  | { type: 'SELECT_ELEMENT'; fieldId: string | null }

export function initialEditorState(): EditorState {
  return {
    title: '',
    description: '',
    slug: '',
    slugEditedManually: false,
    sections: [createSection()],
    selectedElementId: null,
  }
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'LOAD':
      return {
        title: action.title,
        description: action.description,
        slug: action.slug,
        slugEditedManually: true,
        sections: action.sections,
        selectedElementId: null,
      }

    case 'SET_TITLE': {
      const slug = state.slugEditedManually ? state.slug : slugify(action.title)
      return { ...state, title: action.title, slug }
    }

    case 'SET_DESCRIPTION':
      return { ...state, description: action.description }

    case 'SET_SLUG':
      return { ...state, slug: action.slug, slugEditedManually: true }

    case 'ADD_SECTION':
      return { ...state, sections: [...state.sections, createSection()] }

    case 'REMOVE_SECTION':
      return { ...state, sections: state.sections.filter((s) => s.id !== action.sectionId) }

    case 'RENAME_SECTION':
      return {
        ...state,
        sections: state.sections.map((s) => (s.id === action.sectionId ? { ...s, title: action.title } : s)),
      }

    case 'ADD_ELEMENT': {
      const field = createField(action.fieldType)
      return {
        ...state,
        sections: state.sections.map((s) => {
          if (s.id !== action.sectionId) return s
          const fields = [...s.fields]
          fields.splice(action.index, 0, field)
          return { ...s, fields }
        }),
        selectedElementId: field.id,
      }
    }

    case 'REMOVE_ELEMENT':
      return {
        ...state,
        sections: state.sections.map((s) => ({
          ...s,
          fields: s.fields.filter((f) => f.id !== action.fieldId),
        })),
        selectedElementId: state.selectedElementId === action.fieldId ? null : state.selectedElementId,
      }

    case 'UPDATE_ELEMENT':
      return {
        ...state,
        sections: state.sections.map((s) => ({
          ...s,
          fields: s.fields.map((f) => (f.id === action.fieldId ? { ...f, ...action.patch } : f)),
        })),
      }

    case 'MOVE_ELEMENT': {
      let moved: Field | undefined
      const withoutField = state.sections.map((s) => {
        const idx = s.fields.findIndex((f) => f.id === action.fieldId)
        if (idx === -1) return s
        moved = s.fields[idx]
        const fields = [...s.fields]
        fields.splice(idx, 1)
        return { ...s, fields }
      })
      if (!moved) return state
      const field = moved
      const withField = withoutField.map((s) => {
        if (s.id !== action.toSectionId) return s
        const fields = [...s.fields]
        fields.splice(action.toIndex, 0, field)
        return { ...s, fields }
      })
      return { ...state, sections: withField }
    }

    case 'MOVE_SECTION': {
      const fromIndex = state.sections.findIndex((s) => s.id === action.sectionId)
      if (fromIndex === -1) return state
      const sections = [...state.sections]
      const [section] = sections.splice(fromIndex, 1)
      sections.splice(action.toIndex, 0, section)
      return { ...state, sections }
    }

    case 'SELECT_ELEMENT':
      return { ...state, selectedElementId: action.fieldId }
  }
}

export function findField(state: EditorState, fieldId: string): Field | undefined {
  for (const section of state.sections) {
    const field = section.fields.find((f) => f.id === fieldId)
    if (field) return field
  }
  return undefined
}

export function buildFormSchema(state: EditorState): FormSchema {
  return {
    schemaVersion: 1,
    title: state.title,
    description: state.description || null,
    sections: state.sections,
  }
}
