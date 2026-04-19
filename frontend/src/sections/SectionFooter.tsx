export type SectionMode = 'edit' | 'new'

interface SectionFooterProps {
  mode: SectionMode
  busy: boolean
  submitError?: string
  successMessage?: string
}

export function SectionFooter({ mode, busy, submitError, successMessage }: SectionFooterProps) {
  const saveLabel = busy ? 'Saving...' : 'Save'
  const nextLabel = 'Next'

  return (
    <div className="section-footer">
      {mode === 'edit' ? (
        <button
          className="submit-button"
          type="submit"
          disabled={busy}
          data-testid="section-save-button"
        >
          {saveLabel}
        </button>
      ) : (
        <button
          className="submit-button"
          type="submit"
          disabled={busy}
          data-testid="section-next-button"
        >
          {nextLabel}
        </button>
      )}
      {submitError ? <p className="error-message">{submitError}</p> : null}
      {successMessage ? <p className="success-message">{successMessage}</p> : null}
    </div>
  )
}
