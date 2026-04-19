export type StudyType = 'parallel' | 'crossover' | 'single-arm'

export interface Study {
  id: string
  objectives: string[]
  endpoints: string[]
  inclusionCriteria: string[]
  exclusionCriteria: string[]
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
  inclusionCriteria: string[]
  exclusionCriteria: string[]
  participants: number
  studyType: StudyType
  numberOfArms: number
  phase: string
  therapeuticArea: string
  patientPopulation: string
}

export interface ApiErrorResponse {
  message: string
  errors?: Record<string, string>
}
