import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import type { Study } from './types'

const DIMENSIONS = [
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
    allowedUnits: ['years old'],
  },
]

const SEED_STUDY: Study = {
  id: 'study-0001',
  objectives: ['Assess biomarker response over twelve weeks'],
  endpoints: ['Reduction in hsCRP at week twelve'],
  inclusionCriteria: [
    {
      description: 'hsCRP above 2 mg/L.',
      deterministicRule: {
        dimensionId: 'hsCRP',
        operator: '>',
        value: 2,
        unit: 'mg/L',
      },
    },
  ],
  exclusionCriteria: [
    {
      description: 'Age above 75 years.',
      deterministicRule: { dimensionId: 'age', operator: '>', value: 75, unit: 'years old' },
    },
  ],
  participants: 120,
  studyType: 'parallel',
  numberOfArms: 2,
  phase: 'Phase 2',
  therapeuticArea: 'Cardiovascular',
  patientPopulation: 'Adults with elevated inflammation markers',
  firstPatientFirstVisit: '',
  lastPatientFirstVisit: '',
  protocolApprovalDate: '',
}

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type FetchHandler = (url: string, init?: RequestInit) => Response | Promise<Response>

function installFetch(handler: FetchHandler) {
  fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    return handler(url, init)
  })
}

function defaultHandler(studies: Study[] = [], extra?: Partial<Record<string, FetchHandler>>): FetchHandler {
  return (url, init) => {
    if (url === '/api/studies' && (!init || init.method === undefined || init.method === 'GET')) {
      return jsonResponse({ data: studies })
    }
    if (url === '/api/eligibility-dimensions') {
      return jsonResponse({ data: DIMENSIONS })
    }
    if (extra) {
      for (const [key, handler] of Object.entries(extra)) {
        if (url === key && handler) {
          return handler(url, init)
        }
      }
    }
    throw new Error(`Unexpected request in test: ${init?.method ?? 'GET'} ${url}`)
  }
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(() => {
  fetchMock.mockReset()
  window.history.pushState({}, '', '/')
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('All studies view', () => {
  it('shows only the All studies sidebar section (no Study outline) and a New study button', async () => {
    installFetch(defaultHandler())
    render(<App />)

    expect(await screen.findByRole('heading', { name: /All studies/i, level: 1 })).toBeInTheDocument()

    const allStudiesNav = screen.getByRole('navigation', { name: /All studies/i })
    expect(allStudiesNav).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: /Study outline/i })).not.toBeInTheDocument()

    const newStudyButton = screen.getByRole('button', { name: /New study/i })
    expect(newStudyButton.tagName).toBe('BUTTON')

    expect(screen.queryByRole('heading', { name: /Create study/i })).not.toBeInTheDocument()

    fireEvent.click(newStudyButton)
    await screen.findByRole('heading', { name: /New study > Study information/i, level: 1 })
    expect(window.location.pathname).toBe('/studies/new/study-information')
  })
})

describe('New study wizard', () => {
  it('shows the Study outline sidebar with an Unpublished draft indicator and a Next button', async () => {
    installFetch(defaultHandler())
    window.history.pushState({}, '', '/studies/new/study-information')
    render(<App />)

    await screen.findByRole('heading', { name: /New study > Study information/i, level: 1 })

    const outlineNav = await screen.findByRole('navigation', { name: /Study outline/i })
    expect(within(outlineNav).getByText(/Unpublished draft/i)).toBeInTheDocument()

    const nextButton = screen.getByTestId('section-next-button')
    expect(nextButton).toHaveTextContent(/^Next$/)
    expect(screen.queryByTestId('section-save-button')).not.toBeInTheDocument()
  })

  it('blocks advancement and shows inline errors when the Study information form is invalid', async () => {
    installFetch(defaultHandler())
    window.history.pushState({}, '', '/studies/new/study-information')
    render(<App />)

    const nextButton = await screen.findByTestId('section-next-button')
    fireEvent.click(nextButton)

    expect(await screen.findByText(/Phase is required\./i)).toBeInTheDocument()
    expect(screen.getByText(/Therapeutic area is required\./i)).toBeInTheDocument()
    expect(screen.getByText(/Patient population is required\./i)).toBeInTheDocument()
    expect(window.location.pathname).toBe('/studies/new/study-information')
  })

  it('advances through the wizard and publishes the draft', async () => {
    const createdStudy: Study = { ...SEED_STUDY, id: 'study-2001' }
    installFetch(
      defaultHandler([], {
        '/api/studies/study-2001': (_url, init) => {
          if (init?.method === undefined || init.method === 'GET') {
            return jsonResponse({ data: createdStudy })
          }
          throw new Error('unexpected method on GET route')
        },
      }),
    )
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (url === '/api/studies' && method === 'GET') {
        return jsonResponse({ data: [] })
      }
      if (url === '/api/eligibility-dimensions') {
        return jsonResponse({ data: DIMENSIONS })
      }
      if (url === '/api/studies' && method === 'POST') {
        return jsonResponse({ data: createdStudy }, 201)
      }
      if (url === '/api/studies/study-2001' && method === 'GET') {
        return jsonResponse({ data: createdStudy })
      }
      throw new Error(`Unexpected request: ${method} ${url}`)
    })

    window.history.pushState({}, '', '/studies/new/study-information')
    render(<App />)

    await screen.findByRole('heading', { name: /New study > Study information/i, level: 1 })

    fireEvent.change(screen.getByLabelText(/^Phase$/i), { target: { value: 'Phase 2' } })
    fireEvent.change(screen.getByLabelText(/Therapeutic area/i), { target: { value: 'Cardiovascular' } })
    fireEvent.change(screen.getByLabelText(/Patient population/i), { target: { value: 'Adults' } })
    fireEvent.change(screen.getByLabelText(/Number of participants/i), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText(/Number of arms/i), { target: { value: '2' } })
    fireEvent.click(screen.getByTestId('section-next-button'))

    await screen.findByRole('heading', { name: /New study > Objectives/i, level: 1 })
    fireEvent.change(screen.getByLabelText(/Objective 1/i), {
      target: { value: 'Evaluate biomarker response in the study' },
    })
    fireEvent.click(screen.getByTestId('section-next-button'))

    await screen.findByRole('heading', { name: /New study > Endpoints/i, level: 1 })
    fireEvent.change(screen.getByLabelText(/Endpoint 1/i), {
      target: { value: 'Reduction in hsCRP by week twelve' },
    })
    fireEvent.click(screen.getByTestId('section-next-button'))

    await screen.findByRole('heading', { name: /New study > Eligibility criteria/i, level: 1 })
    const addButtons = screen.getAllByRole('button', { name: /Add criterion/i })
    fireEvent.click(addButtons[0])
    fireEvent.click(addButtons[1])

    const descriptions = screen.getAllByPlaceholderText(/Describe the criterion/i)
    const dimensions = screen.getAllByLabelText(/^Dimension$/i)
    const values = screen.getAllByLabelText(/^Value$/i)
    const operators = screen.getAllByLabelText(/^Operator$/i)

    fireEvent.change(descriptions[0], { target: { value: 'Elevated hsCRP' } })
    fireEvent.change(dimensions[0], { target: { value: 'hsCRP' } })
    fireEvent.change(operators[0], { target: { value: '>' } })
    fireEvent.change(values[0], { target: { value: '2' } })

    fireEvent.change(descriptions[1], { target: { value: 'Advanced age' } })
    fireEvent.change(dimensions[1], { target: { value: 'age' } })
    fireEvent.change(operators[1], { target: { value: '>' } })
    fireEvent.change(values[1], { target: { value: '75' } })

    fireEvent.click(screen.getByTestId('section-next-button'))

    await screen.findByRole('heading', { name: /New study > Summary/i, level: 1 })
    expect(screen.queryByTestId(/^edit-/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('publish-button'))

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url) === '/api/studies' &&
          (init as RequestInit | undefined)?.method === 'POST',
      )
      expect(postCall).toBeDefined()
    })

    await waitFor(() => {
      expect(window.location.pathname).toBe('/studies/study-2001/summary')
    })
  })

  it('blocks Publish when any section is invalid and links to the first incomplete section', async () => {
    installFetch(defaultHandler())
    window.history.pushState({}, '', '/studies/new/summary')
    render(<App />)

    await screen.findByRole('heading', { name: /New study > Summary/i, level: 1 })
    fireEvent.click(screen.getByTestId('publish-button'))

    const incompleteHeading = await screen.findByRole('heading', { name: /Incomplete sections/i })
    const incompleteSection = incompleteHeading.parentElement
    expect(incompleteSection).not.toBeNull()
    const firstLink = within(incompleteSection as HTMLElement).getAllByRole('link')[0]
    expect(firstLink).toHaveAttribute('href', '/studies/new/study-information')

    fireEvent.click(firstLink)
    await screen.findByRole('heading', { name: /New study > Study information/i, level: 1 })
    expect(window.location.pathname).toBe('/studies/new/study-information')

    const postCalls = fetchMock.mock.calls.filter(
      ([url, init]) =>
        String(url) === '/api/studies' &&
        (init as RequestInit | undefined)?.method === 'POST',
    )
    expect(postCalls).toHaveLength(0)
  })

  it('opens the discard modal, keeps the draft on cancel and clears it on confirm', async () => {
    installFetch(defaultHandler())
    window.history.pushState({}, '', '/studies/new/summary')
    render(<App />)

    await screen.findByRole('heading', { name: /New study > Summary/i, level: 1 })
    fireEvent.click(screen.getByTestId('discard-button'))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent(/Discard new study/i)

    fireEvent.click(within(dialog).getByRole('button', { name: /Keep draft/i }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(window.location.pathname).toBe('/studies/new/summary')

    fireEvent.click(screen.getByTestId('discard-button'))
    const dialogAgain = await screen.findByRole('dialog')
    fireEvent.click(within(dialogAgain).getByRole('button', { name: /Discard draft/i }))

    await waitFor(() => {
      expect(window.location.pathname).toBe('/studies')
    })
  })
})

describe('Edit study summary', () => {
  function editHandler(study: Study): FetchHandler {
    return (url, init) => {
      const method = init?.method ?? 'GET'
      if (url === '/api/studies' && method === 'GET') {
        return jsonResponse({ data: [study] })
      }
      if (url === '/api/eligibility-dimensions') {
        return jsonResponse({ data: DIMENSIONS })
      }
      if (url === `/api/studies/${study.id}` && method === 'GET') {
        return jsonResponse({ data: study })
      }
      throw new Error(`Unexpected request: ${method} ${url}`)
    }
  }

  it('renders read-only summary cards with pencil edit links and no Publish/Discard', async () => {
    installFetch(editHandler(SEED_STUDY))
    window.history.pushState({}, '', `/studies/${SEED_STUDY.id}/summary`)
    render(<App />)

    await screen.findByRole('heading', { name: /study-0001 > Summary/i, level: 1 })
    await flush()

    expect(screen.queryByTestId('publish-button')).not.toBeInTheDocument()
    expect(screen.queryByTestId('discard-button')).not.toBeInTheDocument()

    const editInfo = screen.getByRole('link', { name: /Edit Study information/i })
    expect(editInfo).toHaveAttribute('href', `/studies/${SEED_STUDY.id}/study-information`)

    const editEligibility = screen.getByRole('link', { name: /Edit Eligibility criteria/i })
    expect(editEligibility).toHaveAttribute('href', `/studies/${SEED_STUDY.id}/eligibility`)

    const summaryCards = screen.getAllByRole('heading', { level: 3 })
    const eligibilityCardTitle = summaryCards.find(
      (heading) => heading.textContent === 'Eligibility criteria',
    )
    expect(eligibilityCardTitle).toBeDefined()
    const eligibilityCard = eligibilityCardTitle!.closest('section')
    expect(eligibilityCard).not.toBeNull()
    expect(within(eligibilityCard as HTMLElement).getByText(/hsCRP above 2 mg\/L/i)).toBeInTheDocument()
    expect(within(eligibilityCard as HTMLElement).queryByText(/Rule preview/i)).not.toBeInTheDocument()
  })

  it('shows a Save button (not Next) on the edit-mode Study information screen', async () => {
    installFetch(editHandler(SEED_STUDY))
    window.history.pushState({}, '', `/studies/${SEED_STUDY.id}/study-information`)
    render(<App />)

    await screen.findByRole('heading', { name: /study-0001 > Study information/i, level: 1 })

    const saveButton = await screen.findByTestId('section-save-button')
    expect(saveButton).toHaveTextContent(/^Save$/)
    expect(screen.queryByTestId('section-next-button')).not.toBeInTheDocument()
  })

  it('blocks Save with inline errors when the study information is invalid', async () => {
    installFetch(editHandler(SEED_STUDY))
    window.history.pushState({}, '', `/studies/${SEED_STUDY.id}/study-information`)
    render(<App />)

    const saveButton = await screen.findByTestId('section-save-button')
    fireEvent.change(screen.getByLabelText(/^Phase$/i), { target: { value: '' } })
    fireEvent.click(saveButton)

    expect(await screen.findByText(/Phase is required\./i)).toBeInTheDocument()
    const putCalls = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit | undefined)?.method === 'PUT',
    )
    expect(putCalls).toHaveLength(0)
  })

  it('sends a PUT /api/studies/:id request on Save when the form is valid', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (url === '/api/studies' && method === 'GET') {
        return jsonResponse({ data: [SEED_STUDY] })
      }
      if (url === '/api/eligibility-dimensions') {
        return jsonResponse({ data: DIMENSIONS })
      }
      if (url === `/api/studies/${SEED_STUDY.id}` && method === 'GET') {
        return jsonResponse({ data: SEED_STUDY })
      }
      if (url === `/api/studies/${SEED_STUDY.id}` && method === 'PUT') {
        const updated = { ...SEED_STUDY, phase: 'Phase 3' }
        return jsonResponse({ data: updated })
      }
      throw new Error(`Unexpected request: ${method} ${url}`)
    })

    window.history.pushState({}, '', `/studies/${SEED_STUDY.id}/study-information`)
    render(<App />)

    const phaseInput = await screen.findByLabelText(/^Phase$/i)
    await waitFor(() => {
      expect((phaseInput as HTMLSelectElement).value).toBe('Phase 2')
    })

    fireEvent.change(phaseInput, { target: { value: 'Phase 3' } })
    fireEvent.click(screen.getByTestId('section-save-button'))

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          String(url) === `/api/studies/${SEED_STUDY.id}` &&
          (init as RequestInit | undefined)?.method === 'PUT',
      )
      expect(putCall).toBeDefined()
      const body = JSON.parse(((putCall![1] as RequestInit).body as string)) as Record<string, unknown>
      expect(body.phase).toBe('Phase 3')
    })

    await screen.findByText(/Study information saved\./i)
  })
})
