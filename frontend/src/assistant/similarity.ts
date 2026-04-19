import type { EligibilityCriterion, Study } from '../types'
import type { AssistantContext, CriterionGroup } from './types'

export interface SuggestedCriterion {
  sourceStudyId: string
  group: CriterionGroup
  criterionIndex: number
  criterion: EligibilityCriterion
}

type CurrentStudyFields = AssistantContext['currentStudy']

function equalsCaseInsensitive(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase() && a.trim() !== ''
}

function collectDimensionIds(study: {
  inclusionCriteria: EligibilityCriterion[]
  exclusionCriteria: EligibilityCriterion[]
}): Set<string> {
  const ids = new Set<string>()
  for (const criterion of study.inclusionCriteria) {
    if (criterion.deterministicRule.dimensionId) {
      ids.add(criterion.deterministicRule.dimensionId)
    }
  }
  for (const criterion of study.exclusionCriteria) {
    if (criterion.deterministicRule.dimensionId) {
      ids.add(criterion.deterministicRule.dimensionId)
    }
  }
  return ids
}

/**
 * Deterministic similarity score per the design document:
 * - +3 when `therapeuticArea` matches exactly (case-insensitive)
 * - +2 when `phase` matches exactly
 * - +1 when `studyType` matches exactly
 * - +1 for each eligibility `dimensionId` that appears in both studies' criteria
 */
export function similarityScore(current: CurrentStudyFields, other: Study): number {
  let score = 0

  if (equalsCaseInsensitive(current.therapeuticArea, other.therapeuticArea)) {
    score += 3
  }
  if (current.phase !== '' && current.phase === other.phase) {
    score += 2
  }
  if (current.studyType !== '' && current.studyType === other.studyType) {
    score += 1
  }

  const currentDimensions = collectDimensionIds(current)
  const otherDimensions = collectDimensionIds(other)
  for (const id of currentDimensions) {
    if (otherDimensions.has(id)) {
      score += 1
    }
  }

  return score
}

/**
 * Rank `others` by descending score, breaking ties by ascending lexicographic
 * `studyId` for reproducibility. The current study is excluded by `id`.
 */
export function rankStudies(current: CurrentStudyFields, others: Study[]): Study[] {
  const withoutCurrent =
    current.id === null
      ? others
      : others.filter((study) => study.id !== current.id)

  const scored = withoutCurrent.map((study) => ({
    study,
    score: similarityScore(current, study),
  }))

  scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    return a.study.id.localeCompare(b.study.id)
  })

  return scored.map((entry) => entry.study)
}

/**
 * Structural equality for two criteria: description (trim + lowercase) plus
 * full deterministic rule (dimensionId, operator, value, unit). Used both by
 * the copy-from-study menu filter and by the suggestion extraction to prevent
 * surfacing duplicates of criteria already in the current draft.
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
 * Walks ranked studies in order and collects up to `limit` criteria that are
 * not already present in the current draft. For each study the first
 * inclusion criterion is considered, then the first exclusion criterion, and
 * then the next inclusion/exclusion pairs if more are needed. The source
 * study identifier and the group (`inclusion` | `exclusion`) are preserved
 * on each suggestion.
 */
export function collectSuggestions(
  current: CurrentStudyFields,
  rankedOthers: Study[],
  limit = 3,
): SuggestedCriterion[] {
  const out: SuggestedCriterion[] = []

  for (const study of rankedOthers) {
    if (out.length >= limit) {
      break
    }

    const maxLen = Math.max(
      study.inclusionCriteria.length,
      study.exclusionCriteria.length,
    )
    for (let i = 0; i < maxLen && out.length < limit; i += 1) {
      const inclusion = study.inclusionCriteria[i]
      if (
        inclusion &&
        !hasCriterionInDraft(current, inclusion) &&
        !out.some((existing) => isSameCriterion(existing.criterion, inclusion))
      ) {
        out.push({
          sourceStudyId: study.id,
          group: 'inclusion',
          criterionIndex: i,
          criterion: inclusion,
        })
        if (out.length >= limit) {
          break
        }
      }

      const exclusion = study.exclusionCriteria[i]
      if (
        exclusion &&
        !hasCriterionInDraft(current, exclusion) &&
        !out.some((existing) => isSameCriterion(existing.criterion, exclusion))
      ) {
        out.push({
          sourceStudyId: study.id,
          group: 'exclusion',
          criterionIndex: i,
          criterion: exclusion,
        })
      }
    }
  }

  return out
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
