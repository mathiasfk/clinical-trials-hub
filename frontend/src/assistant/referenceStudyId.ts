/**
 * Parses messy user input (paste, punctuation, extra spaces) into a canonical
 * study id: `study-` + numeric suffix, with at least four digits when the
 * suffix has fewer than four characters (e.g. `study-0002`).
 */
export function extractReferenceStudyId(raw: string): string | null {
  const collapsed = raw.trim().replace(/\s+/g, ' ')
  if (!collapsed) {
    return null
  }

  const match = collapsed.match(/\bstudy\D*(\d+)/i)
  if (!match) {
    return null
  }

  const n = Number.parseInt(match[1], 10)
  if (!Number.isFinite(n) || n < 0) {
    return null
  }

  const suffix = String(n)
  const padded = suffix.length < 4 ? suffix.padStart(4, '0') : suffix
  return `study-${padded}`
}
