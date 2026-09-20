import type { FormSchema } from './formSchema'
import { isContentBlock } from './formSchema'
import type { FieldAnswerValue, FormAnswers } from './formAnswers'
import type { SavedResponse } from './responseStorage'
import { responseTimestamp } from './responseStorage'
import { formatResponseDateTime } from './responseFormat'
import { downloadBlob } from './downloadFile'

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

// Windows-1252 codepoints for U+0080-U+009F that don't map 1:1 onto their own
// byte value (smart quotes, em dash, etc. -- can show up if an answer was pasted
// from Word). Everything else in U+0000-U+00FF maps onto the same byte value.
const CP1252_HIGH_RANGE: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
}

// Android Chrome's "open with Google Sheets" quick-open (tapping a downloaded
// file straight from the browser) doesn't do UTF-8 detection at all -- verified
// against a real device, a UTF-8-with-BOM export renders the BOM itself as
// garbage ("ï»¿") and every å/ä/ö as mojibake, because that path just assumes a
// legacy single-byte (Windows-1252/ANSI) encoding no matter what. Statistics
// Sweden's own CSV exports are in fact plain Windows-1252 and open fine there for
// that reason. Sheets' own Arkiv > Importera flow handles UTF-8 correctly, so this
// only matters for the shortcut-open path -- but that's the one people hit by
// default, so we match what that path actually expects. Characters outside
// Windows-1252 (emoji, non-Latin scripts) fall back to '?'.
export function encodeWindows1252(text: string): Uint8Array<ArrayBuffer> {
  const bytes: number[] = []
  for (const char of text) {
    const codePoint = char.codePointAt(0) ?? 0x3f
    if (codePoint < 0x80 || (codePoint >= 0xa0 && codePoint <= 0xff)) {
      bytes.push(codePoint)
    } else {
      bytes.push(CP1252_HIGH_RANGE[codePoint] ?? 0x3f)
    }
  }
  // Plain array-length constructor overload always backs onto a fresh
  // (non-shared) ArrayBuffer -- the cast just tells TS what it can't infer,
  // since BlobPart rejects the wider Uint8Array<ArrayBufferLike> default.
  return new Uint8Array(bytes) as Uint8Array<ArrayBuffer>
}

export function downloadCsv(filename: string, content: string): void {
  downloadBlob(filename, new Blob([encodeWindows1252(content)], { type: 'text/csv' }))
}

export function buildCsvFile(filename: string, content: string): File {
  return new File([encodeWindows1252(content)], filename, { type: 'text/csv' })
}
