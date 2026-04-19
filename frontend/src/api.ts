import type {
  ApiErrorResponse,
  EligibilityDimension,
  Study,
  StudyCreateInput,
  StudyEligibilityInput,
} from './types'

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T | ApiErrorResponse
  if (!response.ok) {
    throw payload
  }

  return payload as T
}

export async function listStudies(): Promise<Study[]> {
  const response = await fetch('/api/studies')
  const payload = await parseResponse<{ data: Study[] }>(response)
  return payload.data
}

export async function getStudyById(id: string): Promise<Study> {
  const response = await fetch(`/api/studies/${id}`)
  const payload = await parseResponse<{ data: Study }>(response)
  return payload.data
}

export async function createStudy(input: StudyCreateInput): Promise<Study> {
  const response = await fetch('/api/studies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })
  const payload = await parseResponse<{ data: Study }>(response)
  return payload.data
}

export async function updateStudyEligibility(id: string, input: StudyEligibilityInput): Promise<Study> {
  const response = await fetch(`/api/studies/${id}/eligibility`, {
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
  const response = await fetch('/api/eligibility-dimensions')
  const payload = await parseResponse<{ data: EligibilityDimension[] }>(response)
  return payload.data
}
