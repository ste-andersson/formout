import { API_BASE_URL } from './apiBaseUrl'
import type { Field, FormSchema } from './formSchema'

export type FormStatus = 'DRAFT' | 'PUBLISHED'

export function formStatusLabel(status: FormStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Utkast'
    case 'PUBLISHED':
      return 'Publicerad'
  }
}

export interface AdminFormSummary {
  id: string
  title: string
  slug: string
  status: FormStatus
  // Owner-set relevance flag ("aktuell"/"inaktuell"), shown to respondents on
  // their home page -- independent of publish status, see markCurrent/markOutdated.
  active: boolean
  currentVersion: number
  updatedAt: string
}

export interface AdminFormDetail {
  id: string
  title: string
  description: string | null
  slug: string
  status: FormStatus
  active: boolean
  currentVersion: number
  schema: FormSchema
  updatedAt: string
}

export interface CreateFormRequest {
  title: string
  description: string | null
  slug: string
  schema: FormSchema
}

export interface UpdateFormMetadataRequest {
  title: string
  description: string | null
}

export interface AddFormVersionRequest {
  schema: FormSchema
}

export class AdminApiError extends Error {
  status: number

  constructor(status: number) {
    super(`Admin API request failed: ${status}`)
    this.status = status
  }
}

async function adminFetch(token: string, path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}/api/admin/forms${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new AdminApiError(response.status)
  }

  return response
}

export async function listMyForms(token: string): Promise<AdminFormSummary[]> {
  const response = await adminFetch(token, '')
  return (await response.json()) as AdminFormSummary[]
}

export async function getForm(token: string, id: string): Promise<AdminFormDetail> {
  const response = await adminFetch(token, `/${id}`)
  return (await response.json()) as AdminFormDetail
}

export async function createForm(token: string, request: CreateFormRequest): Promise<AdminFormDetail> {
  const response = await adminFetch(token, '', {
    method: 'POST',
    body: JSON.stringify(request),
  })
  return (await response.json()) as AdminFormDetail
}

export async function updateMetadata(
  token: string,
  id: string,
  request: UpdateFormMetadataRequest,
): Promise<AdminFormDetail> {
  const response = await adminFetch(token, `/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(request),
  })
  return (await response.json()) as AdminFormDetail
}

export async function addVersion(
  token: string,
  id: string,
  request: AddFormVersionRequest,
): Promise<AdminFormDetail> {
  const response = await adminFetch(token, `/${id}/versions`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
  return (await response.json()) as AdminFormDetail
}

export async function publish(token: string, id: string): Promise<AdminFormDetail> {
  const response = await adminFetch(token, `/${id}/publish`, { method: 'POST' })
  return (await response.json()) as AdminFormDetail
}

export async function unpublish(token: string, id: string): Promise<AdminFormDetail> {
  const response = await adminFetch(token, `/${id}/unpublish`, { method: 'POST' })
  return (await response.json()) as AdminFormDetail
}

// Owner-set relevance flag -- deliberately separate from publish/unpublish:
// a form stays fully published and fillable regardless of this flag, it only
// affects how respondents see it listed on their home page.
export async function markCurrent(token: string, id: string): Promise<AdminFormDetail> {
  const response = await adminFetch(token, `/${id}/mark-current`, { method: 'POST' })
  return (await response.json()) as AdminFormDetail
}

export async function markOutdated(token: string, id: string): Promise<AdminFormDetail> {
  const response = await adminFetch(token, `/${id}/mark-outdated`, { method: 'POST' })
  return (await response.json()) as AdminFormDetail
}

export async function deleteForm(token: string, id: string): Promise<void> {
  await adminFetch(token, `/${id}`, { method: 'DELETE' })
}

export async function interpretImage(token: string, file: File, previousFields?: Field[]): Promise<FormSchema> {
  const formData = new FormData()
  formData.append('file', file)

  // previousFields (if given) are fields already interpreted from earlier
  // pages of this same multi-page form -- sent as context only, so the AI
  // can avoid repeating them and can follow an established pattern. The id
  // is dropped: it's an internal, random value with no meaning to the model.
  if (previousFields && previousFields.length > 0) {
    const context = previousFields.map(({ type, label, required, settings }) => ({
      type,
      label,
      required,
      settings,
    }))
    formData.append('context', JSON.stringify(context))
  }

  // Backend has its own 90s read timeout on the OpenAI call, which should
  // always produce a proper error response first. This is just a fallback so
  // the "tolkar formuläret"-modal can never hang forever even if the stall
  // happens somewhere between the browser and the backend instead.
  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => timeoutController.abort(), 100_000)

  // Not routed through adminFetch: it always sets Content-Type: application/json,
  // but a multipart body needs the browser to set its own boundary-aware header.
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/admin/forms/interpret`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
      signal: timeoutController.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    throw new AdminApiError(response.status)
  }

  return (await response.json()) as FormSchema
}
