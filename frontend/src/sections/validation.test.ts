import { describe, expect, it } from 'vitest'

import type { EligibilityDimension } from '../types'
import {
  validateEligibility,
  validateEndpoints,
  validateObjectives,
  validateSection,
  validateStudyForPublish,
  validateStudyInformation,
} from './validation'

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
  {
    id: 'ECOG',
    displayName: 'ECOG',
    description: 'Eastern Cooperative Oncology Group performance status (0–4)',
    allowedUnits: [],
  },
]

const EMPTY_SOA = {
  firstPatientFirstVisit: '',
  lastPatientFirstVisit: '',
  protocolApprovalDate: '',
}

describe('validateStudyInformation', () => {
  it('accepts a fully-populated study information block', () => {
    const errors = validateStudyInformation({
      phase: 'Phase 2',
      therapeuticArea: 'Cardiovascular',
      patientPopulation: 'Adults',
      studyType: 'parallel',
      participants: 100,
      numberOfArms: 2,
      ...EMPTY_SOA,
    })
    expect(errors).toEqual({})
  })

  it('rejects empty required text fields and invalid numbers', () => {
    const errors = validateStudyInformation({
      phase: '   ',
      therapeuticArea: '',
      patientPopulation: '',
      studyType: 'parallel',
      participants: 0,
      numberOfArms: null,
      ...EMPTY_SOA,
    })
    expect(errors.phase).toBeTruthy()
    expect(errors.therapeuticArea).toBeTruthy()
    expect(errors.patientPopulation).toBeTruthy()
    expect(errors.participants).toBeTruthy()
    expect(errors.numberOfArms).toBeTruthy()
  })

  it('rejects an invalid study type', () => {
    const errors = validateStudyInformation({
      phase: 'Phase 2',
      therapeuticArea: 'Cardiovascular',
      patientPopulation: 'Adults',
      studyType: 'unknown' as unknown as 'parallel',
      participants: 1,
      numberOfArms: 1,
      ...EMPTY_SOA,
    })
    expect(errors.studyType).toBeTruthy()
  })

  it('rejects phase and therapeutic area outside the allow-lists', () => {
    const errors = validateStudyInformation({
      phase: 'Phase II',
      therapeuticArea: 'Respiratory',
      patientPopulation: 'Adults',
      studyType: 'parallel',
      participants: 10,
      numberOfArms: 2,
      ...EMPTY_SOA,
    })
    expect(errors.phase).toBeTruthy()
    expect(errors.therapeuticArea).toBeTruthy()
  })

  it('accepts blank SOA milestone dates', () => {
    const errors = validateStudyInformation({
      phase: 'Phase 2',
      therapeuticArea: 'Cardiovascular',
      patientPopulation: 'Adults',
      studyType: 'parallel',
      participants: 10,
      numberOfArms: 2,
      firstPatientFirstVisit: '',
      lastPatientFirstVisit: '',
      protocolApprovalDate: '',
    })
    expect(errors).toEqual({})
  })

  it('accepts well-formed ISO-8601 SOA milestone dates', () => {
    const errors = validateStudyInformation({
      phase: 'Phase 2',
      therapeuticArea: 'Cardiovascular',
      patientPopulation: 'Adults',
      studyType: 'parallel',
      participants: 10,
      numberOfArms: 2,
      firstPatientFirstVisit: '2026-01-15',
      lastPatientFirstVisit: '2026-06-20',
      protocolApprovalDate: '2025-12-01',
    })
    expect(errors).toEqual({})
  })

  it('rejects malformed SOA milestone dates', () => {
    const errors = validateStudyInformation({
      phase: 'Phase 2',
      therapeuticArea: 'Cardiovascular',
      patientPopulation: 'Adults',
      studyType: 'parallel',
      participants: 10,
      numberOfArms: 2,
      firstPatientFirstVisit: '01/15/2026',
      lastPatientFirstVisit: '2026-13-40',
      protocolApprovalDate: '',
    })
    expect(errors.firstPatientFirstVisit).toBeTruthy()
    expect(errors.lastPatientFirstVisit).toBeTruthy()
  })
})

describe('validateObjectives', () => {
  it('accepts at least one objective longer than 10 characters', () => {
    const errors = validateObjectives({
      objectives: ['Evaluate primary endpoint effects'],
    })
    expect(errors).toEqual({})
  })

  it('rejects an empty objectives list', () => {
    const errors = validateObjectives({ objectives: ['   '] })
    expect(errors.objectives).toBeTruthy()
  })

  it('rejects objectives with length <= 10', () => {
    const errors = validateObjectives({ objectives: ['short text'] })
    expect(errors['objectives[0]']).toBeTruthy()
  })
})

describe('validateEndpoints', () => {
  it('accepts at least one endpoint longer than 10 characters', () => {
    const errors = validateEndpoints({ endpoints: ['Reduction in biomarker'] })
    expect(errors).toEqual({})
  })

  it('rejects an empty endpoints list', () => {
    const errors = validateEndpoints({ endpoints: [''] })
    expect(errors.endpoints).toBeTruthy()
  })

  it('rejects endpoints with length <= 10', () => {
    const errors = validateEndpoints({ endpoints: ['tiny'] })
    expect(errors['endpoints[0]']).toBeTruthy()
  })
})

describe('validateEligibility', () => {
  it('accepts a valid inclusion and exclusion pair', () => {
    const errors = validateEligibility(
      {
        inclusionCriteria: [
          {
            description: 'hsCRP elevated',
            deterministicRule: { dimensionId: 'hsCRP', operator: '>', value: 2, unit: 'mg/L' },
          },
        ],
        exclusionCriteria: [
          {
            description: 'Old patients',
            deterministicRule: { dimensionId: 'age', operator: '>', value: 75 },
          },
        ],
      },
      DIMENSIONS,
    )
    expect(errors).toEqual({})
  })

  it('accepts inclusion-only criteria lists', () => {
    const errors = validateEligibility(
      {
        inclusionCriteria: [
          {
            description: 'hsCRP elevated',
            deterministicRule: { dimensionId: 'hsCRP', operator: '>', value: 2, unit: 'mg/L' },
          },
        ],
        exclusionCriteria: [],
      },
      DIMENSIONS,
    )
    expect(errors).toEqual({})
  })

  it('accepts exclusion-only criteria lists', () => {
    const errors = validateEligibility(
      {
        inclusionCriteria: [],
        exclusionCriteria: [
          {
            description: 'Elderly patients',
            deterministicRule: { dimensionId: 'age', operator: '>', value: 75 },
          },
        ],
      },
      DIMENSIONS,
    )
    expect(errors).toEqual({})
  })

  it('requires at least one criterion in total', () => {
    const errors = validateEligibility(
      { inclusionCriteria: [], exclusionCriteria: [] },
      DIMENSIONS,
    )
    expect(errors.eligibilityCriteria).toBeTruthy()
  })

  it('accepts unitless dimensions with an empty unit and rejects a non-empty unit', () => {
    const ok = validateEligibility(
      {
        inclusionCriteria: [
          {
            description: 'Performance status',
            deterministicRule: { dimensionId: 'ECOG', operator: '<=', value: 2, unit: '' },
          },
        ],
        exclusionCriteria: [],
      },
      DIMENSIONS,
    )
    expect(ok).toEqual({})

    const bad = validateEligibility(
      {
        inclusionCriteria: [
          {
            description: 'Performance status',
            deterministicRule: { dimensionId: 'ECOG', operator: '<=', value: 2, unit: 'score' },
          },
        ],
        exclusionCriteria: [],
      },
      DIMENSIONS,
    )
    expect(bad['inclusionCriteria[0].deterministicRule.unit']).toBeTruthy()
  })

  it('rejects incomplete deterministic rules', () => {
    const errors = validateEligibility(
      {
        inclusionCriteria: [
          {
            description: '',
            deterministicRule: { dimensionId: '', operator: '>', value: Number.NaN },
          },
        ],
        exclusionCriteria: [
          {
            description: 'Elderly',
            deterministicRule: { dimensionId: 'hsCRP', operator: '>', value: 2 },
          },
        ],
      },
      DIMENSIONS,
    )
    expect(errors['inclusionCriteria[0].description']).toBeTruthy()
    expect(errors['inclusionCriteria[0].deterministicRule.dimensionId']).toBeTruthy()
    expect(errors['inclusionCriteria[0].deterministicRule.value']).toBeTruthy()
    expect(errors['exclusionCriteria[0].deterministicRule.unit']).toBeTruthy()
  })
})

describe('validateSection', () => {
  it('dispatches to the correct validator per section', () => {
    const eligibilityErrors = validateSection(
      {
        section: 'eligibility',
        data: { inclusionCriteria: [], exclusionCriteria: [] },
      },
      DIMENSIONS,
    )
    expect(eligibilityErrors.eligibilityCriteria).toBeTruthy()

    const infoErrors = validateSection(
      {
        section: 'study-information',
        data: {
          phase: '',
          therapeuticArea: 'Cardiovascular',
          patientPopulation: 'Y',
          studyType: 'parallel',
          participants: 1,
          numberOfArms: 1,
          ...EMPTY_SOA,
        },
      },
      DIMENSIONS,
    )
    expect(infoErrors.phase).toBeTruthy()
  })
})

describe('validateStudyForPublish', () => {
  it('returns per-section error buckets when sections are invalid', () => {
    const errors = validateStudyForPublish(
      {
        studyInformation: {
          phase: '',
          therapeuticArea: '',
          patientPopulation: '',
          studyType: 'parallel',
          participants: null,
          numberOfArms: null,
          ...EMPTY_SOA,
        },
        objectives: { objectives: [''] },
        endpoints: { endpoints: [''] },
        eligibility: { inclusionCriteria: [], exclusionCriteria: [] },
      },
      DIMENSIONS,
    )
    expect(Object.keys(errors).sort()).toEqual(
      ['eligibility', 'endpoints', 'objectives', 'study-information'],
    )
  })

  it('returns no errors when every section is valid', () => {
    const errors = validateStudyForPublish(
      {
        studyInformation: {
          phase: 'Phase 2',
          therapeuticArea: 'Cardiovascular',
          patientPopulation: 'Adults',
          studyType: 'parallel',
          participants: 10,
          numberOfArms: 2,
          ...EMPTY_SOA,
        },
        objectives: { objectives: ['Evaluate primary endpoint effects'] },
        endpoints: { endpoints: ['Reduction in biomarker at week 12'] },
        eligibility: {
          inclusionCriteria: [
            {
              description: 'hsCRP elevated',
              deterministicRule: { dimensionId: 'hsCRP', operator: '>', value: 2, unit: 'mg/L' },
            },
          ],
          exclusionCriteria: [
            {
              description: 'Elderly',
              deterministicRule: { dimensionId: 'age', operator: '>', value: 75 },
            },
          ],
        },
      },
      DIMENSIONS,
    )
    expect(errors).toEqual({})
  })
})
