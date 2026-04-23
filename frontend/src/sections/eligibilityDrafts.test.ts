import { describe, expect, it } from 'vitest'

import type { EligibilityDimension } from '../types'
import {
  completeDraftsToCriteria,
  createEmptyCriterionDraft,
  isCriterionDraftComplete,
} from './eligibilityDrafts'

const DIMENSIONS: EligibilityDimension[] = [
  {
    id: 'hsCRP',
    displayName: 'hsCRP',
    description: 'high-sensitivity C-reactive protein',
    allowedUnits: ['mg/L'],
  },
  {
    id: 'age',
    displayName: 'Age',
    description: 'participant age',
    allowedUnits: [],
  },
]

describe('isCriterionDraftComplete', () => {
  it('returns false for an empty row', () => {
    expect(isCriterionDraftComplete(createEmptyCriterionDraft(), DIMENSIONS)).toBe(false)
  })

  it('returns true when dimension, operator, value, and unit rules are satisfied', () => {
    const draft = {
      ...createEmptyCriterionDraft(),
      description: 'x',
      dimensionId: 'hsCRP',
      operator: '>' as const,
      value: '2',
      unit: 'mg/L',
    }
    expect(isCriterionDraftComplete(draft, DIMENSIONS)).toBe(true)
  })

  it('requires empty unit when the dimension has no allowed units', () => {
    const draft = {
      ...createEmptyCriterionDraft(),
      dimensionId: 'age',
      operator: '>' as const,
      value: '18',
      unit: 'years old',
    }
    expect(isCriterionDraftComplete(draft, DIMENSIONS)).toBe(false)
  })
})

describe('completeDraftsToCriteria', () => {
  it('drops incomplete rows and maps complete ones', () => {
    const complete = {
      ...createEmptyCriterionDraft(),
      description: 'Elevated',
      dimensionId: 'hsCRP',
      operator: '>' as const,
      value: '2',
      unit: 'mg/L',
    }
    const incomplete = createEmptyCriterionDraft()
    const result = completeDraftsToCriteria([incomplete, complete], DIMENSIONS)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      description: 'Elevated',
      deterministicRule: {
        dimensionId: 'hsCRP',
        operator: '>',
        value: 2,
        unit: 'mg/L',
      },
    })
  })
})
