import type { EligibilityCriterion, EligibilityDimension } from '../types'

type RuleOperator = EligibilityCriterion['deterministicRule']['operator']

export const RULE_OPERATORS: RuleOperator[] = ['>', '>=', '<', '<=', '=', '!=']

export interface CriterionDraft {
  description: string
  dimensionId: string
  operator: RuleOperator
  value: string
  unit: string
}

export function createEmptyCriterionDraft(
  dimensions: EligibilityDimension[],
): CriterionDraft {
  const defaultDimension = dimensions[0]
  return {
    description: '',
    dimensionId: defaultDimension?.id ?? '',
    operator: '>',
    value: '',
    unit: defaultDimension?.allowedUnits[0] ?? '',
  }
}

export function criteriaToDrafts(
  criteria: EligibilityCriterion[],
  dimensions: EligibilityDimension[],
): CriterionDraft[] {
  if (criteria.length === 0) {
    return dimensions.length > 0 ? [createEmptyCriterionDraft(dimensions)] : []
  }
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
      operator: draft.operator,
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

export function extractErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }
  return fallback
}
