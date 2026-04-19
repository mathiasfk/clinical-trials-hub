import type { EligibilityDimension } from '../types'
import type { CriterionDraft } from './eligibilityDrafts'
import {
  RULE_OPERATORS,
  createEmptyCriterionDraft,
  findDimension,
  formatDraftRule,
} from './eligibilityDrafts'

export function CriteriaGroupEditor({
  title,
  fieldKey,
  criteria,
  dimensions,
  validationErrors,
  onChange,
}: {
  title: string
  fieldKey: 'inclusionCriteria' | 'exclusionCriteria'
  criteria: CriterionDraft[]
  dimensions: EligibilityDimension[]
  validationErrors: Record<string, string>
  onChange: (criteria: CriterionDraft[]) => void
}) {
  const criteriaList =
    criteria.length > 0
      ? criteria
      : dimensions.length > 0
        ? [createEmptyCriterionDraft(dimensions)]
        : []

  function updateCriterion(index: number, updates: Partial<CriterionDraft>) {
    onChange(
      criteriaList.map((criterion, currentIndex) => {
        if (currentIndex !== index) {
          return criterion
        }
        const nextCriterion = { ...criterion, ...updates }
        if (updates.dimensionId) {
          const dimension = findDimension(dimensions, updates.dimensionId)
          nextCriterion.unit = dimension?.allowedUnits[0] ?? ''
        }
        return nextCriterion
      }),
    )
  }

  function addCriterion() {
    onChange([...criteriaList, createEmptyCriterionDraft(dimensions)])
  }

  function removeCriterion(index: number) {
    onChange(criteriaList.filter((_, currentIndex) => currentIndex !== index))
  }

  return (
    <section className="criteria-group">
      <div className="section-header">
        <h3>{title}</h3>
        <button type="button" onClick={addCriterion} disabled={dimensions.length === 0}>
          Add criterion
        </button>
      </div>

      {criteriaList.map((criterion, index) => {
        const currentDimension = findDimension(dimensions, criterion.dimensionId)
        const currentUnits = currentDimension?.allowedUnits ?? []

        return (
          <article className="criterion-editor" key={`${fieldKey}-${index}`}>
            <div className="criterion-editor-header">
              <strong>
                {title} {index + 1}
              </strong>
              <button
                type="button"
                onClick={() => removeCriterion(index)}
                disabled={criteriaList.length === 1}
              >
                Remove
              </button>
            </div>

            <label htmlFor={`${fieldKey}-${index}-description`}>Readable description</label>
            <input
              id={`${fieldKey}-${index}-description`}
              type="text"
              value={criterion.description}
              onChange={(event) => updateCriterion(index, { description: event.target.value })}
            />
            <FieldError message={validationErrors[`${fieldKey}[${index}].description`]} />

            <div className="criterion-rule-grid">
              <div>
                <label htmlFor={`${fieldKey}-${index}-dimension`}>Dimension</label>
                <select
                  id={`${fieldKey}-${index}-dimension`}
                  value={criterion.dimensionId}
                  onChange={(event) => updateCriterion(index, { dimensionId: event.target.value })}
                >
                  {dimensions.map((dimension) => (
                    <option key={dimension.id} value={dimension.id}>
                      {dimension.displayName}
                    </option>
                  ))}
                </select>
                {currentDimension ? (
                  <p className="dimension-help" title={currentDimension.description}>
                    {currentDimension.displayName}: {currentDimension.description}
                  </p>
                ) : null}
                <FieldError
                  message={validationErrors[`${fieldKey}[${index}].deterministicRule.dimensionId`]}
                />
              </div>

              <div>
                <label htmlFor={`${fieldKey}-${index}-operator`}>Operator</label>
                <select
                  id={`${fieldKey}-${index}-operator`}
                  value={criterion.operator}
                  onChange={(event) =>
                    updateCriterion(index, {
                      operator: event.target.value as CriterionDraft['operator'],
                    })
                  }
                >
                  {RULE_OPERATORS.map((operator) => (
                    <option key={operator} value={operator}>
                      {operator}
                    </option>
                  ))}
                </select>
                <FieldError
                  message={validationErrors[`${fieldKey}[${index}].deterministicRule.operator`]}
                />
              </div>

              <div>
                <label htmlFor={`${fieldKey}-${index}-value`}>Value</label>
                <input
                  id={`${fieldKey}-${index}-value`}
                  type="number"
                  step="any"
                  value={criterion.value}
                  onChange={(event) => updateCriterion(index, { value: event.target.value })}
                />
                <FieldError
                  message={validationErrors[`${fieldKey}[${index}].deterministicRule.value`]}
                />
              </div>

              <div>
                <label htmlFor={`${fieldKey}-${index}-unit`}>Unit</label>
                {currentUnits.length > 0 ? (
                  <select
                    id={`${fieldKey}-${index}-unit`}
                    value={criterion.unit}
                    onChange={(event) => updateCriterion(index, { unit: event.target.value })}
                  >
                    {currentUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input id={`${fieldKey}-${index}-unit`} type="text" value="No unit" disabled />
                )}
                <FieldError
                  message={validationErrors[`${fieldKey}[${index}].deterministicRule.unit`]}
                />
              </div>
            </div>

            <p className="criterion-preview">
              Rule preview:{' '}
              <span title={currentDimension?.description}>
                {formatDraftRule(criterion, dimensions)}
              </span>
            </p>
          </article>
        )
      })}

      <FieldError message={validationErrors[fieldKey]} />
    </section>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }
  return <p className="field-error">{message}</p>
}
