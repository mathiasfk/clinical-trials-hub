import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'

const fetchMock = vi.fn()

describe('App', () => {
  beforeEach(() => {
    fetchMock.mockReset()

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders all required registration fields', async () => {
    render(<App />)

    expect(await screen.findByLabelText(/Objectives/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Endpoints/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Inclusion criteria/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Exclusion criteria/i)).toBeInTheDocument()
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
            inclusionCriteria: ['Inclusion A'],
            exclusionCriteria: ['Exclusion A'],
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
          data: [
            {
              id: 'study-1234',
              objectives: ['Primary objective'],
              endpoints: ['Primary endpoint'],
              inclusionCriteria: ['Inclusion A'],
              exclusionCriteria: ['Exclusion A'],
              participants: 100,
              studyType: 'parallel',
              numberOfArms: 2,
              phase: 'Phase II',
              therapeuticArea: 'Oncology',
              patientPopulation: 'Adults',
            },
          ],
        }),
        {
          status: 200,
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
            inclusionCriteria: ['Inclusion A'],
            exclusionCriteria: ['Exclusion A'],
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
    fireEvent.change(screen.getByLabelText(/Inclusion criteria/i), {
      target: { value: 'Inclusion A' },
    })
    fireEvent.change(screen.getByLabelText(/Exclusion criteria/i), {
      target: { value: 'Exclusion A' },
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
      inclusionCriteria: ['Inclusion A'],
      exclusionCriteria: ['Exclusion A'],
      participants: 100,
      studyType: 'parallel',
      numberOfArms: 2,
      phase: 'Phase II',
      therapeuticArea: 'Oncology',
      patientPopulation: 'Adults',
    })
  })
})
