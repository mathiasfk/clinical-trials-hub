import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ConfirmModal } from '../components/ConfirmModal'
import type { EligibilityCriterion, Study } from '../types'
import { SECTION_LABELS } from '../sections/constants'
import type { SectionSlug } from '../sections/constants'
import { useSectionContext } from '../sections/SectionContext'
import type { NewSectionContext } from '../sections/SectionContext'
import { validateStudyForPublish } from '../sections/validation'
import type {
  EligibilityData,
  EndpointsData,
  ObjectivesData,
  StudyInformationData,
} from '../sections/validation'

export function SummaryScreen() {
  const ctx = useSectionContext()

  if (ctx.mode === 'edit') {
    if (!ctx.study) {
      if (ctx.isLoadingStudy) {
        return <p>Loading study summary...</p>
      }
      if (ctx.loadError) {
        return <p className="error-message">{ctx.loadError}</p>
      }
      return <p>Study not found.</p>
    }
    return <EditSummary study={ctx.study} />
  }

  return <NewStudySummary ctx={ctx} />
}

function EditSummary({ study }: { study: Study }) {
  const studyId = study.id
  const edit = (section: SectionSlug) => `/studies/${studyId}/${section}`

  return (
    <div className="workspace-page">
      <header className="workspace-page-header">
        <div>
          <p className="eyebrow">Study</p>
          <h2>Summary</h2>
        </div>
      </header>

      <div className="summary-grid">
        <SummaryCard
          title={SECTION_LABELS['study-information']}
          editHref={edit('study-information')}
        >
          <p>
            <strong>Phase:</strong> {study.phase}
          </p>
          <p>
            <strong>Therapeutic area:</strong> {study.therapeuticArea}
          </p>
          <p>
            <strong>Patient population:</strong> {study.patientPopulation}
          </p>
          <p>
            <strong>Study type:</strong> {study.studyType}
          </p>
          <p>
            <strong>Participants:</strong> {study.participants}
          </p>
          <p>
            <strong>Number of arms:</strong> {study.numberOfArms}
          </p>
        </SummaryCard>

        <SummaryCard title={SECTION_LABELS.objectives} editHref={edit('objectives')}>
          <DetailList items={study.objectives} />
        </SummaryCard>

        <SummaryCard title={SECTION_LABELS.endpoints} editHref={edit('endpoints')}>
          <DetailList items={study.endpoints} />
        </SummaryCard>

        <SummaryCard title={SECTION_LABELS.eligibility} editHref={edit('eligibility')}>
          <EligibilityDescriptionList
            title="Inclusion criteria"
            criteria={study.inclusionCriteria}
          />
          <EligibilityDescriptionList
            title="Exclusion criteria"
            criteria={study.exclusionCriteria}
          />
        </SummaryCard>
      </div>
    </div>
  )
}

function NewStudySummary({ ctx }: { ctx: NewSectionContext }) {
  const navigate = useNavigate()
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [incompleteSections, setIncompleteSections] = useState<SectionSlug[]>([])
  const [isDiscardOpen, setIsDiscardOpen] = useState(false)

  async function handlePublish() {
    setPublishError('')
    const errors = validateStudyForPublish(
      {
        studyInformation: ctx.draft.studyInformation,
        objectives: ctx.draft.objectives,
        endpoints: ctx.draft.endpoints,
        eligibility: ctx.draft.eligibility,
      },
      ctx.dimensions,
    )
    const incomplete = Object.keys(errors) as SectionSlug[]
    if (incomplete.length > 0) {
      setIncompleteSections(incomplete)
      return
    }

    setIncompleteSections([])
    setIsPublishing(true)
    try {
      const created = await ctx.publishDraft()
      navigate(`/studies/${created.id}/summary`)
    } catch (error) {
      setPublishError(extractMessage(error, 'Failed to publish study.'))
    } finally {
      setIsPublishing(false)
    }
  }

  function handleDiscardConfirm() {
    setIsDiscardOpen(false)
    ctx.discardDraft()
    navigate('/studies')
  }

  return (
    <div className="workspace-page">
      <header className="workspace-page-header">
        <div>
          <p className="eyebrow">New study</p>
          <h2>Summary</h2>
          <p className="subtitle">Review the draft and publish to create the study.</p>
        </div>
      </header>

      <div className="summary-grid">
        <SummaryCard title={SECTION_LABELS['study-information']}>
          <NewStudyInformationContent data={ctx.draft.studyInformation} />
        </SummaryCard>
        <SummaryCard title={SECTION_LABELS.objectives}>
          <NewObjectivesContent data={ctx.draft.objectives} />
        </SummaryCard>
        <SummaryCard title={SECTION_LABELS.endpoints}>
          <NewEndpointsContent data={ctx.draft.endpoints} />
        </SummaryCard>
        <SummaryCard title={SECTION_LABELS.eligibility}>
          <NewEligibilityContent data={ctx.draft.eligibility} />
        </SummaryCard>
      </div>

      {incompleteSections.length > 0 ? (
        <section className="incomplete-sections">
          <h3>Incomplete sections</h3>
          <ul>
            {incompleteSections.map((section) => (
              <li key={section}>
                <Link to={`/studies/new/${section}`}>{SECTION_LABELS[section]}</Link>
              </li>
            ))}
          </ul>
          <p className="field-error">
            Resolve the issues above before publishing.{' '}
            <Link to={`/studies/new/${incompleteSections[0]}`}>
              Go to {SECTION_LABELS[incompleteSections[0]]}
            </Link>
          </p>
        </section>
      ) : null}

      <div className="button-row">
        <button
          type="button"
          className="submit-button"
          onClick={handlePublish}
          disabled={isPublishing}
          data-testid="publish-button"
        >
          {isPublishing ? 'Publishing...' : 'Publish'}
        </button>
        <button
          type="button"
          className="danger-button"
          onClick={() => setIsDiscardOpen(true)}
          data-testid="discard-button"
        >
          Discard
        </button>
      </div>

      {publishError ? <p className="error-message">{publishError}</p> : null}

      <ConfirmModal
        open={isDiscardOpen}
        title="Discard new study?"
        description="This draft has not been saved to the server. Discarding will permanently remove all entered data."
        confirmLabel="Discard draft"
        cancelLabel="Keep draft"
        confirmVariant="danger"
        onConfirm={handleDiscardConfirm}
        onCancel={() => setIsDiscardOpen(false)}
      />
    </div>
  )
}

function SummaryCard({
  title,
  editHref,
  children,
}: {
  title: string
  editHref?: string
  children: ReactNode
}) {
  return (
    <section className="summary-card">
      <header className="summary-card-header">
        <h3>{title}</h3>
        {editHref ? (
          <Link
            to={editHref}
            aria-label={`Edit ${title}`}
            className="pencil-icon"
            data-testid={`edit-${title}`}
          >
            ✏
          </Link>
        ) : null}
      </header>
      <div className="summary-card-content">{children}</div>
    </section>
  )
}

function DetailList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="subtitle">Not set</p>
  }
  return (
    <ul className="detail-list">
      {items.map((item, index) => (
        <li key={`${index}-${item}`}>{item}</li>
      ))}
    </ul>
  )
}

function EligibilityDescriptionList({
  title,
  criteria,
}: {
  title: string
  criteria: EligibilityCriterion[]
}) {
  return (
    <section className="eligibility-list">
      <div className="section-header">
        <h4>{title}</h4>
      </div>
      {criteria.length === 0 ? (
        <p className="subtitle">Not set</p>
      ) : (
        <ul className="detail-list">
          {criteria.map((criterion, index) => (
            <li key={`${title}-${index}`}>{criterion.description}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

function NewStudyInformationContent({ data }: { data: StudyInformationData }) {
  return (
    <>
      <p>
        <strong>Phase:</strong> {data.phase || 'Not set'}
      </p>
      <p>
        <strong>Therapeutic area:</strong> {data.therapeuticArea || 'Not set'}
      </p>
      <p>
        <strong>Patient population:</strong> {data.patientPopulation || 'Not set'}
      </p>
      <p>
        <strong>Study type:</strong> {data.studyType}
      </p>
      <p>
        <strong>Participants:</strong> {data.participants ?? 'Not set'}
      </p>
      <p>
        <strong>Number of arms:</strong> {data.numberOfArms ?? 'Not set'}
      </p>
    </>
  )
}

function NewObjectivesContent({ data }: { data: ObjectivesData }) {
  return <DetailList items={data.objectives.filter((item) => item.trim())} />
}

function NewEndpointsContent({ data }: { data: EndpointsData }) {
  return <DetailList items={data.endpoints.filter((item) => item.trim())} />
}

function NewEligibilityContent({ data }: { data: EligibilityData }) {
  return (
    <>
      <EligibilityDescriptionList title="Inclusion criteria" criteria={data.inclusionCriteria} />
      <EligibilityDescriptionList title="Exclusion criteria" criteria={data.exclusionCriteria} />
    </>
  )
}

function extractMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }
  return fallback
}
