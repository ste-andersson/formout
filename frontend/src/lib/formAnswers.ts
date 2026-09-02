import type { Field, FormSchema } from './formSchema'

export type FieldAnswerValue = string | number | boolean | string[]
export type FormAnswers = Record<string, FieldAnswerValue>

export function isFieldAnswered(field: Field, answers: FormAnswers): boolean {
  const value = answers[field.id]

  switch (field.type) {
    case 'HEADING':
    case 'SUBHEADING':
    case 'PARAGRAPH':
    case 'SCALE':
      return true

    case 'CHECKBOX':
      return value === true

    case 'MULTIPLE_CHOICE':
      return Array.isArray(value) && value.length > 0

    case 'TEXT':
    case 'TEXTAREA':
    case 'NUMBER':
    case 'SINGLE_CHOICE':
      return typeof value === 'string' && value.trim().length > 0
  }
}

export function defaultAnswersFor(schema: FormSchema): FormAnswers {
  const answers: FormAnswers = {}
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (field.type === 'SCALE') {
        const min = field.settings.min ?? 1
        const max = field.settings.max ?? 5
        answers[field.id] = Math.round((min + max) / 2)
      }
    }
  }
  return answers
}

export function validateRequiredFields(schema: FormSchema, answers: FormAnswers): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (field.required && !isFieldAnswered(field, answers)) {
        errors[field.id] = 'Obligatoriskt fält'
      }
    }
  }
  return errors
}
