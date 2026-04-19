import { describe, expect, it, vi } from 'vitest'

import type { EligibilityCriterion, Study } from '../types'
import { ELIGIBILITY_SKILLS } from './skills'
import { createInitialState, reducer } from './state'
import type { AssistantContext, AssistantTurn, CriterionGroup } from './types'

function criterion(
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

function study(overrides: Partial<Study>): Study {
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

function makeContext(overrides: Partial<AssistantContext> = {}): AssistantContext {
  return {
    currentStudy: {
      id: 'study-current',
      therapeuticArea: 'Cardiovascular',
      phase: 'Phase 2',
      studyType: 'parallel',
      inclusionCriteria: [],
      exclusionCriteria: [],
    },
    otherStudies: [],
    dimensions: [],
    ...overrides,
  }
}

function lastMenuOptions(thread: AssistantTurn[]) {
  for (let i = thread.length - 1; i >= 0; i -= 1) {
    const turn = thread[i]
    if (turn.kind === 'bot-menu') {
      return turn.options
    }
  }
  throw new Error('no menu in thread')
}

describe('createInitialState', () => {
  it('seeds three bot-text intros and a bot-menu with the skill root menu', () => {
    const state = createInitialState(ELIGIBILITY_SKILLS)
    const texts = state.thread.filter((turn) => turn.kind === 'bot-text')
    expect(texts).toHaveLength(3)

    const menuOptions = lastMenuOptions(state.thread)
    expect(menuOptions.map((option) => option.id)).toEqual([
      'copy-from-study',
      'suggest-relevant-criteria',
    ])
    expect(state.prompt.options).toEqual(menuOptions)
  })
})

describe('reducer — CLEAR_CHAT', () => {
  it('returns a fresh initial state', () => {
    const state = createInitialState(ELIGIBILITY_SKILLS)
    const dirty = reducer(state, {
      type: 'SELECT_OPTION',
      optionId: 'copy-from-study',
      context: makeContext(),
    })
    expect(dirty.thread.length).toBeGreaterThan(state.thread.length)

    const cleared = reducer(dirty, { type: 'CLEAR_CHAT', skills: ELIGIBILITY_SKILLS })
    expect(cleared.thread.filter((turn) => turn.kind !== 'bot-text').length).toBe(1)
    expect(cleared.prompt.options.map((option) => option.id)).toEqual([
      'copy-from-study',
      'suggest-relevant-criteria',
    ])
  })
})

describe('copy-from-study flow', () => {
  const hsCrp = criterion('hsCRP above 2 mg/L', 'hsCRP', { value: 2, unit: 'mg/L' })
  const ageExcl = criterion('Age above 75', 'age', { value: 75, unit: 'years' })

  function contextWithOthers(): AssistantContext {
    return makeContext({
      otherStudies: [
        study({
          id: 'study-b',
          therapeuticArea: 'Cardiovascular',
          phase: 'Phase 2',
          inclusionCriteria: [hsCrp],
          exclusionCriteria: [ageExcl],
        }),
      ],
    })
  }

  it('progresses intro → study picker → criterion picker → acknowledgement', () => {
    let state = createInitialState(ELIGIBILITY_SKILLS)
    const context = contextWithOthers()

    state = reducer(state, {
      type: 'SELECT_OPTION',
      optionId: 'copy-from-study',
      context,
    })
    let menu = lastMenuOptions(state.thread)
    expect(menu.some((option) => option.id === 'study:study-b')).toBe(true)

    state = reducer(state, {
      type: 'SELECT_OPTION',
      optionId: 'study:study-b',
      context,
    })
    menu = lastMenuOptions(state.thread)
    expect(menu.find((option) => option.label.includes('hsCRP'))).toBeDefined()
    expect(menu.find((option) => option.label.includes('Age above 75'))).toBeDefined()
    expect(menu.some((option) => option.id === 'pick-another')).toBe(true)
    expect(menu.some((option) => option.id === 'back-to-main')).toBe(true)

    const inclusionOption = menu.find((option) =>
      option.id.startsWith('criterion:study-b:inclusion'),
    )
    expect(inclusionOption).toBeDefined()

    state = reducer(state, {
      type: 'SELECT_OPTION',
      optionId: inclusionOption!.id,
      context,
    })
    const hasAddedText = state.thread.some(
      (turn) => turn.kind === 'bot-text' && /Added/i.test(turn.text),
    )
    expect(hasAddedText).toBe(true)

    // The criterion picker should still be the current prompt (augmented
    // context removes the just-added criterion).
    menu = lastMenuOptions(state.thread)
    expect(menu.find((option) => option.label.includes('hsCRP'))).toBeUndefined()
    expect(menu.find((option) => option.label.includes('Age above 75'))).toBeDefined()
  })

  it('emits a no-other-studies bot turn when otherStudies is empty', () => {
    let state = createInitialState(ELIGIBILITY_SKILLS)
    state = reducer(state, {
      type: 'SELECT_OPTION',
      optionId: 'copy-from-study',
      context: makeContext(),
    })
    const menu = lastMenuOptions(state.thread)
    expect(menu).toHaveLength(1)
    expect(menu[0].id).toBe('back-to-main')
    const lastText = state.thread.findLast((turn) => turn.kind === 'bot-text')
    expect(lastText?.kind === 'bot-text' && lastText.text).toMatch(/No other studies/i)
  })

  it('returns to the root menu when Back to main menu is activated', () => {
    const context = contextWithOthers()
    let state = createInitialState(ELIGIBILITY_SKILLS)
    state = reducer(state, {
      type: 'SELECT_OPTION',
      optionId: 'copy-from-study',
      context,
    })
    state = reducer(state, {
      type: 'SELECT_OPTION',
      optionId: 'back-to-main',
      context,
    })
    const menu = lastMenuOptions(state.thread)
    expect(menu.map((option) => option.id)).toEqual([
      'copy-from-study',
      'suggest-relevant-criteria',
    ])
  })
})

describe('suggest-relevant-criteria flow', () => {
  it('offers up to three suggestions, accepts one, and regenerates on demand', () => {
    const suggestedA = criterion('A-in1', 'x')
    const suggestedB = criterion('A-ex1', 'y')
    const suggestedC = criterion('B-in1', 'x')
    const unused = criterion('B-in2', 'z')
    const context = makeContext({
      otherStudies: [
        study({
          id: 'study-a',
          therapeuticArea: 'Cardiovascular',
          phase: 'Phase 2',
          inclusionCriteria: [suggestedA],
          exclusionCriteria: [suggestedB],
        }),
        study({
          id: 'study-b',
          therapeuticArea: 'Oncology',
          phase: 'Phase 3',
          inclusionCriteria: [suggestedC, unused],
        }),
      ],
    })
    let state = createInitialState(ELIGIBILITY_SKILLS)

    state = reducer(state, {
      type: 'SELECT_OPTION',
      optionId: 'suggest-relevant-criteria',
      context,
    })
    let menu = lastMenuOptions(state.thread)
    const suggestOptions = menu.filter((option) => option.id.startsWith('suggest:'))
    expect(suggestOptions).toHaveLength(3)
    expect(suggestOptions[0].id).toBe('suggest:study-a:inclusion:0')
    expect(suggestOptions[1].id).toBe('suggest:study-a:exclusion:0')
    expect(suggestOptions[2].id).toBe('suggest:study-b:inclusion:0')

    state = reducer(state, {
      type: 'SELECT_OPTION',
      optionId: 'suggest:study-a:inclusion:0',
      context,
    })
    menu = lastMenuOptions(state.thread)
    expect(menu.map((option) => option.id)).toEqual([
      'suggest-three-more',
      'back-to-main',
    ])

    const contextAfterAdd: AssistantContext = {
      ...context,
      currentStudy: {
        ...context.currentStudy,
        inclusionCriteria: [...context.currentStudy.inclusionCriteria, suggestedA],
      },
    }
    state = reducer(state, {
      type: 'SELECT_OPTION',
      optionId: 'suggest-three-more',
      context: contextAfterAdd,
    })
    menu = lastMenuOptions(state.thread)
    const regenerated = menu.filter((option) => option.id.startsWith('suggest:'))
    expect(regenerated.map((option) => option.id)).not.toContain(
      'suggest:study-a:inclusion:0',
    )
  })

  it('emits a no-suggestions bot turn when every candidate is already present', () => {
    const dup = criterion('A-in1', 'x')
    const context = makeContext({
      currentStudy: {
        ...makeContext().currentStudy,
        inclusionCriteria: [dup],
      },
      otherStudies: [
        study({ id: 'study-a', inclusionCriteria: [dup] }),
      ],
    })
    let state = createInitialState(ELIGIBILITY_SKILLS)
    state = reducer(state, {
      type: 'SELECT_OPTION',
      optionId: 'suggest-relevant-criteria',
      context,
    })
    const menu = lastMenuOptions(state.thread)
    expect(menu).toHaveLength(1)
    expect(menu[0].id).toBe('back-to-main')
  })
})

describe('reducer misc', () => {
  it('ignores unknown option ids', () => {
    const state = createInitialState(ELIGIBILITY_SKILLS)
    const next = reducer(state, {
      type: 'SELECT_OPTION',
      optionId: 'does-not-exist',
      context: makeContext(),
    })
    expect(next).toBe(state)
  })

  it('renders a Retry + Back when loadError is set', () => {
    let state = createInitialState(ELIGIBILITY_SKILLS)
    state = reducer(state, { type: 'SET_LOAD_ERROR', message: 'boom' })
    state = reducer(state, {
      type: 'SELECT_OPTION',
      optionId: 'copy-from-study',
      context: makeContext(),
    })
    const menu = lastMenuOptions(state.thread)
    expect(menu.map((option) => option.id)).toEqual(['retry', 'back-to-main'])
  })
})

// Ensure the vi import is used (vitest's auto-mock lint is strict).
void vi