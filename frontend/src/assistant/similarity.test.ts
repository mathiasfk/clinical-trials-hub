import { describe, expect, it } from 'vitest'

import type { EligibilityCriterion, Study } from '../types'
import type { AssistantContext } from './types'
import {
  collectSuggestions,
  isSameCriterion,
  rankStudies,
  similarityScore,
} from './similarity'

function makeCriterion(
  description: string,
  dimensionId: string,
  overrides: Partial<EligibilityCriterion['deterministicRule']> = {},
): EligibilityCriterion {
  return {
    description,
    deterministicRule: {
      dimensionId,
      operator: '>',
      value: 1,
      unit: undefined,
      ...overrides,
    },
  }
}

function makeStudy(overrides: Partial<Study>): Study {
  return {
    id: 'study-0001',
    objectives: [],
    endpoints: [],
    inclusionCriteria: [],
    exclusionCriteria: [],
    participants: 0,
    studyType: 'parallel',
    numberOfArms: 1,
    phase: 'Phase 1',
    therapeuticArea: 'Cardiovascular',
    patientPopulation: '',
    firstPatientFirstVisit: '',
    lastPatientFirstVisit: '',
    protocolApprovalDate: '',
    ...overrides,
  }
}

function makeCurrent(
  overrides: Partial<AssistantContext['currentStudy']> = {},
): AssistantContext['currentStudy'] {
  return {
    id: 'study-current',
    therapeuticArea: 'Cardiovascular',
    phase: 'Phase 2',
    studyType: 'parallel',
    inclusionCriteria: [],
    exclusionCriteria: [],
    ...overrides,
  }
}

describe('similarityScore', () => {
  it('adds +3 for matching therapeuticArea (case-insensitive), +2 for phase, +1 for studyType', () => {
    const current = makeCurrent({
      therapeuticArea: 'cardiovascular',
      phase: 'Phase 2',
      studyType: 'parallel',
    })
    const other = makeStudy({
      id: 'study-a',
      therapeuticArea: 'Cardiovascular',
      phase: 'Phase 2',
      studyType: 'parallel',
    })

    expect(similarityScore(current, other)).toBe(6)
  })

  it('adds +1 per shared dimensionId across inclusion and exclusion criteria', () => {
    const current = makeCurrent({
      therapeuticArea: 'Oncology',
      phase: '',
      studyType: '',
      inclusionCriteria: [
        makeCriterion('A', 'hsCRP'),
        makeCriterion('A2', 'hsCRP'),
      ],
      exclusionCriteria: [makeCriterion('B', 'age')],
    })
    const other = makeStudy({
      therapeuticArea: 'Oncology',
      phase: 'Phase 3',
      inclusionCriteria: [makeCriterion('X', 'age')],
      exclusionCriteria: [makeCriterion('Y', 'hsCRP')],
    })

    expect(similarityScore(current, other)).toBe(3 + 1 + 1)
  })

  it('returns 0 when nothing matches', () => {
    const current = makeCurrent({
      therapeuticArea: 'Dermatology',
      phase: 'Phase 1',
      studyType: 'crossover',
    })
    const other = makeStudy({
      therapeuticArea: 'Oncology',
      phase: 'Phase 3',
      studyType: 'parallel',
    })

    expect(similarityScore(current, other)).toBe(0)
  })
})

describe('rankStudies', () => {
  it('orders by descending score and ascending studyId for ties, excluding current', () => {
    const current = makeCurrent({
      id: 'study-current',
      therapeuticArea: 'Cardiovascular',
      phase: 'Phase 2',
      studyType: 'parallel',
    })
    const others: Study[] = [
      makeStudy({ id: 'study-b', therapeuticArea: 'Oncology' }),
      makeStudy({ id: 'study-a', therapeuticArea: 'Cardiovascular', phase: 'Phase 2' }),
      makeStudy({ id: 'study-c', therapeuticArea: 'Cardiovascular', phase: 'Phase 2' }),
      makeStudy({ id: 'study-current', therapeuticArea: 'Cardiovascular' }),
    ]

    const ranked = rankStudies(current, others).map((s) => s.id)
    expect(ranked).toEqual(['study-a', 'study-c', 'study-b'])
  })

  it('falls back to pure studyId ordering when current has no fields filled', () => {
    const current = makeCurrent({
      id: null,
      therapeuticArea: '',
      phase: '',
      studyType: '',
      inclusionCriteria: [],
      exclusionCriteria: [],
    })
    const others: Study[] = [
      makeStudy({ id: 'study-c' }),
      makeStudy({ id: 'study-a' }),
      makeStudy({ id: 'study-b' }),
    ]

    const ranked = rankStudies(current, others).map((s) => s.id)
    expect(ranked).toEqual(['study-a', 'study-b', 'study-c'])
  })

  it('returns an empty list when there are no other studies', () => {
    const current = makeCurrent()
    expect(rankStudies(current, [])).toEqual([])
  })
})

describe('isSameCriterion', () => {
  it('matches criteria with same normalized description and identical rule', () => {
    const a = makeCriterion('  hsCRP above 2 mg/L  ', 'hsCRP', {
      value: 2,
      unit: 'mg/L',
    })
    const b = makeCriterion('hsCRP ABOVE 2 mg/L', 'hsCRP', {
      value: 2,
      unit: 'mg/L',
    })
    expect(isSameCriterion(a, b)).toBe(true)
  })

  it('does not match when the rule differs', () => {
    const a = makeCriterion('Age above 18', 'age', { value: 18 })
    const b = makeCriterion('Age above 18', 'age', { value: 21 })
    expect(isSameCriterion(a, b)).toBe(false)
  })
})

describe('collectSuggestions', () => {
  it('collects up to three criteria, inclusion before exclusion per study', () => {
    const current = makeCurrent({ inclusionCriteria: [], exclusionCriteria: [] })
    const rankedOthers: Study[] = [
      makeStudy({
        id: 'study-a',
        inclusionCriteria: [makeCriterion('A-in1', 'x')],
        exclusionCriteria: [makeCriterion('A-ex1', 'y')],
      }),
      makeStudy({
        id: 'study-b',
        inclusionCriteria: [makeCriterion('B-in1', 'x')],
        exclusionCriteria: [],
      }),
    ]

    const suggestions = collectSuggestions(current, rankedOthers)
    expect(suggestions).toHaveLength(3)
    expect(suggestions[0]).toMatchObject({ sourceStudyId: 'study-a', group: 'inclusion' })
    expect(suggestions[1]).toMatchObject({ sourceStudyId: 'study-a', group: 'exclusion' })
    expect(suggestions[2]).toMatchObject({ sourceStudyId: 'study-b', group: 'inclusion' })
  })

  it('skips criteria already present in the current draft', () => {
    const duplicate = makeCriterion('A-in1', 'x')
    const current = makeCurrent({
      inclusionCriteria: [duplicate],
      exclusionCriteria: [],
    })
    const rankedOthers: Study[] = [
      makeStudy({
        id: 'study-a',
        inclusionCriteria: [duplicate, makeCriterion('A-in2', 'y')],
      }),
    ]

    const suggestions = collectSuggestions(current, rankedOthers, 3)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].criterion.description).toBe('A-in2')
  })

  it('returns fewer than three when no further unique criteria exist', () => {
    const current = makeCurrent()
    const rankedOthers: Study[] = [
      makeStudy({ id: 'study-a', inclusionCriteria: [makeCriterion('only', 'x')] }),
    ]

    expect(collectSuggestions(current, rankedOthers)).toHaveLength(1)
  })

  it('handles empty rankedOthers', () => {
    expect(collectSuggestions(makeCurrent(), [])).toEqual([])
  })
})
