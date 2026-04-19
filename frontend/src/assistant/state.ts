import type { EligibilityCriterion, Study } from '../types'
import {
  collectSuggestions,
  filterCopyableCriteria,
  rankStudies,
} from './similarity'
import type { SuggestedCriterion } from './similarity'
import { ELIGIBILITY_SKILLS } from './skills'
import type {
  AssistantAction,
  AssistantContext,
  AssistantPrompt,
  AssistantTurn,
  CriterionGroup,
  MenuOption,
  SkillDefinition,
} from './types'

export interface AssistantState {
  thread: AssistantTurn[]
  prompt: AssistantPrompt
  loadError: string | null
}

export type ReducerAction =
  | { type: 'SELECT_OPTION'; optionId: string; context: AssistantContext }
  | { type: 'CLEAR_CHAT'; skills: SkillDefinition[] }
  | { type: 'SET_LOAD_ERROR'; message: string }
  | { type: 'CLEAR_LOAD_ERROR' }

let sequentialId = 0
function nextId(prefix: string): string {
  sequentialId += 1
  return `${prefix}-${sequentialId}`
}

const INTRO_TEXT_1 = 'Welcome to StudyHub assistant!'
const INTRO_TEXT_2 = 'I can help you draft eligibility criteria faster.'
const INTRO_TEXT_3 =
  'All picks land in the current draft. You still need to activate Save or Next to persist them.'

function buildRootMenu(skills: SkillDefinition[]): MenuOption[] {
  return skills.map((skill) => ({
    id: skill.id,
    label: skill.label,
    description: skill.description,
    action: skill.action,
  }))
}

function rootPrompt(skills: SkillDefinition[]): AssistantPrompt {
  return {
    id: nextId('prompt'),
    options: buildRootMenu(skills),
  }
}

export function createInitialState(skills: SkillDefinition[] = ELIGIBILITY_SKILLS): AssistantState {
  const prompt = rootPrompt(skills)
  return {
    thread: [
      { kind: 'bot-text', id: nextId('turn'), text: INTRO_TEXT_1 },
      { kind: 'bot-text', id: nextId('turn'), text: INTRO_TEXT_2 },
      { kind: 'bot-text', id: nextId('turn'), text: INTRO_TEXT_3 },
      {
        kind: 'bot-menu',
        id: nextId('turn'),
        text: 'What would you like to do?',
        options: prompt.options,
      },
    ],
    prompt,
    loadError: null,
  }
}

function disableMenusInThread(thread: AssistantTurn[]): AssistantTurn[] {
  return thread.map((turn) =>
    turn.kind === 'bot-menu'
      ? {
          ...turn,
          options: turn.options.map((option) =>
            option.disabled ? option : { ...option, disabled: true },
          ),
        }
      : turn,
  )
}

function appendUserTurn(thread: AssistantTurn[], label: string): AssistantTurn[] {
  return [...thread, { kind: 'user-choice', id: nextId('turn'), label }]
}

function appendBotTurns(
  thread: AssistantTurn[],
  turns: AssistantTurn[],
  nextPromptOptions: MenuOption[],
  promptText?: string,
): { thread: AssistantTurn[]; prompt: AssistantPrompt } {
  const prompt: AssistantPrompt = { id: nextId('prompt'), options: nextPromptOptions }
  const menuTurn: AssistantTurn = {
    kind: 'bot-menu',
    id: nextId('turn'),
    text: promptText,
    options: prompt.options,
  }
  return {
    thread: [...thread, ...turns, menuTurn],
    prompt,
  }
}

const BACK_TO_MAIN_OPTION = (): MenuOption => ({
  id: 'back-to-main',
  label: 'Back to main menu',
  action: { type: 'BACK_TO_MAIN' },
})

function studyLabel(study: Study): string {
  const parts: string[] = []
  if (study.therapeuticArea) {
    parts.push(study.therapeuticArea)
  }
  if (study.phase) {
    parts.push(study.phase)
  }
  return parts.length ? `${study.id} — ${parts.join(', ')}` : study.id
}

function criterionLabel(criterion: EligibilityCriterion, group: CriterionGroup): string {
  const prefix = group === 'inclusion' ? 'Inclusion' : 'Exclusion'
  const description = criterion.description.trim() || '(unnamed criterion)'
  return `${prefix}: ${description}`
}

function suggestionLabel(suggestion: SuggestedCriterion): string {
  const base = criterionLabel(suggestion.criterion, suggestion.group)
  return `${base} — from ${suggestion.sourceStudyId}`
}

function findOption(prompt: AssistantPrompt, optionId: string): MenuOption | undefined {
  return prompt.options.find((option) => option.id === optionId)
}

function resolveAction(
  state: AssistantState,
  context: AssistantContext,
  action: AssistantAction,
  selectedLabel: string,
): AssistantState {
  const threadWithDisabled = disableMenusInThread(state.thread)
  const threadWithUser = appendUserTurn(threadWithDisabled, selectedLabel)

  switch (action.type) {
    case 'NOOP':
      return state

    case 'BACK_TO_MAIN': {
      const rootOptions = buildRootMenu(ELIGIBILITY_SKILLS)
      const { thread, prompt } = appendBotTurns(
        threadWithUser,
        [{ kind: 'bot-text', id: nextId('turn'), text: 'Back to the main menu.' }],
        rootOptions,
        'What would you like to do?',
      )
      return { ...state, thread, prompt }
    }

    case 'START_COPY_FROM_STUDY':
      return startCopyFromStudy(state, context, threadWithUser)

    case 'START_SUGGEST_RELEVANT':
      return startSuggestRelevant(state, context, threadWithUser)

    case 'PICK_STUDY':
      return showCriteriaOfStudy(state, context, threadWithUser, action.studyId)

    case 'PICK_ANOTHER_STUDY':
      return showStudyPicker(state, context, threadWithUser)

    case 'COPY_CRITERION':
      return acknowledgeCopy(state, context, threadWithUser, action)

    case 'ACCEPT_SUGGESTION':
      return acknowledgeSuggestion(state, context, threadWithUser, action)

    case 'SUGGEST_THREE_MORE':
      return startSuggestRelevant(state, context, threadWithUser, {
        headerText: 'Here are three more suggestions:',
      })

    case 'RETRY_LOAD_OTHER_STUDIES': {
      const { thread, prompt } = appendBotTurns(
        threadWithUser,
        [
          {
            kind: 'bot-text',
            id: nextId('turn'),
            text: 'Reloading the list of registered studies…',
          },
        ],
        [BACK_TO_MAIN_OPTION()],
      )
      return { ...state, thread, prompt }
    }

    default:
      return state
  }
}

function startCopyFromStudy(
  state: AssistantState,
  context: AssistantContext,
  threadWithUser: AssistantTurn[],
): AssistantState {
  if (state.loadError) {
    const { thread, prompt } = appendBotTurns(
      threadWithUser,
      [
        {
          kind: 'bot-text',
          id: nextId('turn'),
          text: `I couldn't load the list of other studies: ${state.loadError}`,
        },
      ],
      [
        { id: 'retry', label: 'Retry', action: { type: 'RETRY_LOAD_OTHER_STUDIES' } },
        BACK_TO_MAIN_OPTION(),
      ],
    )
    return { ...state, thread, prompt }
  }
  return showStudyPicker(state, context, threadWithUser)
}

function showStudyPicker(
  state: AssistantState,
  context: AssistantContext,
  threadWithUser: AssistantTurn[],
): AssistantState {
  const { otherStudies } = context
  if (otherStudies.length === 0) {
    const { thread, prompt } = appendBotTurns(
      threadWithUser,
      [
        {
          kind: 'bot-text',
          id: nextId('turn'),
          text: 'No other studies to compare with yet. Add more studies to this workspace and try again.',
        },
      ],
      [BACK_TO_MAIN_OPTION()],
    )
    return { ...state, thread, prompt }
  }

  const options: MenuOption[] = otherStudies.map((study) => ({
    id: `study:${study.id}`,
    label: studyLabel(study),
    action: { type: 'PICK_STUDY', studyId: study.id },
  }))
  options.push(BACK_TO_MAIN_OPTION())

  const { thread, prompt } = appendBotTurns(
    threadWithUser,
    [
      {
        kind: 'bot-text',
        id: nextId('turn'),
        text: 'Which study would you like to copy criteria from?',
      },
    ],
    options,
  )
  return { ...state, thread, prompt }
}

function showCriteriaOfStudy(
  state: AssistantState,
  context: AssistantContext,
  threadWithUser: AssistantTurn[],
  studyId: string,
): AssistantState {
  const study = context.otherStudies.find((candidate) => candidate.id === studyId)
  if (!study) {
    const { thread, prompt } = appendBotTurns(
      threadWithUser,
      [
        {
          kind: 'bot-text',
          id: nextId('turn'),
          text: `Study "${studyId}" is no longer available.`,
        },
      ],
      [
        {
          id: 'pick-another',
          label: 'Pick another study',
          action: { type: 'PICK_ANOTHER_STUDY' },
        },
        BACK_TO_MAIN_OPTION(),
      ],
    )
    return { ...state, thread, prompt }
  }

  const { inclusion, exclusion } = filterCopyableCriteria(context.currentStudy, study)
  const options: MenuOption[] = []
  for (const { index, criterion } of inclusion) {
    options.push({
      id: `criterion:${study.id}:inclusion:${index}`,
      label: criterionLabel(criterion, 'inclusion'),
      action: {
        type: 'COPY_CRITERION',
        studyId: study.id,
        group: 'inclusion',
        criterionIndex: index,
      },
    })
  }
  for (const { index, criterion } of exclusion) {
    options.push({
      id: `criterion:${study.id}:exclusion:${index}`,
      label: criterionLabel(criterion, 'exclusion'),
      action: {
        type: 'COPY_CRITERION',
        studyId: study.id,
        group: 'exclusion',
        criterionIndex: index,
      },
    })
  }
  options.push({
    id: 'pick-another',
    label: 'Pick another study',
    action: { type: 'PICK_ANOTHER_STUDY' },
  })
  options.push(BACK_TO_MAIN_OPTION())

  const introText =
    inclusion.length + exclusion.length === 0
      ? `${study.id} has no criteria that aren't already in your draft.`
      : `Here are criteria from ${study.id} you can add to your draft:`

  const { thread, prompt } = appendBotTurns(
    threadWithUser,
    [{ kind: 'bot-text', id: nextId('turn'), text: introText }],
    options,
  )
  return { ...state, thread, prompt }
}

function acknowledgeCopy(
  state: AssistantState,
  context: AssistantContext,
  threadWithUser: AssistantTurn[],
  action: Extract<AssistantAction, { type: 'COPY_CRITERION' }>,
): AssistantState {
  const study = context.otherStudies.find((candidate) => candidate.id === action.studyId)
  if (!study) {
    return showStudyPicker(state, context, threadWithUser)
  }
  const list =
    action.group === 'inclusion' ? study.inclusionCriteria : study.exclusionCriteria
  const criterion = list[action.criterionIndex]
  if (!criterion) {
    return showCriteriaOfStudy(state, context, threadWithUser, action.studyId)
  }

  const ackText = `Added "${criterion.description.trim() || '(unnamed criterion)'}" to your ${
    action.group === 'inclusion' ? 'inclusion' : 'exclusion'
  } criteria.`

  // Reuse the post-add picker with the same study so the user can add more.
  const threadWithAck: AssistantTurn[] = [
    ...threadWithUser,
    { kind: 'bot-text', id: nextId('turn'), text: ackText },
  ]

  // We need the *updated* context for duplicate filtering. Since the parent
  // mutates its own state via onAddCriterion (called from the dock), we
  // build an augmented context locally that simulates the added criterion
  // already being in the draft. The dock will re-render with the real
  // updated context shortly after, but our menu is already correct.
  const augmentedContext: AssistantContext = {
    ...context,
    currentStudy: {
      ...context.currentStudy,
      inclusionCriteria:
        action.group === 'inclusion'
          ? [...context.currentStudy.inclusionCriteria, criterion]
          : context.currentStudy.inclusionCriteria,
      exclusionCriteria:
        action.group === 'exclusion'
          ? [...context.currentStudy.exclusionCriteria, criterion]
          : context.currentStudy.exclusionCriteria,
    },
  }

  return showCriteriaOfStudy(state, augmentedContext, threadWithAck, action.studyId)
}

function startSuggestRelevant(
  state: AssistantState,
  context: AssistantContext,
  threadWithUser: AssistantTurn[],
  opts: { headerText?: string } = {},
): AssistantState {
  if (state.loadError) {
    const { thread, prompt } = appendBotTurns(
      threadWithUser,
      [
        {
          kind: 'bot-text',
          id: nextId('turn'),
          text: `I couldn't load the list of other studies: ${state.loadError}`,
        },
      ],
      [
        { id: 'retry', label: 'Retry', action: { type: 'RETRY_LOAD_OTHER_STUDIES' } },
        BACK_TO_MAIN_OPTION(),
      ],
    )
    return { ...state, thread, prompt }
  }

  if (context.otherStudies.length === 0) {
    const { thread, prompt } = appendBotTurns(
      threadWithUser,
      [
        {
          kind: 'bot-text',
          id: nextId('turn'),
          text: 'No other studies to compare with yet, so I have no suggestions to offer.',
        },
      ],
      [BACK_TO_MAIN_OPTION()],
    )
    return { ...state, thread, prompt }
  }

  const ranked = rankStudies(context.currentStudy, context.otherStudies)
  const suggestions = collectSuggestions(context.currentStudy, ranked, 3)

  if (suggestions.length === 0) {
    const { thread, prompt } = appendBotTurns(
      threadWithUser,
      [
        {
          kind: 'bot-text',
          id: nextId('turn'),
          text: 'No new suggestions — every candidate criterion is already in your draft.',
        },
      ],
      [BACK_TO_MAIN_OPTION()],
    )
    return { ...state, thread, prompt }
  }

  const options: MenuOption[] = suggestions.map((suggestion) => ({
    id: `suggest:${suggestion.sourceStudyId}:${suggestion.group}:${suggestion.criterionIndex}`,
    label: suggestionLabel(suggestion),
    action: {
      type: 'ACCEPT_SUGGESTION',
      studyId: suggestion.sourceStudyId,
      group: suggestion.group,
      criterionIndex: suggestion.criterionIndex,
    },
  }))
  options.push(BACK_TO_MAIN_OPTION())

  const headerText =
    opts.headerText ??
    (suggestions.length === 3
      ? 'Here are three suggestions I drew from the most similar studies:'
      : `I could only find ${suggestions.length} new suggestion${
          suggestions.length === 1 ? '' : 's'
        }:`)

  const { thread, prompt } = appendBotTurns(
    threadWithUser,
    [{ kind: 'bot-text', id: nextId('turn'), text: headerText }],
    options,
  )
  return { ...state, thread, prompt }
}

function acknowledgeSuggestion(
  state: AssistantState,
  context: AssistantContext,
  threadWithUser: AssistantTurn[],
  action: Extract<AssistantAction, { type: 'ACCEPT_SUGGESTION' }>,
): AssistantState {
  const study = context.otherStudies.find((candidate) => candidate.id === action.studyId)
  if (!study) {
    return startSuggestRelevant(state, context, threadWithUser)
  }
  const list =
    action.group === 'inclusion' ? study.inclusionCriteria : study.exclusionCriteria
  const criterion = list[action.criterionIndex]
  if (!criterion) {
    return startSuggestRelevant(state, context, threadWithUser)
  }

  const ackText = `Added "${criterion.description.trim() || '(unnamed criterion)'}" to your ${
    action.group === 'inclusion' ? 'inclusion' : 'exclusion'
  } criteria.`

  const { thread, prompt } = appendBotTurns(
    threadWithUser,
    [{ kind: 'bot-text', id: nextId('turn'), text: ackText }],
    [
      {
        id: 'suggest-three-more',
        label: 'Suggest three more',
        action: { type: 'SUGGEST_THREE_MORE' },
      },
      BACK_TO_MAIN_OPTION(),
    ],
    'What next?',
  )
  return { ...state, thread, prompt }
}

export function reducer(state: AssistantState, action: ReducerAction): AssistantState {
  switch (action.type) {
    case 'SELECT_OPTION': {
      const option = findOption(state.prompt, action.optionId)
      if (!option || option.disabled) {
        return state
      }
      return resolveAction(state, action.context, option.action, option.label)
    }
    case 'CLEAR_CHAT':
      return createInitialState(action.skills)
    case 'SET_LOAD_ERROR':
      return { ...state, loadError: action.message }
    case 'CLEAR_LOAD_ERROR':
      return { ...state, loadError: null }
    default:
      return state
  }
}
