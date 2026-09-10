import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { FormField } from '../../types/form';
import { TextField } from '../fields/TextField';
import { NumberField } from '../fields/NumberField';
import { SelectField } from '../fields/SelectField';
import { CheckboxField } from '../fields/CheckboxField';
import { DateField } from '../fields/DateField';
import { TextareaField } from '../fields/TextareaField';
import { ConditionalField } from './ConditionalField';
import { useAiSuggestionStore } from '../../stores/aiSuggestionStore';
import { buildFieldValidationRules, validateField } from '../../utils/validation';

export interface FieldRendererProps {
  field: FormField;
  value?: unknown;
  onChange?: (value: unknown) => void;
  error?: string;
}

/**
 * FieldRenderer - Factory component mapping FieldType to the corresponding input component
 *
 * Architecture Flow:
 * FormSchema -> DynamicForm -> FormSection -> FieldRenderer -> Specific Field (TextField, NumberField, etc.)
 */
export const FieldRenderer: React.FC<FieldRendererProps> = ({
  field,
  value,
  onChange,
  error,
}) => {
  const formContext = useFormContext();
  const getFieldStatus = useAiSuggestionStore((s) => s.getFieldStatus);
  const markFieldEdited = useAiSuggestionStore((s) => s.markFieldEdited);
  const confirmAiSuggestion = useAiSuggestionStore((s) => s.confirmAiSuggestion);

  if (!field) {
    return null;
  }

  const renderConcreteField = (
    currentValue: unknown,
    handleChange?: (val: unknown) => void,
    errorMessage?: string
  ) => {
    switch (field.type) {
      case 'text':
        return (
          <TextField
            field={field}
            value={currentValue !== undefined && currentValue !== null ? String(currentValue) : ''}
            onChange={handleChange}
            error={errorMessage}
          />
        );
      case 'number':
        return (
          <NumberField
            field={field}
            value={
              typeof currentValue === 'number'
                ? currentValue
                : currentValue === '' || currentValue === null || currentValue === undefined
                ? ''
                : Number.isNaN(Number(currentValue))
                ? ''
                : Number(currentValue)
            }
            onChange={handleChange}
            error={errorMessage}
          />
        );
      case 'select':
        return (
          <SelectField
            field={field}
            value={
              currentValue !== undefined && currentValue !== null
                ? (currentValue as string | number)
                : ''
            }
            onChange={handleChange}
            error={errorMessage}
          />
        );
      case 'checkbox':
        return (
          <CheckboxField
            field={field}
            checked={Boolean(currentValue)}
            onChange={handleChange}
            error={errorMessage}
          />
        );
      case 'date':
        return (
          <DateField
            field={field}
            value={currentValue !== undefined && currentValue !== null ? String(currentValue) : ''}
            onChange={handleChange}
            error={errorMessage}
          />
        );
      case 'textarea':
        return (
          <TextareaField
            field={field}
            value={currentValue !== undefined && currentValue !== null ? String(currentValue) : ''}
            onChange={handleChange}
            error={errorMessage}
          />
        );
      default:
        return (
          <div className="unsupported-field-warning">
            Unsupported field type: <strong>{(field as FormField).type}</strong> for field <em>{field.name}</em>
          </div>
        );
    }
  };

  const activeConditions =
    field.conditions && field.conditions.length > 0
      ? field.conditions
      : field.conditional
      ? [field.conditional]
      : undefined;

  return (
    <ConditionalField conditions={activeConditions}>
      <div
        className="field-renderer"
        data-field-id={field.id}
        data-field-name={field.name}
        data-field-type={field.type}
        id={`field-container-${field.id}`}
      >
        {formContext ? (
          <Controller
            name={field.name}
            control={formContext.control}
            rules={buildFieldValidationRules(field)}
            defaultValue={field.defaultValue ?? (field.type === 'checkbox' ? false : '')}
            render={({ field: controllerField, fieldState }) => {
              const status = getFieldStatus(field.name, controllerField.value);
              const liveError =
                fieldState.error?.message ||
                error ||
                (controllerField.value !== undefined && controllerField.value !== ''
                  ? validateField(field, controllerField.value) || undefined
                  : undefined);
              const hasError = Boolean(liveError);
              const errorMessage = liveError;

              return (
                <div
                  className={`field-wrapper ${
                    hasError ? 'field-has-error' : ''
                  } ${
                    status === 'ai-applied'
                      ? hasError
                        ? 'field-ai-needs-review'
                        : 'field-ai-suggested'
                      : status === 'user-reviewed'
                      ? 'field-user-reviewed'
                      : ''
                  }`}
                >
                  {status === 'ai-applied' && !hasError && (
                    <div
                      className="ai-suggestion-indicator ai-status-applied"
                      role="status"
                      aria-label={`${field.label}: Suggested by AI`}
                    >
                      <span className="ai-indicator-icon" aria-hidden="true">✨</span>
                      <span className="ai-indicator-text">Suggested by AI</span>
                      <button
                        type="button"
                        className="ai-confirm-btn"
                        onClick={() => confirmAiSuggestion(field.name)}
                        title={`Confirm suggestion for ${field.label} without changes`}
                        aria-label={`Confirm suggestion for ${field.label}`}
                      >
                        ✓ Confirm
                      </button>
                    </div>
                  )}
                  {status === 'ai-applied' && hasError && (
                    <div
                      className="ai-suggestion-indicator ai-status-needs-review"
                      role="status"
                      aria-label={`${field.label}: Suggested by AI, needs review`}
                    >
                      <span className="ai-indicator-icon" aria-hidden="true">⚠️</span>
                      <span className="ai-indicator-text">Suggested by AI • Needs Review</span>
                    </div>
                  )}
                  {status === 'user-reviewed' && (
                    <div
                      className="ai-suggestion-indicator ai-status-reviewed"
                      role="status"
                      aria-label={`${field.label}: Reviewed and edited by you`}
                    >
                      <span className="ai-indicator-icon" aria-hidden="true">✏️</span>
                      <span className="ai-indicator-text">Reviewed by you</span>
                    </div>
                  )}
                  {renderConcreteField(
                    controllerField.value,
                    (val) => {
                      markFieldEdited(field.name);
                      controllerField.onChange(val);
                      onChange?.(val);
                    },
                    errorMessage
                  )}
                </div>
              );
            }}
          />
        ) : (
          renderConcreteField(
            value !== undefined ? value : field.defaultValue,
            (val) => {
              markFieldEdited(field.name);
              onChange?.(val);
            },
            error
          )
        )}
      </div>
    </ConditionalField>
  );
};

export default FieldRenderer;
