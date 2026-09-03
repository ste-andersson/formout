import type { FormSchema } from './formSchema'
import { isContentBlock } from './formSchema'
import type { FieldAnswerValue, FormAnswers } from './formAnswers'
import type { SavedResponse } from './responseStorage'
import { responseTimestamp } from './responseStorage'
import { formatResponseDateTime } from './responseFormat'

function csvEscape(value: string): string {
  // Always quote, not just when a special character is present: Excel/LibreOffice
  // set to Swedish locale don't just use ';' as the delimiter (see toCsv below),
  // they'll also happily treat a bare space or ':' in an unquoted field as a
  // column break during import. Quoting unconditionally is what actually keeps a
  // value like "2 sep. 2026 14:32" in a single cell.
  return `"${value.replace(/"/g, '""')}"`
}

function formatAnswer(value: FieldAnswerValue | undefined): string {
  if (value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nej'
  if (Array.isArray(value)) return value.join('; ')
  return String(value)
}

export function buildResponseCsv(schema: FormSchema, answers: FormAnswers): string {
  const rows: string[][] = [['Fråga', 'Svar']]

  for (const field of schema.fields) {
    if (isContentBlock(field.type)) {
      continue
    }
    rows.push([field.label, formatAnswer(answers[field.id])])
  }

  return toCsv(rows)
}

export function buildBulkResponseCsv(schema: FormSchema, responses: SavedResponse[]): string {
  const fields = schema.fields.filter((field) => !isContentBlock(field.type))
  const header = ['Ifyllt', ...fields.map((field) => field.label)]
  const rows = responses.map((response) => [
    formatResponseDateTime(responseTimestamp(response)),
    ...fields.map((field) => formatAnswer(response.answers[field.id])),
  ])
  return toCsv([header, ...rows])
}

export function buildResponseCsvFallback(answers: FormAnswers): string {
  const rows: string[][] = [['Fält', 'Svar']]
  for (const [fieldId, value] of Object.entries(answers)) {
    rows.push([fieldId, formatAnswer(value)])
  }
  return toCsv(rows)
}

function toCsv(rows: string[][]): string {
  // ';' rather than ',': Swedish-locale Excel/LibreOffice use comma as the
  // decimal separator, so they expect ';' as the CSV field delimiter instead --
  // opening a comma-delimited file there either mis-splits numbers or doesn't
  // split columns at all.
  return rows.map((row) => row.map(csvEscape).join(';')).join('\r\n')
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

export function buildCsvFile(filename: string, content: string): File {
  return new File(['﻿' + content], filename, { type: 'text/csv;charset=utf-8;' })
}
