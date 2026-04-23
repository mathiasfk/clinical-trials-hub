import { describe, expect, it, vi, afterEach } from 'vitest'

import { getSimilarSuggestions } from './api'
import type { SuggestedCriterion } from './types'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data }),
      } as Response),
    )

    await expect(getSimilarSuggestions('study-0001')).resolves.toEqual(data)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/studies/study-0001/similar-suggestions?limit=3'),
    )
  })

  it('surfaces 404 payloads as thrown errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'study not found' }),
      } as Response),
    )

    await expect(getSimilarSuggestions('missing')).rejects.toMatchObject({
      message: 'study not found',
    })
  })

  it('throws non-2xx bodies so callers can render a message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'validation failed', errors: { limit: 'bad' } }),
      } as Response),
    )

    await expect(getSimilarSuggestions('study-0001', { limit: 0 })).rejects.toMatchObject({
      message: 'validation failed',
    })
  })
})
