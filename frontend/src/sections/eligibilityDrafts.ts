import type { EligibilityCriterion, EligibilityDimension } from '../types'

type RuleOperator = EligibilityCriterion['deterministicRule']['operator']

export const RULE_OPERATORS: RuleOperator[] = ['>', '>=', '<', '<=', '=', '!=']

export type DraftOperator = RuleOperator | ''

export interface CriterionDraft {
  description: string
  dimensionId: string
  operator: DraftOperator
  value: string
  unit: string
}

export function createEmptyCriterionDraft(): CriterionDraft {
  return {
    description: '',
    dimensionId: '',
    operator: '',
    value: '',
    unit: '',
  }
}

export function criteriaToDrafts(
  criteria: EligibilityCriterion[],
): CriterionDraft[] {
  return criteria.map((criterion) => ({
    description: criterion.description,
    dimensionId: criterion.deterministicRule.dimensionId,
    operator: criterion.deterministicRule.operator,
    value: String(criterion.deterministicRule.value),
    unit: criterion.deterministicRule.unit ?? '',
  }))
}

export function draftsToCriteria(drafts: CriterionDraft[]): EligibilityCriterion[] {
  return drafts.map((draft) => ({
    description: draft.description.trim(),
    deterministicRule: {
      dimensionId: draft.dimensionId,
      operator: draft.operator as RuleOperator,
      value: draft.value.trim() === '' ? Number.NaN : Number(draft.value),
      unit: draft.unit || undefined,
    },
  }))
}

export function findDimension(dimensions: EligibilityDimension[], dimensionId: string) {
  return dimensions.find((dimension) => dimension.id === dimensionId)
}

export function formatDraftRule(criterion: CriterionDraft, dimensions: EligibilityDimension[]) {
  const dimension = findDimension(dimensions, criterion.dimensionId)
  const label = dimension?.displayName ?? criterion.dimensionId ?? 'dimension'
  const value = criterion.value || 'value'
  return `${label} ${criterion.operator} ${value}${criterion.unit ? ` ${criterion.unit}` : ''}`
}

export function formatRule(criterion: EligibilityCriterion, dimensions: EligibilityDimension[]) {
  const dimension = findDimension(dimensions, criterion.deterministicRule.dimensionId)
  const label = dimension?.displayName ?? criterion.deterministicRule.dimensionId
  return `${label} ${criterion.deterministicRule.operator} ${criterion.deterministicRule.value}${criterion.deterministicRule.unit ? ` ${criterion.deterministicRule.unit}` : ''}`
}

/**
 * Whether a draft row is complete enough to treat as a real criterion (e.g. for
 * the eligibility assistant duplicate filter). Mirrors the rule checks in
 * {@link validateEligibility} without requiring description text.
 */
export function isCriterionDraftComplete(
  draft: CriterionDraft,
  dimensions: EligibilityDimension[],
): boolean {
  if (!draft.dimensionId.trim() || !draft.operator) {
    return false
  }
  const numeric =
    draft.value.trim() === '' ? Number.NaN : Number(draft.value)
  if (!Number.isFinite(numeric)) {
    return false
  }
  const dimension = findDimension(dimensions, draft.dimensionId)
  if (!dimension) {
    return false
  }
  const unitTrimmed = draft.unit.trim()
  const allowedUnits = dimension.allowedUnits ?? []
  if (allowedUnits.length === 0 && unitTrimmed !== '') {
    return false
  }
  if (allowedUnits.length > 0 && unitTrimmed === '') {
    return false
  }
  return true
}

/** Maps only structurally complete draft rows to API-shaped criteria. */
export function completeDraftsToCriteria(
  drafts: CriterionDraft[],
  dimensions: EligibilityDimension[],
): EligibilityCriterion[] {
  return drafts
    .filter((draft) => isCriterionDraftComplete(draft, dimensions))
    .map((draft) => ({
      description: draft.description.trim(),
      deterministicRule: {
        dimensionId: draft.dimensionId,
        operator: draft.operator as RuleOperator,
        value: Number(draft.value.trim()),
        unit: draft.unit.trim() || undefined,
      },
    }))
}
