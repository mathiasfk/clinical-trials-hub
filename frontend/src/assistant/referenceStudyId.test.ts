import { describe, expect, it } from 'vitest'

import { extractReferenceStudyId } from './referenceStudyId'

describe('extractReferenceStudyId', () => {
  it('returns null for empty or unrecognizable input', () => {
    expect(extractReferenceStudyId('')).toBeNull()
    expect(extractReferenceStudyId('   ')).toBeNull()
    expect(extractReferenceStudyId('nct12345')).toBeNull()
    expect(extractReferenceStudyId('no id here')).toBeNull()
  })

  it('accepts canonical ids', () => {
    expect(extractReferenceStudyId('study-0002')).toBe('study-0002')
    expect(extractReferenceStudyId('study-0018')).toBe('study-0018')
  })

  it('is case-insensitive on the study prefix', () => {
    expect(extractReferenceStudyId('STUDY-0002')).toBe('study-0002')
    expect(extractReferenceStudyId('Study-2')).toBe('study-0002')
  })

  it('trims and tolerates internal whitespace', () => {
    expect(extractReferenceStudyId('  study-0002  ')).toBe('study-0002')
    expect(extractReferenceStudyId('study  2')).toBe('study-0002')
  })

  it('strips punctuation often copied with ids', () => {
    expect(extractReferenceStudyId('(study-0002)')).toBe('study-0002')
    expect(extractReferenceStudyId('study-0002,')).toBe('study-0002')
    expect(extractReferenceStudyId('Ref: study-0002.')).toBe('study-0002')
  })

  it('handles study glued to digits without a hyphen', () => {
    expect(extractReferenceStudyId('study0002')).toBe('study-0002')
  })

  it('preserves long numeric suffixes without truncating', () => {
    expect(extractReferenceStudyId('study-12345')).toBe('study-12345')
  })
})
