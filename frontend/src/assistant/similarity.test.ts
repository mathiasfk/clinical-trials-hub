import { describe, expect, it } from 'vitest'

import type { EligibilityCriterion, Study, SuggestedCriterion } from '../types'
import type { AssistantContext } from './types'
import {
  filterCopyableCriteria,
  filterSuggestionsAgainstLocalDraft,
  isSameCriterion,
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

describe('filterSuggestionsAgainstLocalDraft', () => {
  it('drops suggestions that duplicate the local draft', () => {
    const dup = makeCriterion('dup', 'x')
    const current = makeCurrent({ inclusionCriteria: [dup] })
    const suggestions: SuggestedCriterion[] = [
      {
        sourceStudyId: 'study-a',
        group: 'inclusion',
        criterionIndex: 0,
        criterion: dup,
      },
      {
        sourceStudyId: 'study-b',
        group: 'inclusion',
        criterionIndex: 0,
        criterion: makeCriterion('keep', 'y'),
      },
    ]
    expect(filterSuggestionsAgainstLocalDraft(current, suggestions)).toHaveLength(1)
    expect(filterSuggestionsAgainstLocalDraft(current, suggestions)[0].sourceStudyId).toBe('study-b')
  })
})

describe('filterCopyableCriteria', () => {
  it('removes criteria already in the draft but keeps indexes', () => {
    const dup = makeCriterion('dup', 'x')
    const current = makeCurrent({ exclusionCriteria: [dup] })
    const study = makeStudy({
      inclusionCriteria: [dup, makeCriterion('copy-me', 'y')],
      exclusionCriteria: [makeCriterion('ex', 'z')],
    })
    const { inclusion, exclusion } = filterCopyableCriteria(current, study)
    expect(inclusion.map((e) => e.index)).toEqual([1])
    expect(exclusion).toHaveLength(1)
  })
})
