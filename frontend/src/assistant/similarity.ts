import type { EligibilityCriterion, Study, SuggestedCriterion } from '../types'
import type { AssistantContext } from './types'

type CurrentStudyFields = AssistantContext['currentStudy']

/**
 * Structural equality for two criteria: description (trim + lowercase) plus
 * full deterministic rule (dimensionId, operator, value, unit). Used by the
 * copy-from-study menu filter, the server-response duplicate guard, and the
 * suggest-relevant client pass for unpersisted accepts.
 */
export function isSameCriterion(a: EligibilityCriterion, b: EligibilityCriterion): boolean {
  const sameDescription =
    a.description.trim().toLowerCase() === b.description.trim().toLowerCase()
  const ruleA = a.deterministicRule
  const ruleB = b.deterministicRule
  const sameRule =
    ruleA.dimensionId === ruleB.dimensionId &&
    ruleA.operator === ruleB.operator &&
    ruleA.value === ruleB.value &&
    (ruleA.unit ?? '') === (ruleB.unit ?? '')
  return sameDescription && sameRule
}

/**
 * Drops suggestions whose criterion is already represented in the local draft
 * (including accepts not yet saved on the server).
 */
export function filterSuggestionsAgainstLocalDraft(
  current: CurrentStudyFields,
  suggestions: SuggestedCriterion[],
): SuggestedCriterion[] {
  return suggestions.filter((s) => !hasCriterionInDraft(current, s.criterion))
}

function hasCriterionInDraft(
  current: CurrentStudyFields,
  candidate: EligibilityCriterion,
): boolean {
  return (
    current.inclusionCriteria.some((existing) => isSameCriterion(existing, candidate)) ||
    current.exclusionCriteria.some((existing) => isSameCriterion(existing, candidate))
  )
}

/**
 * Returns a copy of `study`'s inclusion and exclusion lists with any criterion
 * already present in the current draft removed. Preserves the original index
 * so copy actions can round-trip back to the source study.
 */
export function filterCopyableCriteria(
  current: CurrentStudyFields,
  study: Study,
): {
  inclusion: Array<{ index: number; criterion: EligibilityCriterion }>
  exclusion: Array<{ index: number; criterion: EligibilityCriterion }>
} {
  return {
    inclusion: study.inclusionCriteria
      .map((criterion, index) => ({ index, criterion }))
      .filter(({ criterion }) => !hasCriterionInDraft(current, criterion)),
    exclusion: study.exclusionCriteria
      .map((criterion, index) => ({ index, criterion }))
      .filter(({ criterion }) => !hasCriterionInDraft(current, criterion)),
  }
}
