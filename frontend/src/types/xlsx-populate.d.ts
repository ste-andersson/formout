// xlsx-populate ships no type definitions of its own and none exist on
// DefinitelyTyped -- this covers only the small slice of its API this app
// actually calls (writing cell values and outputting an optionally
// password-encrypted blob), not the full library surface.
declare module 'xlsx-populate/browser/xlsx-populate.js' {
  interface XlsxCell {
    value(value: string | number | boolean): XlsxCell
  }

  interface XlsxSheet {
    cell(row: number, column: number): XlsxCell
  }

  interface XlsxWorkbook {
    sheet(indexOrName: number | string): XlsxSheet
    outputAsync(options?: { password?: string }): Promise<Blob>
  }

  const XlsxPopulate: {
    fromBlankAsync(): Promise<XlsxWorkbook>
  }

  export default XlsxPopulate
}
