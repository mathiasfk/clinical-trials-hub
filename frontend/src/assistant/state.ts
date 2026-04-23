import type { EligibilityCriterion, SuggestedCriterion } from '../types'
import { filterCopyableCriteria } from './similarity'
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
  /** When true, the dock enables the footer text field for reference study id entry. */
  awaitingReferenceStudyId: boolean
}

export type ReducerAction =
  | { type: 'SELECT_OPTION'; optionId: string; context: AssistantContext }
  | { type: 'CLEAR_CHAT'; skills: SkillDefinition[] }
  | { type: 'SET_LOAD_ERROR'; message: string }
  | { type: 'CLEAR_LOAD_ERROR' }
  | {
      type: 'REFERENCE_STUDY_RESOLVED'
      context: AssistantContext
      studyId: string
      userLabel: string
    }
  | { type: 'REFERENCE_STUDY_LOOKUP_FAILED'; userLabel: string; message: string }
  | { type: 'SUGGEST_RELEVANT_STARTED'; userLabel: string; mode: 'initial' | 'more' }
  | {
      type: 'SUGGEST_RELEVANT_RESOLVED'
      suggestions: SuggestedCriterion[]
      mode: 'initial' | 'more'
    }
  | { type: 'SUGGEST_RELEVANT_FAILED'; message: string; appendUserLabel?: string }

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
    awaitingReferenceStudyId: false,
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

const SUGGEST_LOADING_TEXT = 'Fetching suggestions from similar studies…'

function removeTrailingSuggestLoading(thread: AssistantTurn[]): AssistantTurn[] {
  const last = thread[thread.length - 1]
  const prev = thread[thread.length - 2]
  if (
    last?.kind === 'bot-menu' &&
    last.options.length === 1 &&
    last.options[0]?.id === 'suggest-loading' &&
    prev?.kind === 'bot-text' &&
    prev.text === SUGGEST_LOADING_TEXT
  ) {
    return thread.slice(0, -2)
  }

  return thread
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
      return { ...state, thread, prompt, awaitingReferenceStudyId: false }
    }

    case 'START_COPY_FROM_STUDY':
      return startCopyFromStudy(state, context, threadWithUser)

    case 'PICK_STUDY':
      return showCriteriaOfStudy(state, context, threadWithUser, action.studyId)

    case 'PICK_ANOTHER_STUDY':
      return showReferenceStudyIdPrompt(state, threadWithUser)

    case 'COPY_CRITERION':
      return acknowledgeCopy(state, context, threadWithUser, action)

    case 'ACCEPT_SUGGESTION':
      return acknowledgeSuggestion(state, context, threadWithUser, action)

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
      return { ...state, thread, prompt, awaitingReferenceStudyId: false }
    }

    default:
      return state
  }
}

function showReferenceStudyIdPrompt(
  state: AssistantState,
  threadWithUser: AssistantTurn[],
  opts?: {
    preamble?: string[]
    leadingMenuOptions?: MenuOption[]
  },
): AssistantState {
  const lines =
    opts?.preamble ?? [
      'Which study should we copy criteria from? Type its study id in the box below (for example study-0002) and press Enter.',
    ]
  const texts: AssistantTurn[] = lines.map((text) => ({
    kind: 'bot-text' as const,
    id: nextId('turn'),
    text,
  }))
  const options: MenuOption[] = [...(opts?.leadingMenuOptions ?? []), BACK_TO_MAIN_OPTION()]
  const { thread, prompt } = appendBotTurns(threadWithUser, texts, options)
  return { ...state, thread, prompt, awaitingReferenceStudyId: true }
}

function startCopyFromStudy(
  state: AssistantState,
  _context: AssistantContext,
  threadWithUser: AssistantTurn[],
): AssistantState {
  if (state.loadError) {
    return showReferenceStudyIdPrompt(state, threadWithUser, {
      preamble: [
        `I couldn't load the list of other studies: ${state.loadError}`,
        'You can still enter another study’s id in the box below and press Enter, or use Retry.',
      ],
      leadingMenuOptions: [
        { id: 'retry', label: 'Retry', action: { type: 'RETRY_LOAD_OTHER_STUDIES' } },
      ],
    })
  }
  return showReferenceStudyIdPrompt(state, threadWithUser)
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
    return { ...state, thread, prompt, awaitingReferenceStudyId: false }
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
  return { ...state, thread, prompt, awaitingReferenceStudyId: false }
}

function acknowledgeCopy(
  state: AssistantState,
  context: AssistantContext,
  threadWithUser: AssistantTurn[],
  action: Extract<AssistantAction, { type: 'COPY_CRITERION' }>,
): AssistantState {
  const study = context.otherStudies.find((candidate) => candidate.id === action.studyId)
  if (!study) {
    return showReferenceStudyIdPrompt(state, threadWithUser)
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

function acknowledgeSuggestion(
  state: AssistantState,
  context: AssistantContext,
  threadWithUser: AssistantTurn[],
  action: Extract<AssistantAction, { type: 'ACCEPT_SUGGESTION' }>,
): AssistantState {
  const criterion = action.criterion

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
  return { ...state, thread, prompt, awaitingReferenceStudyId: false }
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
    case 'REFERENCE_STUDY_RESOLVED': {
      const threadWithDisabled = disableMenusInThread(state.thread)
      const threadWithUser = appendUserTurn(threadWithDisabled, action.userLabel)
      return showCriteriaOfStudy(state, action.context, threadWithUser, action.studyId)
    }
    case 'REFERENCE_STUDY_LOOKUP_FAILED': {
      const threadWithDisabled = disableMenusInThread(state.thread)
      const threadWithUser = appendUserTurn(threadWithDisabled, action.userLabel)
      const { thread, prompt } = appendBotTurns(
        threadWithUser,
        [{ kind: 'bot-text', id: nextId('turn'), text: action.message }],
        [BACK_TO_MAIN_OPTION()],
      )
      return { ...state, thread, prompt, awaitingReferenceStudyId: true }
    }
    case 'CLEAR_CHAT':
      return createInitialState(action.skills)
    case 'SET_LOAD_ERROR':
      return { ...state, loadError: action.message }
    case 'CLEAR_LOAD_ERROR':
      return { ...state, loadError: null }
    case 'SUGGEST_RELEVANT_STARTED': {
      const threadWithDisabled = disableMenusInThread(state.thread)
      const threadWithUser = appendUserTurn(threadWithDisabled, action.userLabel)
      const loadingText: AssistantTurn = {
        kind: 'bot-text',
        id: nextId('turn'),
        text: SUGGEST_LOADING_TEXT,
      }
      const prompt: AssistantPrompt = {
        id: nextId('prompt'),
        options: [
          {
            id: 'suggest-loading',
            label: 'Loading suggestions…',
            disabled: true,
            action: { type: 'NOOP' },
          },
        ],
      }
      const menuTurn: AssistantTurn = {
        kind: 'bot-menu',
        id: nextId('turn'),
        options: prompt.options,
      }
      return {
        ...state,
        thread: [...threadWithUser, loadingText, menuTurn],
        prompt,
        awaitingReferenceStudyId: false,
      }
    }
    case 'SUGGEST_RELEVANT_RESOLVED': {
      const baseThread = removeTrailingSuggestLoading(disableMenusInThread(state.thread))
      const { suggestions, mode } = action

      if (suggestions.length === 0) {
        const { thread, prompt } = appendBotTurns(
          baseThread,
          [
            {
              kind: 'bot-text',
              id: nextId('turn'),
              text: 'No suggestions are available right now — every candidate criterion is already in your draft or the corpus has no new ideas.',
            },
          ],
          [BACK_TO_MAIN_OPTION()],
        )
        return { ...state, thread, prompt, awaitingReferenceStudyId: false }
      }

      const options: MenuOption[] = suggestions.map((suggestion) => ({
        id: `suggest:${suggestion.sourceStudyId}:${suggestion.group}:${suggestion.criterionIndex}`,
        label: suggestionLabel(suggestion),
        action: {
          type: 'ACCEPT_SUGGESTION',
          studyId: suggestion.sourceStudyId,
          group: suggestion.group,
          criterionIndex: suggestion.criterionIndex,
          criterion: suggestion.criterion,
        },
      }))
      options.push(BACK_TO_MAIN_OPTION())

      const headerText =
        mode === 'more'
          ? 'Here are three more suggestions:'
          : suggestions.length === 3
            ? 'Here are three suggestions I drew from the most similar studies:'
            : `I could only find ${suggestions.length} new suggestion${
                suggestions.length === 1 ? '' : 's'
              }:`

      const { thread, prompt } = appendBotTurns(
        baseThread,
        [{ kind: 'bot-text', id: nextId('turn'), text: headerText }],
        options,
      )
      return { ...state, thread, prompt, awaitingReferenceStudyId: false }
    }
    case 'SUGGEST_RELEVANT_FAILED': {
      let baseThread = state.thread
      if (action.appendUserLabel) {
        baseThread = appendUserTurn(disableMenusInThread(baseThread), action.appendUserLabel)
      } else {
        baseThread = removeTrailingSuggestLoading(disableMenusInThread(baseThread))
      }

      const { thread, prompt } = appendBotTurns(
        baseThread,
        [{ kind: 'bot-text', id: nextId('turn'), text: action.message }],
        [
          {
            id: 'retry-suggest',
            label: 'Retry',
            action: { type: 'RETRY_SUGGEST_RELEVANT' },
          },
          BACK_TO_MAIN_OPTION(),
        ],
      )
      return { ...state, thread, prompt, awaitingReferenceStudyId: false }
    }
    default:
      return state
  }
}
