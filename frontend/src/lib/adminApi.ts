import type { FormSchema } from './formSchema'

export type FormStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export interface AdminFormSummary {
  id: string
  title: string
  slug: string
  status: FormStatus
  currentVersion: number
  updatedAt: string
}

export interface AdminFormDetail {
  id: string
  title: string
  description: string | null
  slug: string
  status: FormStatus
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
  const response = await fetch(`/api/admin/forms${path}`, {
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

export async function archive(token: string, id: string): Promise<AdminFormDetail> {
  const response = await adminFetch(token, `/${id}/archive`, { method: 'POST' })
  return (await response.json()) as AdminFormDetail
}

export async function deleteForm(token: string, id: string): Promise<void> {
  await adminFetch(token, `/${id}`, { method: 'DELETE' })
}
