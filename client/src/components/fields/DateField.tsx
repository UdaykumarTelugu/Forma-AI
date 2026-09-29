import React from 'react';
import { FormField } from '../../types/form';
import { AlertCircleIcon } from '../common/Icons';

export interface DateFieldProps {
  field: FormField;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
}

export const DateField: React.FC<DateFieldProps> = ({ field, value = '', onChange, error }) => {
  const isRequired = Boolean(field.required || field.validation?.required);
  const hasError = Boolean(error);

  return (
    <div className={`form-field date-field ${hasError ? 'field-has-error' : ''}`} id={`field-${field.id}`}>
      <label htmlFor={field.name}>
        <span>{field.label}</span>
        {isRequired && (
          <span className="required-indicator" aria-hidden="true" title="Required field">
            {' '}*
          </span>
        )}
      </label>
      <input
        type="date"
        id={field.name}
        name={field.name}
        value={value}
        disabled={field.disabled}
        readOnly={field.readonly}
        required={isRequired}
        aria-invalid={hasError ? 'true' : undefined}
        aria-describedby={hasError ? `error-${field.name}` : field.helpText ? `help-${field.name}` : undefined}
        className={hasError ? 'input-error' : ''}
        onChange={(e) => onChange?.(e.target.value)}
      />
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

export default DateField;
