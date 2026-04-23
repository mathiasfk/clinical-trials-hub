import { afterEach, describe, expect, it, vi } from 'vitest'

import { getSimilarSuggestions, listStudies } from './api'
import type { SuggestedCriterion } from './types'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function jsonFetchResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const serialized = JSON.stringify(body)
  return {
    ok: init.ok ?? true,
    status: init.status ?? (init.ok === false ? 500 : 200),
    text: async () => serialized,
    json: async () => body,
  } as Response
}

describe('getSimilarSuggestions', () => {
  it('parses a successful envelope', async () => {
    const data: SuggestedCriterion[] = [
      {
        sourceStudyId: 'study-0002',
        group: 'inclusion',
        criterionIndex: 0,
        criterion: {
          description: 'Example',
          deterministicRule: {
            dimensionId: 'age',
            operator: '>=',
            value: 18,
            unit: 'years old',
          },
        },
      },
    ]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonFetchResponse({ data })))

    await expect(getSimilarSuggestions('study-0001')).resolves.toEqual(data)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/studies/study-0001/similar-suggestions?limit=3'),
    )
  })

  it('surfaces 404 payloads as thrown errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonFetchResponse({ message: 'study not found' }, { ok: false, status: 404 }),
      ),
    )

    await expect(getSimilarSuggestions('missing')).rejects.toMatchObject({
      message: 'study not found',
    })
  })

  it('throws non-2xx bodies so callers can render a message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonFetchResponse(
          { message: 'validation failed', errors: { limit: 'bad' } },
          { ok: false, status: 500 },
        ),
      ),
    )

    await expect(getSimilarSuggestions('study-0001', { limit: 0 })).rejects.toMatchObject({
      message: 'validation failed',
    })
  })
})

describe('listStudies', () => {
  it('rejects with a clear message when the body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => '<html>bad gateway</html>',
      } as Response),
    )

    await expect(listStudies()).rejects.toMatchObject({
      message: expect.stringMatching(/invalid or non-JSON/i),
    })
  })

  it('rejects when a successful response has an empty body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '',
      } as Response),
    )

    await expect(listStudies()).rejects.toMatchObject({
      message: 'Empty response from server.',
    })
  })
})
