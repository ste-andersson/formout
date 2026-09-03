import { jsPDF } from 'jspdf'
import type { Field, FormSchema } from './formSchema'
import type { FieldAnswerValue, FormAnswers } from './formAnswers'
import type { SavedResponse } from './responseStorage'
import { responseTimestamp } from './responseStorage'
import { formatResponseDateTime } from './responseFormat'

const MARGIN = 20
const PAGE_HEIGHT = 297
const CONTENT_WIDTH = 210 - MARGIN * 2

// Tracks where on the page we currently are, and starts a new page when the
// next thing to draw wouldn't fit -- jsPDF has no concept of document flow,
// so this replaces what the browser's layout engine used to do for free.
class PdfCursor {
  y = MARGIN
  readonly doc: jsPDF

  constructor(doc: jsPDF) {
    this.doc = doc
  }

  ensureSpace(height: number) {
    if (this.y + height > PAGE_HEIGHT - MARGIN) {
      this.newPage()
    }
  }

  newPage() {
    this.doc.addPage()
    this.y = MARGIN
  }
}

function lineHeightMm(fontSize: number): number {
  // pt -> mm, with headroom over jsPDF's own (tighter) internal line spacing
  // so our height estimate is never less than what it actually renders.
  return fontSize * 0.3528 * 1.3
}

function drawText(
  cursor: PdfCursor,
  text: string,
  { fontSize = 11, bold = false, color = 30, gapAfter = 2 }: { fontSize?: number; bold?: boolean; color?: number; gapAfter?: number } = {},
) {
  const { doc } = cursor
  doc.setFont('helvetica', bold ? 'bold' : 'normal')
  doc.setFontSize(fontSize)
  doc.setTextColor(color)
  const lines = doc.splitTextToSize(text || ' ', CONTENT_WIDTH) as string[]
  const height = lines.length * lineHeightMm(fontSize)
  cursor.ensureSpace(height + gapAfter)
  doc.text(lines, MARGIN, cursor.y + fontSize * 0.3528)
  cursor.y += height + gapAfter
}

function drawBox(cursor: PdfCursor, label: string, value: string, tall = false) {
  drawText(cursor, label, { fontSize: 10, bold: true, gapAfter: 1 })
  const { doc } = cursor
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const lines = doc.splitTextToSize(value || ' ', CONTENT_WIDTH - 4) as string[]
  const lineCount = Math.max(lines.length, tall ? 4 : 1)
  const boxHeight = lineCount * lineHeightMm(10) + 4
  cursor.ensureSpace(boxHeight + 4)
  doc.setDrawColor(80)
  doc.rect(MARGIN, cursor.y, CONTENT_WIDTH, boxHeight)
  doc.setTextColor(20)
  doc.text(lines, MARGIN + 2, cursor.y + lineHeightMm(10))
  cursor.y += boxHeight + 4
}

function drawCheckboxRow(cursor: PdfCursor, label: string, checked: boolean) {
  const { doc } = cursor
  const size = 4
  cursor.ensureSpace(size + 3)
  doc.setDrawColor(60)
  doc.setLineWidth(0.3)
  if (checked) {
    doc.setFillColor(40, 40, 40)
    doc.rect(MARGIN, cursor.y, size, size, 'FD')
    doc.setTextColor(255)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('X', MARGIN + size / 2, cursor.y + size / 2 + 1.2, { align: 'center' })
  } else {
    doc.rect(MARGIN, cursor.y, size, size, 'S')
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(20)
  doc.text(label, MARGIN + size + 3, cursor.y + size - 0.8)
  cursor.y += size + 3
}

function drawRadioRow(cursor: PdfCursor, label: string, checked: boolean) {
  const { doc } = cursor
  const r = 2
  cursor.ensureSpace(r * 2 + 3)
  const cx = MARGIN + r
  const cy = cursor.y + r
  doc.setDrawColor(60)
  doc.setLineWidth(0.3)
  doc.circle(cx, cy, r, 'S')
  if (checked) {
    doc.setFillColor(40, 40, 40)
    doc.circle(cx, cy, r * 0.5, 'F')
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(20)
  doc.text(label, MARGIN + r * 2 + 3, cy + 1)
  cursor.y += r * 2 + 3
}

function drawScale(
  cursor: PdfCursor,
  label: string,
  min: number,
  max: number,
  minLabel: string,
  maxLabel: string,
  value: number,
) {
  drawText(cursor, label, { fontSize: 10, bold: true, gapAfter: 3 })
  const { doc } = cursor
  cursor.ensureSpace(10)
  const trackY = cursor.y + 3
  doc.setDrawColor(60)
  doc.setLineWidth(0.4)
  doc.line(MARGIN, trackY, MARGIN + CONTENT_WIDTH, trackY)
  const position = max === min ? 0 : (value - min) / (max - min)
  const markerX = MARGIN + CONTENT_WIDTH * Math.min(1, Math.max(0, position))
  doc.setFillColor(40, 40, 40)
  doc.circle(markerX, trackY, 1.8, 'F')
  cursor.y = trackY + 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(90)
  doc.text(minLabel, MARGIN, cursor.y)
  doc.text(maxLabel, MARGIN + CONTENT_WIDTH, cursor.y, { align: 'right' })
  cursor.y += 6
}

function drawDivider(cursor: PdfCursor) {
  const { doc } = cursor
  cursor.ensureSpace(6)
  const y = cursor.y + 3
  doc.setDrawColor(150)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y)
  cursor.y = y + 5
}

function drawField(cursor: PdfCursor, field: Field, answer: FieldAnswerValue | undefined) {
  const options = field.settings.options ?? []

  switch (field.type) {
    case 'HEADING':
      drawText(cursor, field.label, { fontSize: 13, bold: true, gapAfter: 2 })
      return

    case 'SUBHEADING':
      drawText(cursor, field.label, { fontSize: 11, bold: true, gapAfter: 2 })
      return

    case 'PARAGRAPH':
      drawText(cursor, field.label, { fontSize: 10, color: 90, gapAfter: 2 })
      return

    case 'DIVIDER':
      drawDivider(cursor)
      return

    case 'TEXT':
    case 'NUMBER':
    case 'DATE':
    case 'TIME':
    case 'DATETIME':
      drawBox(cursor, field.label, typeof answer === 'string' ? answer : '')
      return

    case 'TEXTAREA':
      drawBox(cursor, field.label, typeof answer === 'string' ? answer : '', true)
      return

    case 'CHECKBOX':
      drawCheckboxRow(cursor, field.label, answer === true)
      return

    case 'SINGLE_CHOICE':
      drawText(cursor, field.label, { fontSize: 10, bold: true, gapAfter: 1 })
      for (const option of options) {
        drawRadioRow(cursor, option, answer === option)
      }
      cursor.y += 2
      return

    case 'MULTIPLE_CHOICE': {
      const selected = Array.isArray(answer) ? answer : []
      drawText(cursor, field.label, { fontSize: 10, bold: true, gapAfter: 1 })
      for (const option of options) {
        drawCheckboxRow(cursor, option, selected.includes(option))
      }
      cursor.y += 2
      return
    }

    case 'SCALE': {
      const min = field.settings.min ?? 1
      const max = field.settings.max ?? 5
      const value = typeof answer === 'number' ? answer : Math.round((min + max) / 2)
      drawScale(cursor, field.label, min, max, String(field.settings.minLabel ?? min), String(field.settings.maxLabel ?? max), value)
      return
    }
  }
}

function drawResponseContent(cursor: PdfCursor, schema: FormSchema, answers: FormAnswers, filledInAt: string) {
  drawText(cursor, schema.title || 'Namnlöst formulär', { fontSize: 16, bold: true, gapAfter: 1 })
  drawText(cursor, `Ifyllt: ${formatResponseDateTime(filledInAt)}`, { fontSize: 9, color: 110, gapAfter: 6 })

  for (const field of schema.fields) {
    drawField(cursor, field, answers[field.id])
  }
}

export function buildResponsePdf(schema: FormSchema, answers: FormAnswers, filledInAt: string): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  drawResponseContent(new PdfCursor(doc), schema, answers, filledInAt)
  return doc.output('blob')
}

export function buildBulkResponsePdf(schema: FormSchema, responses: SavedResponse[]): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  responses.forEach((response, index) => {
    const cursor = new PdfCursor(doc)
    if (index > 0) {
      cursor.newPage()
    }
    drawResponseContent(cursor, schema, response.answers, responseTimestamp(response))
  })
  return doc.output('blob')
}

export function downloadPdf(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
