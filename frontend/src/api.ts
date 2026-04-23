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
  const text = await response.text()
  let payload: unknown
  if (text.length === 0) {
    payload = undefined
  } else {
    try {
      payload = JSON.parse(text) as unknown
    } catch {
      const message = response.ok
        ? 'Unexpected response from server (invalid JSON).'
        : `Request failed (${response.status}). The server sent an invalid or non-JSON response.`
      throw { message } satisfies ApiErrorResponse
    }
  }

  if (!response.ok) {
    if (typeof payload === 'object' && payload !== null) {
      throw payload
    }
    throw {
      message: `Request failed (${response.status}).`,
    } satisfies ApiErrorResponse
  }

  if (payload === undefined) {
    throw { message: 'Empty response from server.' } satisfies ApiErrorResponse
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
