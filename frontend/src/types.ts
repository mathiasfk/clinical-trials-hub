export type StudyType = 'parallel' | 'crossover' | 'single-arm'

export interface DeterministicRule {
  dimensionId: string
  operator: '>' | '>=' | '<' | '<=' | '=' | '!='
  value: number
  unit?: string
}

export interface EligibilityCriterion {
  description: string
  deterministicRule: DeterministicRule
}

export interface EligibilityDimension {
  id: string
  displayName: string
  description: string
  allowedUnits: string[]
}

export interface Study {
  id: string
  objectives: string[]
  endpoints: string[]
  inclusionCriteria: EligibilityCriterion[]
  exclusionCriteria: EligibilityCriterion[]
  participants: number
  studyType: StudyType
  numberOfArms: number
  phase: string
  therapeuticArea: string
  patientPopulation: string
}

export interface StudyCreateInput {
  objectives: string[]
  endpoints: string[]
  inclusionCriteria: EligibilityCriterion[]
  exclusionCriteria: EligibilityCriterion[]
  participants: number
  studyType: StudyType
  numberOfArms: number
  phase: string
  therapeuticArea: string
  patientPopulation: string
}

export interface StudyEligibilityInput {
  inclusionCriteria: EligibilityCriterion[]
  exclusionCriteria: EligibilityCriterion[]
}

export interface ApiErrorResponse {
  message: string
  errors?: Record<string, string>
}
