import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'

const fetchMock = vi.fn()

describe('App', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    window.history.pushState({}, '', '/')

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
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
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders the all studies home and study creation fields', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: /All studies/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Create study/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Refresh studies/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Refresh dimensions/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Objectives/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Endpoints/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/Readable description/i)).toHaveLength(2)
    expect(screen.getAllByLabelText(/Dimension/i)).toHaveLength(2)
    expect(screen.getAllByLabelText(/Operator/i)).toHaveLength(2)
    expect(screen.getAllByLabelText(/Value/i)).toHaveLength(2)
    expect(screen.getByLabelText(/Number of participants/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Study type$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Number of arms/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Phase$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Therapeutic area/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Patient population/i)).toBeInTheDocument()
  })

  it('submits a complete study registration payload', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            id: 'study-1234',
            objectives: ['Primary objective'],
            endpoints: ['Primary endpoint'],
            inclusionCriteria: [
              {
                description: 'Require hsCRP above 2 mg/L.',
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
                description: 'Exclude participants older than 70.',
                deterministicRule: {
                  dimensionId: 'age',
                  operator: '>',
                  value: 70,
                },
              },
            ],
            participants: 100,
            studyType: 'parallel',
            numberOfArms: 2,
            phase: 'Phase II',
            therapeuticArea: 'Oncology',
            patientPopulation: 'Adults',
          },
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            id: 'study-1234',
            objectives: ['Primary objective'],
            endpoints: ['Primary endpoint'],
            inclusionCriteria: [
              {
                description: 'Require hsCRP above 2 mg/L.',
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
                description: 'Exclude participants older than 70.',
                deterministicRule: {
                  dimensionId: 'age',
                  operator: '>',
                  value: 70,
                },
              },
            ],
            participants: 100,
            studyType: 'parallel',
            numberOfArms: 2,
            phase: 'Phase II',
            therapeuticArea: 'Oncology',
            patientPopulation: 'Adults',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    render(<App />)

    fireEvent.change(await screen.findByLabelText(/Objectives/i), {
      target: { value: 'Primary objective' },
    })
    fireEvent.change(screen.getByLabelText(/Endpoints/i), {
      target: { value: 'Primary endpoint' },
    })
    fireEvent.change(screen.getAllByLabelText(/Readable description/i)[0], {
      target: { value: 'Require hsCRP above 2 mg/L.' },
    })
    fireEvent.change(screen.getAllByLabelText(/Dimension/i)[0], {
      target: { value: 'hsCRP' },
    })
    fireEvent.change(screen.getAllByLabelText(/Value/i)[0], {
      target: { value: '2' },
    })
    fireEvent.change(screen.getAllByLabelText(/Readable description/i)[1], {
      target: { value: 'Exclude participants older than 70.' },
    })
    fireEvent.change(screen.getAllByLabelText(/Dimension/i)[1], {
      target: { value: 'age' },
    })
    fireEvent.change(screen.getAllByLabelText(/Value/i)[1], {
      target: { value: '70' },
    })
    fireEvent.change(screen.getByLabelText(/Number of participants/i), {
      target: { value: '100' },
    })
    fireEvent.change(screen.getByLabelText(/Number of arms/i), {
      target: { value: '2' },
    })
    fireEvent.change(screen.getByLabelText(/^Phase$/i), {
      target: { value: 'Phase II' },
    })
    fireEvent.change(screen.getByLabelText(/Therapeutic area/i), {
      target: { value: 'Oncology' },
    })
    fireEvent.change(screen.getByLabelText(/Patient population/i), {
      target: { value: 'Adults' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Create study/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/studies',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      )
    })

    const postCall = fetchMock.mock.calls.find(
      (call) => call[0] === '/api/studies' && (call[1] as RequestInit | undefined)?.method === 'POST',
    )
    if (!postCall) {
      throw new Error('POST /api/studies was not called')
    }

    const body = JSON.parse((postCall[1] as RequestInit).body as string) as Record<string, unknown>
    expect(body).toMatchObject({
      objectives: ['Primary objective'],
      endpoints: ['Primary endpoint'],
      inclusionCriteria: [
        {
          description: 'Require hsCRP above 2 mg/L.',
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
          description: 'Exclude participants older than 70.',
          deterministicRule: {
            dimensionId: 'age',
            operator: '>',
            value: 70,
          },
        },
      ],
      participants: 100,
      studyType: 'parallel',
      numberOfArms: 2,
      phase: 'Phase II',
      therapeuticArea: 'Oncology',
      patientPopulation: 'Adults',
    })

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/studies/study-1234')
    })
    expect(window.location.pathname).toBe('/studies/study-1234/summary')
  })

  it('loads the study summary route without repeated refetch loops', async () => {
    window.history.pushState({}, '', '/studies/study-0002/summary')

    fetchMock.mockReset()
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/studies') {
        return new Response(JSON.stringify({ data: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (url === '/api/eligibility-dimensions') {
        return new Response(
          JSON.stringify({
            data: [
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
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      if (url === '/api/studies/study-0002') {
        return new Response(
          JSON.stringify({
            data: {
              id: 'study-0002',
              objectives: ['Assess biomarker response'],
              endpoints: ['Biomarker reduction at week 12'],
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
                  deterministicRule: {
                    dimensionId: 'age',
                    operator: '>',
                    value: 75,
                  },
                },
              ],
              participants: 120,
              studyType: 'parallel',
              numberOfArms: 2,
              phase: 'Phase II',
              therapeuticArea: 'Cardiology',
              patientPopulation: 'Adults with elevated inflammation markers',
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      throw new Error(`Unexpected request in test: ${url}`)
    })

    render(<App />)

    expect(await screen.findByRole('heading', { name: /Summary/i })).toBeInTheDocument()
    expect(screen.queryByText(/Loading study summary/i)).not.toBeInTheDocument()

    await waitFor(() => {
      const studyRequests = fetchMock.mock.calls.filter((call) => call[0] === '/api/studies/study-0002')
      expect(studyRequests).toHaveLength(1)
    })
  })
})
