import { describe, expect, it, vi } from 'vitest'

import type { EligibilityCriterion, Study } from '../types'
import { ELIGIBILITY_SKILLS } from './skills'
import { createInitialState, reducer } from './state'
import type { AssistantContext, AssistantTurn, SkillDefinition } from './types'

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

describe('reducer — BACK_TO_MAIN with custom skills', () => {
  it('rebuilds the root menu from the skills stored in state', () => {
    const customSkills: SkillDefinition[] = [
      {
        id: 'custom-only',
        label: 'Custom skill',
        action: { type: 'START_COPY_FROM_STUDY' },
      },
    ]
    let state = createInitialState(customSkills)
    expect(state.skills).toEqual(customSkills)
    expect(lastMenuOptions(state.thread).map((o) => o.id)).toEqual(['custom-only'])

    state = reducer(state, {
      type: 'SELECT_OPTION',
      optionId: 'custom-only',
      context: makeContext(),
    })
    state = reducer(state, {
      type: 'SELECT_OPTION',
      optionId: 'back-to-main',
      context: makeContext(),
    })
    expect(lastMenuOptions(state.thread).map((o) => o.id)).toEqual(['custom-only'])
  })
})

describe('copy-from-study flow', () => {
  const hsCrp = criterion('hsCRP above 2 mg/L', 'hsCRP', { value: 2, unit: 'mg/L' })
  const ageExcl = criterion('Age above 75', 'age', { value: 75, unit: 'years' })

  function contextWithOthers(): AssistantContext {
    return makeContext({
      otherStudies: [
        study({
          id: 'study-0003',
          therapeuticArea: 'Cardiovascular',
          phase: 'Phase 2',
          inclusionCriteria: [hsCrp],
          exclusionCriteria: [ageExcl],
        }),
      ],
    })
  }

  it('progresses intro → reference id prompt → criterion picker → acknowledgement', () => {
    let state = createInitialState(ELIGIBILITY_SKILLS)
    const context = contextWithOthers()

    state = reducer(state, {
      type: 'SELECT_OPTION',
      optionId: 'copy-from-study',
      context,
    })
    expect(state.awaitingReferenceStudyId).toBe(true)
    let menu = lastMenuOptions(state.thread)
    expect(menu.map((option) => option.id)).toEqual(['back-to-main'])

    state = reducer(state, {
      type: 'REFERENCE_STUDY_RESOLVED',
      context,
      studyId: 'study-0003',
      userLabel: 'study-0003',
    })
    menu = lastMenuOptions(state.thread)
    expect(menu.find((option) => option.label.includes('hsCRP'))).toBeDefined()
    expect(menu.find((option) => option.label.includes('Age above 75'))).toBeDefined()
    expect(menu.some((option) => option.id === 'pick-another')).toBe(true)
    expect(menu.some((option) => option.id === 'back-to-main')).toBe(true)

    const inclusionOption = menu.find((option) =>
      option.id.startsWith('criterion:study-0003:inclusion'),
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

  it('shows the reference study id prompt when otherStudies is empty', () => {
    let state = createInitialState(ELIGIBILITY_SKILLS)
    state = reducer(state, {
      type: 'SELECT_OPTION',
      optionId: 'copy-from-study',
      context: makeContext(),
    })
    expect(state.awaitingReferenceStudyId).toBe(true)
    const menu = lastMenuOptions(state.thread)
    expect(menu).toHaveLength(1)
    expect(menu[0].id).toBe('back-to-main')
    const lastText = state.thread.findLast((turn) => turn.kind === 'bot-text')
    expect(lastText?.kind === 'bot-text' && lastText.text).toMatch(/Type its study id/i)
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

describe('suggest-relevant-criteria flow (server-shaped reducer)', () => {
  it('renders suggestions after RESOLVED and follow-up after accepting', () => {
    const suggestedA = criterion('A-in1', 'x')
    const suggestedB = criterion('A-ex1', 'y')
    const suggestedC = criterion('B-in1', 'x')
    const context = makeContext()

    let state = createInitialState(ELIGIBILITY_SKILLS)
    state = reducer(state, {
      type: 'SUGGEST_RELEVANT_STARTED',
      userLabel: 'Suggest criteria based on similar studies',
      mode: 'initial',
    })
    state = reducer(state, {
      type: 'SUGGEST_RELEVANT_RESOLVED',
      suggestions: [
        {
          sourceStudyId: 'study-a',
          group: 'inclusion',
          criterionIndex: 0,
          criterion: suggestedA,
        },
        {
          sourceStudyId: 'study-a',
          group: 'exclusion',
          criterionIndex: 0,
          criterion: suggestedB,
        },
        {
          sourceStudyId: 'study-0004',
          group: 'inclusion',
          criterionIndex: 0,
          criterion: suggestedC,
        },
      ],
      mode: 'initial',
    })

    let menu = lastMenuOptions(state.thread)
    const suggestOptions = menu.filter((option) => option.id.startsWith('suggest:'))
    expect(suggestOptions).toHaveLength(3)
    expect(suggestOptions[0].action).toMatchObject({
      type: 'ACCEPT_SUGGESTION',
      criterion: suggestedA,
    })

    state = reducer(state, {
      type: 'SELECT_OPTION',
      optionId: 'suggest:study-a:inclusion:0',
      context,
    })
    menu = lastMenuOptions(state.thread)
    expect(menu.map((option) => option.id)).toEqual(['suggest-three-more', 'back-to-main'])

    state = reducer(state, {
      type: 'SUGGEST_RELEVANT_STARTED',
      userLabel: 'Suggest three more',
      mode: 'more',
    })
    state = reducer(state, {
      type: 'SUGGEST_RELEVANT_RESOLVED',
      suggestions: [
        {
          sourceStudyId: 'study-0004',
          group: 'inclusion',
          criterionIndex: 1,
          criterion: criterion('B-in2', 'z'),
        },
      ],
      mode: 'more',
    })
    menu = lastMenuOptions(state.thread)
    const regenerated = menu.filter((option) => option.id.startsWith('suggest:'))
    expect(regenerated).toHaveLength(1)
  })

  it('emits a no-suggestions bot turn when RESOLVED returns an empty list', () => {
    let state = createInitialState(ELIGIBILITY_SKILLS)
    state = reducer(state, {
      type: 'SUGGEST_RELEVANT_STARTED',
      userLabel: 'Suggest criteria based on similar studies',
      mode: 'initial',
    })
    state = reducer(state, {
      type: 'SUGGEST_RELEVANT_RESOLVED',
      suggestions: [],
      mode: 'initial',
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