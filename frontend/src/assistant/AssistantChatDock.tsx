import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import type { KeyboardEvent } from 'react'

import './assistant.css'
import { getSimilarSuggestions, getStudyById } from '../api'
import type { ApiErrorResponse } from '../types'
import { extractReferenceStudyId } from './referenceStudyId'
import { ELIGIBILITY_SKILLS } from './skills'
import { filterSuggestionsAgainstLocalDraft } from './similarity'
import { createInitialState, reducer } from './state'
import type {
  AssistantAction,
  AssistantContext,
  AssistantTurn,
  CriterionGroup,
  MenuOption,
  OnAddCriterionCallback,
  SkillDefinition,
} from './types'
import type { EligibilityCriterion, Study } from '../types'

interface AssistantChatDockProps {
  skills?: SkillDefinition[]
  context: AssistantContext
  onAddCriterion: OnAddCriterionCallback
}

const DRAWER_TITLE_ID = 'assistant-drawer-title'

export function AssistantChatDock({
  skills = ELIGIBILITY_SKILLS,
  context,
  onAddCriterion,
}: AssistantChatDockProps) {
  const [isOpen, setIsOpen] = useState(false)

  const changeOpen = useCallback(
    (next: boolean) => {
      setIsOpen(next)
      if (!next) {
        setLookupStudies([])
        setFooterValue('')
      }
    },
    [],
  )
  const [state, dispatch] = useReducer(reducer, skills, createInitialState)
  /** Studies fetched by id for copy-from-study; merged into `effectiveContext` for criterion picks. */
  const [lookupStudies, setLookupStudies] = useState<Study[]>([])
  const [footerValue, setFooterValue] = useState('')
  const referenceSubmitBusyRef = useRef(false)
  const suggestFlowBusyRef = useRef(false)
  const lastSuggestModeRef = useRef<'initial' | 'more'>('initial')
  const effectiveContextRef = useRef(context)
  const threadBottomRef = useRef<HTMLDivElement | null>(null)
  const firstMenuButtonRef = useRef<HTMLButtonElement | null>(null)
  const footerInputRef = useRef<HTMLInputElement | null>(null)

  const effectiveContext = useMemo((): AssistantContext => {
    if (lookupStudies.length === 0) {
      return context
    }
    const seen = new Set(context.otherStudies.map((s) => s.id))
    const extra = lookupStudies.filter((s) => !seen.has(s.id))
    if (extra.length === 0) {
      return context
    }
    return { ...context, otherStudies: [...context.otherStudies, ...extra] }
  }, [context, lookupStudies])

  effectiveContextRef.current = effectiveContext

  useEffect(() => {
    if (!isOpen) {
      return
    }
    const node = threadBottomRef.current
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'end' })
    }
  }, [isOpen, state.thread])

  useEffect(() => {
    if (!isOpen) {
      return
    }
    const frame = window.requestAnimationFrame(() => {
      if (state.awaitingReferenceStudyId) {
        footerInputRef.current?.focus()
      } else {
        firstMenuButtonRef.current?.focus()
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [isOpen, state.prompt.id, state.awaitingReferenceStudyId])

  const runSuggestRelevantRequest = useCallback(
    async (opts: { userLabel: string; mode: 'initial' | 'more' }) => {
      const ctx = effectiveContextRef.current
      const studyId = ctx.currentStudy.id
      if (!studyId) {
        dispatch({
          type: 'SUGGEST_RELEVANT_FAILED',
          message:
            'This study does not have an id on the server yet. Finish creating the study (or save your draft) before asking for similar suggestions.',
          appendUserLabel: opts.userLabel,
        })
        return
      }

      if (suggestFlowBusyRef.current) {
        return
      }

      suggestFlowBusyRef.current = true
      lastSuggestModeRef.current = opts.mode
      dispatch({
        type: 'SUGGEST_RELEVANT_STARTED',
        userLabel: opts.userLabel,
        mode: opts.mode,
      })

      try {
        const raw = await getSimilarSuggestions(studyId, { limit: 3 })
        const filtered = filterSuggestionsAgainstLocalDraft(ctx.currentStudy, raw)
        dispatch({
          type: 'SUGGEST_RELEVANT_RESOLVED',
          suggestions: filtered,
          mode: opts.mode,
        })
      } catch (caught) {
        const api = caught as ApiErrorResponse
        const message =
          typeof api?.message === 'string' && api.message
            ? api.message
            : 'Could not load suggestions. Check your connection and try again.'
        dispatch({ type: 'SUGGEST_RELEVANT_FAILED', message })
      } finally {
        suggestFlowBusyRef.current = false
      }
    },
    [dispatch],
  )

  const handleSelectOption = useCallback(
    (option: MenuOption) => {
      if (
        option.action.type === 'START_SUGGEST_RELEVANT' ||
        option.action.type === 'SUGGEST_THREE_MORE' ||
        option.action.type === 'RETRY_SUGGEST_RELEVANT'
      ) {
        const mode =
          option.action.type === 'SUGGEST_THREE_MORE'
            ? 'more'
            : option.action.type === 'RETRY_SUGGEST_RELEVANT'
              ? lastSuggestModeRef.current
              : 'initial'
        void runSuggestRelevantRequest({ userLabel: option.label, mode })
        return
      }

      // Side-effect: when the option represents adding a criterion to the
      // host's draft, notify the host BEFORE the reducer runs so the next
      // render of `context` reflects the addition. The reducer also runs its
      // local augmentation so the menu renders correctly this tick.
      runHostSideEffect(option.action, effectiveContext, onAddCriterion)
      dispatch({ type: 'SELECT_OPTION', optionId: option.id, context: effectiveContext })
    },
    [effectiveContext, onAddCriterion, runSuggestRelevantRequest],
  )

  const submitReferenceStudyId = useCallback(async () => {
    if (!state.awaitingReferenceStudyId || referenceSubmitBusyRef.current) {
      return
    }
    const raw = footerValue.trim()
    if (!raw) {
      return
    }

    const extracted = extractReferenceStudyId(raw)
    if (!extracted) {
      dispatch({
        type: 'REFERENCE_STUDY_LOOKUP_FAILED',
        userLabel: raw,
        message:
          'I couldn’t read a study id from that. Try something like study-0002 (letters “study”, a number).',
      })
      return
    }

    if (context.currentStudy.id !== null && extracted === context.currentStudy.id) {
      dispatch({
        type: 'REFERENCE_STUDY_LOOKUP_FAILED',
        userLabel: raw,
        message: 'You can’t copy criteria from the study you’re editing.',
      })
      return
    }

    const fromMerged = effectiveContext.otherStudies.find((s) => s.id === extracted)
    if (fromMerged) {
      setFooterValue('')
      dispatch({
        type: 'REFERENCE_STUDY_RESOLVED',
        context: effectiveContext,
        studyId: extracted,
        userLabel: extracted,
      })
      return
    }

    referenceSubmitBusyRef.current = true
    try {
      const study = await getStudyById(extracted)
      if (context.currentStudy.id !== null && study.id === context.currentStudy.id) {
        dispatch({
          type: 'REFERENCE_STUDY_LOOKUP_FAILED',
          userLabel: raw,
          message: 'You can’t copy criteria from the study you’re editing.',
        })
        return
      }
      setLookupStudies((prev) => (prev.some((s) => s.id === study.id) ? prev : [...prev, study]))
      const merged: AssistantContext = context.otherStudies.some((s) => s.id === study.id)
        ? effectiveContext
        : { ...context, otherStudies: [...context.otherStudies, study] }
      setFooterValue('')
      dispatch({
        type: 'REFERENCE_STUDY_RESOLVED',
        context: merged,
        studyId: extracted,
        userLabel: extracted,
      })
    } catch (caught) {
      const api = caught as ApiErrorResponse
      const message =
        typeof api?.message === 'string' && api.message
          ? api.message
          : 'That study could not be loaded. Check the id and try again.'
      dispatch({
        type: 'REFERENCE_STUDY_LOOKUP_FAILED',
        userLabel: raw,
        message,
      })
    } finally {
      referenceSubmitBusyRef.current = false
    }
  }, [
    context.currentStudy.id,
    context.otherStudies,
    effectiveContext,
    footerValue,
    state.awaitingReferenceStudyId,
  ])

  const handleFooterKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') {
        return
      }
      event.preventDefault()
      void submitReferenceStudyId()
    },
    [submitReferenceStudyId],
  )

  const handleClearChat = useCallback(() => {
    setLookupStudies([])
    setFooterValue('')
    dispatch({ type: 'CLEAR_CHAT', skills })
  }, [skills])

  const activePromptId = state.prompt.id

  return (
    <>
      <button
        type="button"
        className="assistant-fab"
        aria-label="Open StudyHub assistant"
        aria-expanded={isOpen}
        onClick={() => changeOpen(!isOpen)}
      >
        {isOpen ? (
          <span aria-hidden="true">×</span>
        ) : (
          <svg
            aria-hidden="true"
            focusable="false"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
        )}
      </button>

      {isOpen ? (
        <aside
          className="assistant-drawer"
          role="complementary"
          aria-labelledby={DRAWER_TITLE_ID}
        >
          <header className="assistant-drawer-header">
            <h2 id={DRAWER_TITLE_ID} className="assistant-drawer-title">
              StudyHub assistant
            </h2>
            <div className="assistant-drawer-actions">
              <button type="button" onClick={handleClearChat}>
                Clear chat
              </button>
              <button
                type="button"
                aria-label="Close StudyHub assistant"
                onClick={() => changeOpen(false)}
              >
                ×
              </button>
            </div>
          </header>

          <div className="assistant-thread" aria-live="polite">
            {state.thread.map((turn) => (
              <ThreadTurn
                key={turn.id}
                turn={turn}
                isActivePrompt={
                  turn.kind === 'bot-menu' && turn.options === state.prompt.options
                }
                onSelectOption={handleSelectOption}
                firstMenuButtonRef={firstMenuButtonRef}
                activePromptId={activePromptId}
              />
            ))}
            <div ref={threadBottomRef} />
          </div>

          <div className="assistant-footer">
            <span aria-hidden="true" className="assistant-footer-clip">
              📎
            </span>
            <input
              ref={footerInputRef}
              type="text"
              value={footerValue}
              onChange={(e) => setFooterValue(e.target.value)}
              onKeyDown={handleFooterKeyDown}
              placeholder={
                state.awaitingReferenceStudyId
                  ? 'Study id (e.g. study-0002) — Enter'
                  : 'Ask anything… (not available in MVP)'
              }
              aria-label={
                state.awaitingReferenceStudyId
                  ? 'Reference study id'
                  : 'Ask anything (disabled)'
              }
              disabled={!state.awaitingReferenceStudyId}
            />
          </div>
        </aside>
      ) : null}
    </>
  )
}

function ThreadTurn({
  turn,
  isActivePrompt,
  onSelectOption,
  firstMenuButtonRef,
  activePromptId,
}: {
  turn: AssistantTurn
  isActivePrompt: boolean
  onSelectOption: (option: MenuOption) => void
  firstMenuButtonRef: React.MutableRefObject<HTMLButtonElement | null>
  activePromptId: string
}) {
  if (turn.kind === 'user-choice') {
    return (
      <div className="assistant-turn user">
        <div className="assistant-bubble">{turn.label}</div>
      </div>
    )
  }

  if (turn.kind === 'bot-text') {
    return (
      <div className="assistant-turn bot">
        <div className="assistant-bubble">{turn.text}</div>
      </div>
    )
  }

  return (
    <div className="assistant-turn bot">
      <div className="assistant-bubble">
        {turn.text ? <p>{turn.text}</p> : null}
        <div className="assistant-menu" role="group" aria-label="Assistant options">
          {turn.options.map((option, index) => {
            const isDisabled = option.disabled || !isActivePrompt
            const buttonRef =
              isActivePrompt && index === 0 ? firstMenuButtonRef : undefined
            return (
              <button
                key={`${activePromptId}-${option.id}-${index}`}
                type="button"
                ref={buttonRef}
                disabled={isDisabled}
                onClick={() => onSelectOption(option)}
              >
                <span>{option.label}</span>
                {option.description ? (
                  <span className="assistant-menu-description">{option.description}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Side-effect bridge: when a menu option represents copying or accepting a
 * criterion, forward the resolved `EligibilityCriterion` to the host via
 * `onAddCriterion(group, criterion)`. Pure-UI actions (navigation, back,
 * retry) are no-ops here and handled entirely by the reducer.
 */
function runHostSideEffect(
  action: AssistantAction,
  context: AssistantContext,
  onAddCriterion: OnAddCriterionCallback,
): void {
  if (action.type === 'ACCEPT_SUGGESTION') {
    onAddCriterion(action.group, action.criterion)
    return
  }

  if (action.type !== 'COPY_CRITERION') {
    return
  }

  const study = context.otherStudies.find((candidate) => candidate.id === action.studyId)
  const criterion = pickCriterion(study, action.group, action.criterionIndex)
  if (criterion) {
    onAddCriterion(action.group, criterion)
  }
}

function pickCriterion(
  study: Study | undefined,
  group: CriterionGroup,
  index: number,
): EligibilityCriterion | undefined {
  if (!study) {
    return undefined
  }
  const list = group === 'inclusion' ? study.inclusionCriteria : study.exclusionCriteria
  return list[index]
}

// Re-export for consumers that prefer a narrow import surface.
export type { AssistantChatDockProps }
