export const SECTION_ORDER = [
  'study-information',
  'objectives',
  'endpoints',
  'eligibility',
  'summary',
] as const

export type SectionSlug = (typeof SECTION_ORDER)[number]

export const SECTION_LABELS: Record<SectionSlug, string> = {
  'study-information': 'Study information',
  objectives: 'Objectives',
  endpoints: 'Endpoints',
  eligibility: 'Eligibility criteria',
  summary: 'Summary',
}

export const EDIT_SECTION_ORDER: SectionSlug[] = [
  'summary',
  'study-information',
  'objectives',
  'endpoints',
  'eligibility',
]

export function nextSection(current: SectionSlug): SectionSlug | null {
  const index = SECTION_ORDER.indexOf(current)
  if (index === -1 || index === SECTION_ORDER.length - 1) {
    return null
  }
  return SECTION_ORDER[index + 1]
}

export function isSectionSlug(value: unknown): value is SectionSlug {
  return typeof value === 'string' && (SECTION_ORDER as readonly string[]).includes(value)
}

export const PHASE_OPTIONS = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'] as const

export type PhaseOption = (typeof PHASE_OPTIONS)[number]

export const THERAPEUTIC_AREA_OPTIONS = [
  'Cardiovascular',
  'Diabetes',
  'Hematology',
  'Sickle Cell Disease',
  'Obesity',
  'Rare Diseases',
  'Oncology',
  'Neurology',
] as const

export type TherapeuticAreaOption = (typeof THERAPEUTIC_AREA_OPTIONS)[number]

export function isPhaseOption(value: unknown): value is PhaseOption {
  return typeof value === 'string' && (PHASE_OPTIONS as readonly string[]).includes(value)
}

export function isTherapeuticAreaOption(value: unknown): value is TherapeuticAreaOption {
  return (
    typeof value === 'string' &&
    (THERAPEUTIC_AREA_OPTIONS as readonly string[]).includes(value)
  )
}
