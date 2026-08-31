export interface FormDetail {
  id: string
  title: string
  description: string | null
  slug: string
  currentVersion: number
  schema: unknown
  updatedAt: string
}

export async function getFormBySlug(slug: string): Promise<FormDetail | null> {
  const response = await fetch(`/api/forms/${encodeURIComponent(slug)}`)

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to load form: ${response.status}`)
  }

  return (await response.json()) as FormDetail
}
