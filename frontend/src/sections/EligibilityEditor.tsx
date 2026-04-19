import type { EligibilityDimension } from '../types'
import type { CriterionDraft, DraftOperator } from './eligibilityDrafts'
import {
  RULE_OPERATORS,
  createEmptyCriterionDraft,
  findDimension,
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
  function updateCriterion(index: number, updates: Partial<CriterionDraft>) {
    onChange(
      criteria.map((criterion, currentIndex) => {
        if (currentIndex !== index) {
          return criterion
        }
        const nextCriterion = { ...criterion, ...updates }
        if (updates.dimensionId !== undefined) {
          const dimension = findDimension(dimensions, updates.dimensionId)
          nextCriterion.unit = dimension?.allowedUnits?.[0] ?? ''
        }
        return nextCriterion
      }),
    )
  }

  function addCriterion() {
    onChange([...criteria, createEmptyCriterionDraft()])
  }

  function removeCriterion(index: number) {
    onChange(criteria.filter((_, currentIndex) => currentIndex !== index))
  }

  return (
    <section className="criteria-group">
      <div className="section-header">
        <h3>{title}</h3>
        <button type="button" onClick={addCriterion} disabled={dimensions.length === 0}>
          Add criterion
        </button>
      </div>

      {criteria.length === 0 ? (
        <p className="criteria-empty-state">No {title.toLowerCase()} added yet.</p>
      ) : (
        <table className="criteria-table">
          <thead>
            <tr>
              <th scope="col">Description</th>
              <th scope="col">Criteria</th>
              <th scope="col" className="criteria-table-actions">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((criterion, index) => {
              const currentDimension = findDimension(dimensions, criterion.dimensionId)
              const unitLabel = currentDimension?.allowedUnits?.[0] ?? ''

              return (
                <tr key={`${fieldKey}-${index}`} className="criteria-row">
                  <td>
                    <input
                      id={`${fieldKey}-${index}-description`}
                      type="text"
                      placeholder="Describe the criterion"
                      value={criterion.description}
                      onChange={(event) =>
                        updateCriterion(index, { description: event.target.value })
                      }
                    />
                    <FieldError
                      message={validationErrors[`${fieldKey}[${index}].description`]}
                    />
                  </td>
                  <td>
                    <div className="criteria-inline-controls">
                      <select
                        id={`${fieldKey}-${index}-dimension`}
                        className="criteria-dimension"
                        value={criterion.dimensionId}
                        title={currentDimension?.description}
                        aria-label="Dimension"
                        onChange={(event) =>
                          updateCriterion(index, { dimensionId: event.target.value })
                        }
                      >
                        <option value="">Select dimension</option>
                        {dimensions.map((dimension) => (
                          <option
                            key={dimension.id}
                            value={dimension.id}
                            title={dimension.description}
                          >
                            {dimension.displayName}
                          </option>
                        ))}
                      </select>

                      <select
                        id={`${fieldKey}-${index}-operator`}
                        className="criteria-operator"
                        value={criterion.operator}
                        aria-label="Operator"
                        onChange={(event) =>
                          updateCriterion(index, {
                            operator: event.target.value as DraftOperator,
                          })
                        }
                      >
                        <option value="">Op</option>
                        {RULE_OPERATORS.map((operator) => (
                          <option key={operator} value={operator}>
                            {operator}
                          </option>
                        ))}
                      </select>

                      <input
                        id={`${fieldKey}-${index}-value`}
                        className="criteria-value"
                        type="number"
                        step="any"
                        placeholder="Value"
                        aria-label="Value"
                        value={criterion.value}
                        onChange={(event) =>
                          updateCriterion(index, { value: event.target.value })
                        }
                      />

                      {currentDimension && unitLabel ? (
                        <span className="criteria-unit" aria-label="Unit">
                          {unitLabel}
                        </span>
                      ) : null}
                    </div>
                    <div className="criteria-inline-errors">
                      <FieldError
                        message={
                          validationErrors[
                            `${fieldKey}[${index}].deterministicRule.dimensionId`
                          ]
                        }
                      />
                      <FieldError
                        message={
                          validationErrors[
                            `${fieldKey}[${index}].deterministicRule.operator`
                          ]
                        }
                      />
                      <FieldError
                        message={
                          validationErrors[`${fieldKey}[${index}].deterministicRule.value`]
                        }
                      />
                      <FieldError
                        message={
                          validationErrors[`${fieldKey}[${index}].deterministicRule.unit`]
                        }
                      />
                    </div>
                  </td>
                  <td className="criteria-table-actions">
                    <button
                      type="button"
                      className="criteria-remove"
                      onClick={() => removeCriterion(index)}
                      aria-label={`Remove criterion ${index + 1}`}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

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
