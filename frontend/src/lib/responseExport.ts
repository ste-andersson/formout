import type { FormSchema } from './formSchema'
import type { FieldAnswerValue, FormAnswers } from './formAnswers'

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatAnswer(value: FieldAnswerValue | undefined): string {
  if (value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nej'
  if (Array.isArray(value)) return value.join('; ')
  return String(value)
}

export function buildResponseCsv(schema: FormSchema, answers: FormAnswers): string {
  const rows: string[][] = [['Sektion', 'Fråga', 'Svar']]

  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (field.type === 'HEADING' || field.type === 'SUBHEADING' || field.type === 'PARAGRAPH') {
        continue
      }
      rows.push([section.title, field.label, formatAnswer(answers[field.id])])
    }
  }

  return toCsv(rows)
}

export function buildResponseCsvFallback(answers: FormAnswers): string {
  const rows: string[][] = [['Fält', 'Svar']]
  for (const [fieldId, value] of Object.entries(answers)) {
    rows.push([fieldId, formatAnswer(value)])
  }
  return toCsv(rows)
}

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
