import type { SkillDefinition } from './types'

/**
 * Root-level skill menu rendered on the `Eligibility criteria` screen.
 * Ordering here matches the root menu shown after the intro.
 */
export const ELIGIBILITY_SKILLS: SkillDefinition[] = [
  {
    id: 'copy-from-study',
    label: 'Copy criteria from another study',
    action: { type: 'START_COPY_FROM_STUDY' },
  },
  {
    id: 'suggest-relevant-criteria',
    label: 'Suggest criteria based on similar studies',
    action: { type: 'START_SUGGEST_RELEVANT' },
  },
]
