import type {
  EligibilityCriterion,
  EligibilityDimension,
  Study,
  StudyType,
} from '../types'
import { isPhaseOption, isTherapeuticAreaOption } from './constants'

export interface StudyInformationData {
  phase: string
  therapeuticArea: string
  patientPopulation: string
  studyType: StudyType
  participants: number | null
  numberOfArms: number | null
  firstPatientFirstVisit: string
  lastPatientFirstVisit: string
  protocolApprovalDate: string
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export interface ObjectivesData {
  objectives: string[]
}

export interface EndpointsData {
  endpoints: string[]
}

export interface EligibilityData {
  inclusionCriteria: EligibilityCriterion[]
  exclusionCriteria: EligibilityCriterion[]
}

export type SectionData =
  | { section: 'study-information'; data: StudyInformationData }
  | { section: 'objectives'; data: ObjectivesData }
  | { section: 'endpoints'; data: EndpointsData }
  | { section: 'eligibility'; data: EligibilityData }

const ALLOWED_STUDY_TYPES: StudyType[] = ['parallel', 'crossover', 'single-arm']

export function validateStudyInformation(
  data: StudyInformationData,
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!data.phase.trim()) {
    errors.phase = 'Phase is required.'
  } else if (!isPhaseOption(data.phase)) {
    errors.phase = 'Phase must be selected from the allowed list.'
  }
  if (!data.therapeuticArea.trim()) {
    errors.therapeuticArea = 'Therapeutic area is required.'
  } else if (!isTherapeuticAreaOption(data.therapeuticArea)) {
    errors.therapeuticArea = 'Therapeutic area must be selected from the allowed list.'
  }
  if (!data.patientPopulation.trim()) {
    errors.patientPopulation = 'Patient population is required.'
  }
  if (!ALLOWED_STUDY_TYPES.includes(data.studyType)) {
    errors.studyType = 'Study type must be parallel, crossover, or single-arm.'
  }
  if (data.participants === null || !Number.isFinite(data.participants) || data.participants < 1) {
    errors.participants = 'Participants must be at least 1.'
  }
  if (data.numberOfArms === null || !Number.isFinite(data.numberOfArms) || data.numberOfArms < 1) {
    errors.numberOfArms = 'Number of arms must be at least 1.'
  }
  validateOptionalIsoDate(
    'firstPatientFirstVisit',
    data.firstPatientFirstVisit,
    'First patient first visit',
    errors,
  )
  validateOptionalIsoDate(
    'lastPatientFirstVisit',
    data.lastPatientFirstVisit,
    'Last patient first visit',
    errors,
  )
  validateOptionalIsoDate(
    'protocolApprovalDate',
    data.protocolApprovalDate,
    'Protocol approval date',
    errors,
  )
  return errors
}

function validateOptionalIsoDate(
  field: string,
  value: string,
  label: string,
  errors: Record<string, string>,
) {
  if (!value.trim()) {
    return
  }
  if (!ISO_DATE_PATTERN.test(value)) {
    errors[field] = `${label} must be an ISO-8601 date (YYYY-MM-DD).`
    return
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    errors[field] = `${label} must be a valid date.`
  }
}

export function validateObjectives(data: ObjectivesData): Record<string, string> {
  const errors: Record<string, string> = {}
  const normalized = data.objectives.map((objective) => objective.trim()).filter(Boolean)
  if (normalized.length === 0) {
    errors.objectives = 'At least one objective is required.'
    return errors
  }
  data.objectives.forEach((objective, index) => {
    if (objective.trim().length <= 10) {
      errors[`objectives[${index}]`] = 'Objective must be longer than 10 characters.'
    }
  })
  return errors
}

export function validateEndpoints(data: EndpointsData): Record<string, string> {
  const errors: Record<string, string> = {}
  const normalized = data.endpoints.map((endpoint) => endpoint.trim()).filter(Boolean)
  if (normalized.length === 0) {
    errors.endpoints = 'At least one endpoint is required.'
    return errors
  }
  data.endpoints.forEach((endpoint, index) => {
    if (endpoint.trim().length <= 10) {
      errors[`endpoints[${index}]`] = 'Endpoint must be longer than 10 characters.'
    }
  })
  return errors
}

export function validateEligibility(
  data: EligibilityData,
  dimensions: EligibilityDimension[],
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (data.inclusionCriteria.length + data.exclusionCriteria.length === 0) {
    errors.eligibilityCriteria =
      'At least one inclusion or exclusion criterion is required.'
    return errors
  }
  validateCriteriaGroup('inclusionCriteria', data.inclusionCriteria, dimensions, errors)
  validateCriteriaGroup('exclusionCriteria', data.exclusionCriteria, dimensions, errors)
  return errors
}

function validateCriteriaGroup(
  fieldKey: 'inclusionCriteria' | 'exclusionCriteria',
  criteria: EligibilityCriterion[],
  dimensions: EligibilityDimension[],
  errors: Record<string, string>,
) {
  criteria.forEach((criterion, index) => {
    if (!criterion.description.trim()) {
      errors[`${fieldKey}[${index}].description`] = 'Description is required.'
    }
    const rule = criterion.deterministicRule
    if (!rule.dimensionId.trim()) {
      errors[`${fieldKey}[${index}].deterministicRule.dimensionId`] = 'Dimension is required.'
    }
    if (!rule.operator) {
      errors[`${fieldKey}[${index}].deterministicRule.operator`] = 'Operator is required.'
    }
    if (!Number.isFinite(rule.value)) {
      errors[`${fieldKey}[${index}].deterministicRule.value`] = 'Value is required.'
    }
    const dimension = dimensions.find((d) => d.id === rule.dimensionId)
    if (dimension && dimension.allowedUnits.length > 0 && !rule.unit) {
      errors[`${fieldKey}[${index}].deterministicRule.unit`] = 'Unit is required for this dimension.'
    }
  })
}

export function validateSection(
  input: SectionData,
  dimensions: EligibilityDimension[],
): Record<string, string> {
  switch (input.section) {
    case 'study-information':
      return validateStudyInformation(input.data)
    case 'objectives':
      return validateObjectives(input.data)
    case 'endpoints':
      return validateEndpoints(input.data)
    case 'eligibility':
      return validateEligibility(input.data, dimensions)
  }
}

export function validateStudyForPublish(
  study: {
    studyInformation: StudyInformationData
    objectives: ObjectivesData
    endpoints: EndpointsData
    eligibility: EligibilityData
  },
  dimensions: EligibilityDimension[],
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {}
  const studyInfoErrors = validateStudyInformation(study.studyInformation)
  if (Object.keys(studyInfoErrors).length > 0) {
    result['study-information'] = studyInfoErrors
  }
  const objectivesErrors = validateObjectives(study.objectives)
  if (Object.keys(objectivesErrors).length > 0) {
    result.objectives = objectivesErrors
  }
  const endpointsErrors = validateEndpoints(study.endpoints)
  if (Object.keys(endpointsErrors).length > 0) {
    result.endpoints = endpointsErrors
  }
  const eligibilityErrors = validateEligibility(study.eligibility, dimensions)
  if (Object.keys(eligibilityErrors).length > 0) {
    result.eligibility = eligibilityErrors
  }
  return result
}

export function studyToStudyInformation(study: Study): StudyInformationData {
  return {
    phase: study.phase,
    therapeuticArea: study.therapeuticArea,
    patientPopulation: study.patientPopulation,
    studyType: study.studyType,
    participants: study.participants,
    numberOfArms: study.numberOfArms,
    firstPatientFirstVisit: study.firstPatientFirstVisit,
    lastPatientFirstVisit: study.lastPatientFirstVisit,
    protocolApprovalDate: study.protocolApprovalDate,
  }
}
