import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import { AllStudiesPage } from './pages/AllStudiesPage'
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
    if (url === '/api/v1/studies' && (!init || init.method === undefined || init.method === 'GET')) {
      return jsonResponse({ data: studies })
    }
    if (url === '/api/v1/eligibility-dimensions') {
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

  it('renders the study card with identity, clinical, and metadata regions', async () => {
    installFetch(defaultHandler([SEED_STUDY]))
    render(<App />)

    const link = await screen.findByRole('link', { name: /study-0001/i })
    expect(link).toHaveAttribute('href', '/studies/study-0001/summary')

    const idEl = within(link).getByText('study-0001')
    expect(idEl.tagName).toBe('STRONG')
    const phaseEl = within(link).getByText('Phase 2')
    expect(idEl.parentElement).toBe(phaseEl.parentElement)

    expect(within(link).getByText('Cardiovascular')).toBeInTheDocument()
    expect(within(link).getByText(/Adults with elevated inflammation markers/)).toBeInTheDocument()
    expect(link.textContent ?? '').toContain(
      'Cardiovascular · Adults with elevated inflammation markers',
    )

    expect(within(link).getByText('parallel')).toBeInTheDocument()
    expect(within(link).getByText('120 participants')).toBeInTheDocument()
    expect(within(link).getByText('2 arms')).toBeInTheDocument()
    expect(within(link).getByText('2 criteria')).toBeInTheDocument()
  })

  it('omits the clinical separator and Not set placeholder when therapeutic area or population is empty', async () => {
    const studies: Study[] = [
      { ...SEED_STUDY, id: 'study-no-area', therapeuticArea: '' },
      { ...SEED_STUDY, id: 'study-no-pop', patientPopulation: '' },
    ]
    installFetch(defaultHandler(studies))
    render(<App />)

    const noAreaLink = await screen.findByRole('link', { name: /study-no-area/i })
    const noAreaText = noAreaLink.textContent ?? ''
    expect(noAreaText).not.toContain(' · ')
    expect(noAreaText).not.toMatch(/Not set/i)
    expect(within(noAreaLink).getByText(/Adults with elevated inflammation markers/)).toBeInTheDocument()

    const noPopLink = screen.getByRole('link', { name: /study-no-pop/i })
    const noPopText = noPopLink.textContent ?? ''
    expect(noPopText).not.toContain(' · ')
    expect(noPopText).not.toMatch(/Not set/i)
    expect(within(noPopLink).getByText('Cardiovascular')).toBeInTheDocument()
  })

  it('renders the FPFV entry only when firstPatientFirstVisit is set', async () => {
    const studies: Study[] = [
      { ...SEED_STUDY, id: 'study-with-fpfv', firstPatientFirstVisit: '2026-05-14' },
      { ...SEED_STUDY, id: 'study-no-fpfv', firstPatientFirstVisit: '' },
    ]
    installFetch(defaultHandler(studies))
    render(<App />)

    const withFpfvLink = await screen.findByRole('link', { name: /study-with-fpfv/i })
    const fpfvEntry = within(withFpfvLink).getByText(/^FPFV 2026-05-14$/)
    expect(fpfvEntry).toHaveAttribute('title', 'First patient, first visit: 2026-05-14')

    const noFpfvLink = screen.getByRole('link', { name: /study-no-fpfv/i })
    expect(noFpfvLink.textContent ?? '').not.toMatch(/FPFV/)
    expect(noFpfvLink.textContent ?? '').not.toMatch(/Not set/i)
  })
})

function renderAllStudiesPage(studies: Study[]) {
  const onRefreshStudies = vi.fn().mockResolvedValue(studies)
  const view = render(
    <MemoryRouter>
      <AllStudiesPage
        studies={studies}
        isLoadingList={false}
        loadError=""
        onRefreshStudies={onRefreshStudies}
      />
    </MemoryRouter>,
  )
  return { ...view, onRefreshStudies }
}

describe('AllStudiesPage filter bar', () => {
  const STUDY_ONC_P2: Study = {
    ...SEED_STUDY,
    id: 'study-onc-p2',
    therapeuticArea: 'Oncology',
    phase: 'Phase 2',
    studyType: 'parallel',
  }
  const STUDY_CV_P3: Study = {
    ...SEED_STUDY,
    id: 'study-cv-p3',
    therapeuticArea: 'Cardiovascular',
    phase: 'Phase 3',
    studyType: 'crossover',
  }
  const STUDY_CV_P2: Study = {
    ...SEED_STUDY,
    id: 'study-cv-p2',
    therapeuticArea: 'Cardiovascular',
    phase: 'Phase 2',
    studyType: 'single-arm',
  }
  const STUDY_MIXED_ID: Study = {
    ...SEED_STUDY,
    id: 'study-MixCase-0001',
    therapeuticArea: 'Neurology',
    phase: 'Phase 1',
    studyType: 'crossover',
  }

  const FILTER_FIXTURE: Study[] = [STUDY_ONC_P2, STUDY_CV_P3, STUDY_CV_P2, STUDY_MIXED_ID]

  it('renders the four labeled controls with default values', () => {
    renderAllStudiesPage(FILTER_FIXTURE)

    const idInput = screen.getByLabelText(/^Study ID$/i)
    expect(idInput).toHaveAttribute('placeholder', 'Search by study ID')
    expect((idInput as HTMLInputElement).value).toBe('')

    const areaSelect = screen.getByLabelText(/^Therapeutic area$/i) as HTMLSelectElement
    expect(areaSelect.value).toBe('All')

    const phaseSelect = screen.getByLabelText(/^Phase$/i) as HTMLSelectElement
    expect(phaseSelect.value).toBe('All')

    const typeSelect = screen.getByLabelText(/^Study type$/i) as HTMLSelectElement
    expect(typeSelect.value).toBe('All')
  })

  it('filters study IDs by case-insensitive substring', () => {
    renderAllStudiesPage(FILTER_FIXTURE)

    fireEvent.change(screen.getByLabelText(/^Study ID$/i), { target: { value: 'onc-p2' } })
    expect(screen.getByRole('link', { name: /study-onc-p2/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /study-cv-p3/i })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^Study ID$/i), { target: { value: '' } })
    expect(screen.getByRole('link', { name: /study-cv-p3/i })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^Study ID$/i), { target: { value: 'mixcase' } })
    expect(screen.getByRole('link', { name: /study-MixCase-0001/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /study-onc-p2/i })).not.toBeInTheDocument()
  })

  it('narrows and restores the list for each dropdown filter', () => {
    renderAllStudiesPage(FILTER_FIXTURE)

    const areaSelect = screen.getByLabelText(/^Therapeutic area$/i)
    fireEvent.change(areaSelect, { target: { value: 'Oncology' } })
    expect(screen.getByRole('link', { name: /study-onc-p2/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /study-cv-p3/i })).not.toBeInTheDocument()
    fireEvent.change(areaSelect, { target: { value: 'All' } })
    expect(screen.getByRole('link', { name: /study-cv-p3/i })).toBeInTheDocument()

    const phaseSelect = screen.getByLabelText(/^Phase$/i)
    fireEvent.change(phaseSelect, { target: { value: 'Phase 3' } })
    expect(screen.getByRole('link', { name: /study-cv-p3/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /study-onc-p2/i })).not.toBeInTheDocument()
    fireEvent.change(phaseSelect, { target: { value: 'All' } })

    const typeSelect = screen.getByLabelText(/^Study type$/i)
    fireEvent.change(typeSelect, { target: { value: 'crossover' } })
    expect(screen.getByRole('link', { name: /study-cv-p3/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /study-MixCase-0001/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /study-onc-p2/i })).not.toBeInTheDocument()
    fireEvent.change(typeSelect, { target: { value: 'All' } })
    expect(screen.getByRole('link', { name: /study-onc-p2/i })).toBeInTheDocument()
  })

  it('applies AND semantics when phase and therapeutic area are both set', () => {
    renderAllStudiesPage(FILTER_FIXTURE)

    fireEvent.change(screen.getByLabelText(/^Therapeutic area$/i), { target: { value: 'Oncology' } })
    fireEvent.change(screen.getByLabelText(/^Phase$/i), { target: { value: 'Phase 2' } })
    expect(screen.getByRole('link', { name: /study-onc-p2/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /study-cv-p2/i })).not.toBeInTheDocument()
  })

  it('updates the panel count badge for filtered and unfiltered states', () => {
    renderAllStudiesPage(FILTER_FIXTURE)

    expect(screen.getByText('4 studies')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^Therapeutic area$/i), { target: { value: 'Oncology' } })
    expect(screen.getByText('1 of 4 studies')).toBeInTheDocument()
  })

  it('shows Clear filters only when active and resets all filters', () => {
    renderAllStudiesPage(FILTER_FIXTURE)

    expect(screen.queryByRole('button', { name: /Clear filters/i })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^Study ID$/i), { target: { value: 'x' } })
    const clear = screen.getByRole('button', { name: /Clear filters/i })
    expect(clear).toBeInTheDocument()

    fireEvent.click(clear)
    expect(screen.queryByRole('button', { name: /Clear filters/i })).not.toBeInTheDocument()
    expect((screen.getByLabelText(/^Study ID$/i) as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText(/^Therapeutic area$/i) as HTMLSelectElement).value).toBe('All')
    expect(screen.getAllByRole('link').filter((l) => l.className.includes('study-card'))).toHaveLength(4)
  })

  it('shows the filtered-empty message when no studies match, not the catalog-empty message', () => {
    const { rerender } = render(
      <MemoryRouter>
        <AllStudiesPage
          studies={[]}
          isLoadingList={false}
          loadError=""
          onRefreshStudies={vi.fn().mockResolvedValue([])}
        />
      </MemoryRouter>,
    )
    expect(screen.getByText(/No studies available yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/No studies match the current filters/i)).not.toBeInTheDocument()

    rerender(
      <MemoryRouter>
        <AllStudiesPage
          studies={FILTER_FIXTURE}
          isLoadingList={false}
          loadError=""
          onRefreshStudies={vi.fn().mockResolvedValue(FILTER_FIXTURE)}
        />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByLabelText(/^Study ID$/i), { target: { value: 'no-match-xyz' } })
    expect(screen.getByText(/No studies match the current filters/i)).toBeInTheDocument()
    expect(screen.queryByText(/No studies available yet/i)).not.toBeInTheDocument()
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
        '/api/v1/studies/study-2001': (_url, init) => {
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
      if (url === '/api/v1/studies' && method === 'GET') {
        return jsonResponse({ data: [] })
      }
      if (url === '/api/v1/eligibility-dimensions') {
        return jsonResponse({ data: DIMENSIONS })
      }
      if (url === '/api/v1/studies' && method === 'POST') {
        return jsonResponse({ data: createdStudy }, 201)
      }
      if (url === '/api/v1/studies/study-2001' && method === 'GET') {
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
          String(url) === '/api/v1/studies' &&
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
        String(url) === '/api/v1/studies' &&
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
      if (url === '/api/v1/studies' && method === 'GET') {
        return jsonResponse({ data: [study] })
      }
      if (url === '/api/v1/eligibility-dimensions') {
        return jsonResponse({ data: DIMENSIONS })
      }
      if (url === `/api/v1/studies/${study.id}` && method === 'GET') {
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

  it('sends a PUT /api/v1/studies/:id request on Save when the form is valid', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (url === '/api/v1/studies' && method === 'GET') {
        return jsonResponse({ data: [SEED_STUDY] })
      }
      if (url === '/api/v1/eligibility-dimensions') {
        return jsonResponse({ data: DIMENSIONS })
      }
      if (url === `/api/v1/studies/${SEED_STUDY.id}` && method === 'GET') {
        return jsonResponse({ data: SEED_STUDY })
      }
      if (url === `/api/v1/studies/${SEED_STUDY.id}` && method === 'PUT') {
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
          String(url) === `/api/v1/studies/${SEED_STUDY.id}` &&
          (init as RequestInit | undefined)?.method === 'PUT',
      )
      expect(putCall).toBeDefined()
      const body = JSON.parse(((putCall![1] as RequestInit).body as string)) as Record<string, unknown>
      expect(body.phase).toBe('Phase 3')
    })

    await screen.findByText(/Study information saved\./i)
  })
})

describe('Eligibility assistant', () => {
  const SECOND_STUDY: Study = {
    id: 'study-0002',
    objectives: [],
    endpoints: [],
    inclusionCriteria: [
      {
        description: 'hsCRP above 5 mg/L.',
        deterministicRule: { dimensionId: 'hsCRP', operator: '>', value: 5, unit: 'mg/L' },
      },
    ],
    exclusionCriteria: [
      {
        description: 'Age above 80 years.',
        deterministicRule: { dimensionId: 'age', operator: '>', value: 80, unit: 'years old' },
      },
    ],
    participants: 80,
    studyType: 'parallel',
    numberOfArms: 2,
    phase: 'Phase 2',
    therapeuticArea: 'Cardiovascular',
    patientPopulation: 'Adults',
    firstPatientFirstVisit: '',
    lastPatientFirstVisit: '',
    protocolApprovalDate: '',
  }

  function editHandlerWithStudies(studies: Study[]): FetchHandler {
    return (url, init) => {
      const method = init?.method ?? 'GET'
      if (url === '/api/v1/studies' && method === 'GET') {
        return jsonResponse({ data: studies })
      }
      if (url === '/api/v1/eligibility-dimensions') {
        return jsonResponse({ data: DIMENSIONS })
      }
      const idMatch = url.match(/^\/api\/v1\/studies\/([^/]+)$/)
      if (idMatch && method === 'GET') {
        const found = studies.find((s) => s.id === idMatch[1])
        if (found) {
          return jsonResponse({ data: found })
        }
      }
      throw new Error(`Unexpected request: ${method} ${url}`)
    }
  }

  it('opens the FAB on Eligibility criteria and copies a criterion into the editor without saving', async () => {
    installFetch(editHandlerWithStudies([SEED_STUDY, SECOND_STUDY]))
    window.history.pushState({}, '', `/studies/${SEED_STUDY.id}/eligibility`)
    render(<App />)

    await screen.findByRole('heading', { name: /study-0001 > Eligibility criteria/i, level: 1 })
    await flush()

    fireEvent.click(screen.getByRole('button', { name: /Open StudyHub assistant/i }))

    fireEvent.click(
      screen.getByRole('button', { name: /Copy criteria from another study/i }),
    )

    const idField = await screen.findByRole('textbox', { name: /Reference study id/i })
    fireEvent.change(idField, { target: { value: 'study-0002' } })
    fireEvent.keyDown(idField, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      const byIdCalls = fetchMock.mock.calls.filter(
        ([url]) => String(url) === '/api/v1/studies/study-0002',
      )
      expect(byIdCalls.length).toBeGreaterThanOrEqual(1)
    })

    const crit = await screen.findByRole('button', {
      name: /Inclusion: hsCRP above 5 mg\/L/i,
    })
    fireEvent.click(crit)

    await waitFor(() => {
      const editorInputs = screen
        .getAllByPlaceholderText(/Describe the criterion/i)
        .map((el) => (el as HTMLInputElement).value)
      expect(editorInputs).toContain('hsCRP above 5 mg/L.')
    })

    const eligibilityPuts = fetchMock.mock.calls.filter(
      ([url, init]) =>
        /\/api\/v1\/studies\/study-0001\/eligibility/.test(String(url)) &&
        (init as RequestInit | undefined)?.method === 'PUT',
    )
    expect(eligibilityPuts).toHaveLength(0)
  })

  it('discards the conversation when navigating away and replays the intro on return', async () => {
    installFetch(editHandlerWithStudies([SEED_STUDY, SECOND_STUDY]))
    window.history.pushState({}, '', `/studies/${SEED_STUDY.id}/eligibility`)
    render(<App />)

    await screen.findByRole('heading', { name: /study-0001 > Eligibility criteria/i, level: 1 })
    fireEvent.click(screen.getByRole('button', { name: /Open StudyHub assistant/i }))
    await flush()
    fireEvent.click(
      screen.getByRole('button', { name: /Copy criteria from another study/i }),
    )
    await screen.findByRole('textbox', { name: /Reference study id/i })

    window.history.pushState({}, '', `/studies/${SEED_STUDY.id}/summary`)
    fireEvent.popState(window)
    await screen.findByRole('heading', { name: /study-0001 > Summary/i, level: 1 })

    window.history.pushState({}, '', `/studies/${SEED_STUDY.id}/eligibility`)
    fireEvent.popState(window)
    await screen.findByRole('heading', { name: /study-0001 > Eligibility criteria/i, level: 1 })
    const assistantFab = await screen.findByRole('button', { name: /Open StudyHub assistant/i })
    fireEvent.click(assistantFab)
    expect(screen.getByText(/Welcome to StudyHub assistant/i)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Reference study id/i })).not.toBeInTheDocument()
  })
})
