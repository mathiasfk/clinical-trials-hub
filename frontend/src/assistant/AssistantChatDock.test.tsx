import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { EligibilityCriterion, Study } from '../types'
import { AssistantChatDock } from './AssistantChatDock'
import type { AssistantContext } from './types'

afterEach(() => {
  cleanup()
})

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

function baseContext(overrides: Partial<AssistantContext> = {}): AssistantContext {
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

function openAssistant() {
  fireEvent.click(screen.getByRole('button', { name: /Open StudyHub assistant/i }))
}

describe('AssistantChatDock — copy-from-study flow', () => {
  const hsCrp = criterion('hsCRP above 2 mg/L', 'hsCRP', { value: 2, unit: 'mg/L' })
  const ageExcl = criterion('Age above 75', 'age', { value: 75, unit: 'years' })

  function makeContext(): AssistantContext {
    return baseContext({
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

  it('renders intro turns, root menu, and drives copy-from-study to an add', () => {
    const onAddCriterion = vi.fn()
    render(
      <AssistantChatDock context={makeContext()} onAddCriterion={onAddCriterion} />,
    )

    openAssistant()

    expect(
      screen.getByText(/Welcome to StudyHub assistant/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Copy criteria from another study/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Suggest criteria based on similar studies/i }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: /Copy criteria from another study/i }),
    )

    const idField = screen.getByRole('textbox', { name: /Reference study id/i })
    fireEvent.change(idField, { target: { value: 'study-0003' } })
    fireEvent.keyDown(idField, { key: 'Enter', code: 'Enter' })

    fireEvent.click(
      screen.getByRole('button', { name: /Inclusion: hsCRP above 2 mg\/L/i }),
    )

    expect(onAddCriterion).toHaveBeenCalledTimes(1)
    expect(onAddCriterion).toHaveBeenCalledWith('inclusion', hsCrp)

    const menus = screen.getAllByRole('group', { name: /Assistant options/i })
    const latestMenu = menus[menus.length - 1]
    fireEvent.click(within(latestMenu).getByRole('button', { name: /Back to main menu/i }))

    expect(
      screen.getAllByRole('button', { name: /Copy criteria from another study/i }).length,
    ).toBeGreaterThan(0)
  })

  it('Clear chat resets to the intro and keeps the dock open', () => {
    const onAddCriterion = vi.fn()
    render(
      <AssistantChatDock context={makeContext()} onAddCriterion={onAddCriterion} />,
    )

    openAssistant()
    fireEvent.click(
      screen.getByRole('button', { name: /Copy criteria from another study/i }),
    )
    const idField = screen.getByRole('textbox', { name: /Reference study id/i })
    fireEvent.change(idField, { target: { value: 'study-0003' } })
    fireEvent.keyDown(idField, { key: 'Enter', code: 'Enter' })

    fireEvent.click(screen.getByRole('button', { name: /Clear chat/i }))

    expect(screen.getAllByText(/Welcome to StudyHub assistant/i).length).toBe(1)
    expect(
      screen.getByRole('button', { name: /Close StudyHub assistant/i }),
    ).toBeInTheDocument()
  })
})

describe('AssistantChatDock — suggestion flow', () => {
  it('offers three suggestions, accepts one, and regenerates on Suggest three more', () => {
    const suggestedA = criterion('A-in1', 'x')
    const suggestedB = criterion('A-ex1', 'y')
    const suggestedC = criterion('B-in1', 'x')
    const unused = criterion('B-in2', 'z')

    const context: AssistantContext = baseContext({
      otherStudies: [
        study({
          id: 'study-a',
          therapeuticArea: 'Cardiovascular',
          phase: 'Phase 2',
          inclusionCriteria: [suggestedA],
          exclusionCriteria: [suggestedB],
        }),
        study({
          id: 'study-0004',
          therapeuticArea: 'Oncology',
          inclusionCriteria: [suggestedC, unused],
        }),
      ],
    })

    const onAddCriterion = vi.fn()
    const { rerender } = render(
      <AssistantChatDock context={context} onAddCriterion={onAddCriterion} />,
    )

    openAssistant()
    fireEvent.click(
      screen.getByRole('button', { name: /Suggest criteria based on similar studies/i }),
    )

    const suggestButtons = screen
      .getAllByRole('button')
      .filter((btn) => /from study-/i.test(btn.textContent ?? ''))
    expect(suggestButtons).toHaveLength(3)

    fireEvent.click(suggestButtons[0])
    expect(onAddCriterion).toHaveBeenCalledWith('inclusion', suggestedA)

    // Simulate the parent updating the context with the newly added criterion.
    const updatedContext: AssistantContext = {
      ...context,
      currentStudy: {
        ...context.currentStudy,
        inclusionCriteria: [...context.currentStudy.inclusionCriteria, suggestedA],
      },
    }
    rerender(<AssistantChatDock context={updatedContext} onAddCriterion={onAddCriterion} />)

    fireEvent.click(screen.getByRole('button', { name: /Suggest three more/i }))
    const regenerated = screen
      .getAllByRole('button')
      .filter((btn) => /from study-/i.test(btn.textContent ?? ''))
      .filter((btn) => !btn.hasAttribute('disabled'))
    const labels = regenerated.map((btn) => btn.textContent ?? '')
    expect(labels.every((label) => !/A-in1/.test(label))).toBe(true)
  })
})
