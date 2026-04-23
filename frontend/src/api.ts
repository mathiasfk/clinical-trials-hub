import type {
  ApiErrorResponse,
  EligibilityDimension,
  Study,
  StudyCreateInput,
  StudyEligibilityInput,
  SuggestedCriterion,
} from './types'

function apiUrl(path: string): string {
  const raw = import.meta.env.VITE_API_URL?.trim() ?? ''
  const base = raw.replace(/\/$/, '')
  return base === '' ? path : `${base}${path}`
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T | ApiErrorResponse
  if (!response.ok) {
    throw payload
  }

  return payload as T
}

export async function listStudies(): Promise<Study[]> {
  const response = await fetch(apiUrl('/api/v1/studies'))
  const payload = await parseResponse<{ data: Study[] }>(response)
  return payload.data
}

export async function getStudyById(id: string): Promise<Study> {
  const response = await fetch(apiUrl(`/api/v1/studies/${id}`))
  const payload = await parseResponse<{ data: Study }>(response)
  return payload.data
}

export async function createStudy(input: StudyCreateInput): Promise<Study> {
  const response = await fetch(apiUrl('/api/v1/studies'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  const payload = await parseResponse<{ data: Study }>(response)
  return payload.data
}

export async function replaceStudy(id: string, input: StudyCreateInput): Promise<Study> {
  const response = await fetch(apiUrl(`/api/v1/studies/${id}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  const payload = await parseResponse<{ data: Study }>(response)
  return payload.data
}

export async function updateStudyEligibility(id: string, input: StudyEligibilityInput): Promise<Study> {
  const response = await fetch(apiUrl(`/api/v1/studies/${id}/eligibility`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  const payload = await parseResponse<{ data: Study }>(response)
  return payload.data
}

export async function listEligibilityDimensions(): Promise<EligibilityDimension[]> {
  const response = await fetch(apiUrl('/api/v1/eligibility-dimensions'))
  const payload = await parseResponse<{ data: EligibilityDimension[] }>(response)
  return payload.data
}

export async function getSimilarSuggestions(
  studyId: string,
  options?: { limit?: number },
): Promise<SuggestedCriterion[]> {
  const limit = options?.limit ?? 3
  const response = await fetch(
    apiUrl(`/api/v1/studies/${encodeURIComponent(studyId)}/similar-suggestions?limit=${limit}`),
  )
  const payload = await parseResponse<{ data: SuggestedCriterion[] }>(response)
  return payload.data
}
