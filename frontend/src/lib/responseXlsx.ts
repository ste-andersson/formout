import type { FormSchema } from './formSchema'
import { isContentBlock } from './formSchema'
import type { FormAnswers } from './formAnswers'
import type { SavedResponse } from './responseStorage'
import { responseTimestamp } from './responseStorage'
import { formatResponseDateTime } from './responseFormat'
import type { ExportContext } from './exportContext'
import { formatAnswer } from './exportContext'

// Loaded dynamically -- xlsx-populate's browser bundle is ~1.6MB (it embeds
// its own pure-JS crypto/zip/XML implementations), so this is code-split
// into its own chunk and only fetched on the rare click that actually needs
// it, instead of bloating the main bundle for everyone.
//
// The package's default entry pulls in its raw Node source (lib/Encryptor.js
// etc.), which needs Node's real `fs`/`crypto`/`stream` and silently breaks
// at runtime once Vite externalizes those for the browser. This prebuilt
// bundle has Node builtins polyfilled in at build time instead (browserify),
// and is the one the library's own docs point at for browser usage.
async function writeRows(rows: string[][]) {
  const { default: XlsxPopulate } = await import('xlsx-populate/browser/xlsx-populate.js')
  const workbook = await XlsxPopulate.fromBlankAsync()
  const sheet = workbook.sheet(0)
  rows.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      sheet.cell(rowIndex + 1, colIndex + 1).value(value)
    })
  })
  return workbook
}

// Real password-to-open encryption (MS-OFFCRYPTO "agile encryption"), not
// just an editing restriction -- xlsx-populate implements it in pure JS, so
// this runs entirely client-side like the rest of the app's crypto. password
// is optional: omitted, this produces a plain, unprotected .xlsx (xlsx is
// offered as a normal export/share format regardless of password mode).
export async function buildResponseXlsx(
  schema: FormSchema,
  answers: FormAnswers,
  filledInAt: string,
  ctx: ExportContext,
  password?: string,
): Promise<Blob> {
  const rows: string[][] = [
    [ctx.labels.question, ctx.labels.answer],
    [ctx.labels.filledIn, formatResponseDateTime(filledInAt, ctx.language)],
  ]
  for (const field of schema.fields) {
    if (isContentBlock(field.type)) continue
    rows.push([field.label, formatAnswer(answers[field.id], ctx.labels)])
  }
  const workbook = await writeRows(rows)
  return workbook.outputAsync({ password })
}

export async function buildBulkResponseXlsx(
  schema: FormSchema,
  responses: SavedResponse[],
  ctx: ExportContext,
  password?: string,
): Promise<Blob> {
  const fields = schema.fields.filter((field) => !isContentBlock(field.type))
  const header = [ctx.labels.filledIn, ...fields.map((field) => field.label)]
  const rows = responses.map((response) => [
    formatResponseDateTime(responseTimestamp(response), ctx.language),
    ...fields.map((field) => formatAnswer(response.answers[field.id], ctx.labels)),
  ])
  const workbook = await writeRows([header, ...rows])
  return workbook.outputAsync({ password })
}
