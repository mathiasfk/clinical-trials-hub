import type {
  EligibilityCriterion,
  EligibilityDimension,
  Study,
} from '../types'

export type CriterionGroup = 'inclusion' | 'exclusion'

export interface AssistantContext {
  /**
   * Snapshot of the study the user is currently editing. For the new-study
   * wizard only a partial snapshot is available; absent fields are empty
   * strings.
   */
  currentStudy: {
    id: string | null
    therapeuticArea: string
    phase: string
    studyType: Study['studyType'] | ''
    inclusionCriteria: EligibilityCriterion[]
    exclusionCriteria: EligibilityCriterion[]
  }
  /** All other registered studies (the current study is already filtered out). */
  otherStudies: Study[]
  /** Dimensions shared by the section context for label rendering. */
  dimensions: EligibilityDimension[]
}

export type OnAddCriterionCallback = (
  group: CriterionGroup,
  criterion: EligibilityCriterion,
) => void

export interface MenuOption {
  id: string
  label: string
  /**
   * Optional helper rendered under the label. Used for the intro information
   * row and for study-level badges.
   */
  description?: string
  /**
   * Once a newer menu supersedes this one, older menu options render as
   * disabled so the thread still reads as a chronological log.
   */
  disabled?: boolean
  /** Opaque action consumed by the state reducer. */
  action: AssistantAction
}

export interface AssistantPrompt {
  id: string
  options: MenuOption[]
}

export type AssistantTurn =
  | { kind: 'bot-text'; id: string; text: string }
  | { kind: 'bot-menu'; id: string; text?: string; options: MenuOption[] }
  | { kind: 'user-choice'; id: string; label: string }

export interface SkillDefinition {
  id: string
  label: string
  /** Optional helper description rendered under the menu button. */
  description?: string
  /** The first action dispatched when the skill is selected from the root menu. */
  action: AssistantAction
}

export type AssistantAction =
  /** Root-level menu actions */
  | { type: 'START_COPY_FROM_STUDY' }
  | { type: 'START_SUGGEST_RELEVANT' }
  /** Copy-from-study navigation */
  | { type: 'PICK_STUDY'; studyId: string }
  | {
      type: 'COPY_CRITERION'
      studyId: string
      group: CriterionGroup
      criterionIndex: number
    }
  | { type: 'PICK_ANOTHER_STUDY' }
  /** Suggest-relevant navigation */
  | {
      type: 'ACCEPT_SUGGESTION'
      studyId: string
      group: CriterionGroup
      criterionIndex: number
      criterion: EligibilityCriterion
    }
  | { type: 'SUGGEST_THREE_MORE' }
  /** Common / error navigation */
  | { type: 'BACK_TO_MAIN' }
  | { type: 'RETRY_LOAD_OTHER_STUDIES' }
  | { type: 'RETRY_SUGGEST_RELEVANT' }
  /** No-op used for older, superseded menus (rendered disabled). */
  | { type: 'NOOP' }
