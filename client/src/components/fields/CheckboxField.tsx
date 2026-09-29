import React from 'react';
import { FormField } from '../../types/form';
import { AlertCircleIcon } from '../common/Icons';

export interface CheckboxFieldProps {
  field: FormField;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  error?: string;
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  field,
  checked = false,
  onChange,
  error,
}) => {
  const isRequired = Boolean(field.required || field.validation?.required);
  const hasError = Boolean(error);

  return (
    <div className={`form-field checkbox-field ${hasError ? 'field-has-error' : ''}`} id={`field-${field.id}`}>
      <label className="checkbox-label" htmlFor={field.name}>
        <input
          type="checkbox"
          id={field.name}
          name={field.name}
          checked={checked}
          disabled={field.disabled}
          required={isRequired}
          aria-invalid={hasError ? 'true' : undefined}
          aria-describedby={hasError ? `error-${field.name}` : field.helpText ? `help-${field.name}` : undefined}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <span>
          {field.label}
          {isRequired && (
            <span className="required-indicator" aria-hidden="true" title="Required field">
              {' '}*
            </span>
          )}
        </span>
      </label>
      {field.helpText && !hasError && (
        <small className="field-help" id={`help-${field.name}`}>
          {field.helpText}
        </small>
      )}
      {error && (
        <div className="field-error-message" id={`error-${field.name}`} role="alert">
          <AlertCircleIcon size={13} color="#f87171" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default CheckboxField;
