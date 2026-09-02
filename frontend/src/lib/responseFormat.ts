export function formatResponseDateTime(iso: string): string {
  return new Date(iso).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' })
}
