import React from 'react';
import { FormField } from '../../types/form';
import { AlertCircleIcon } from '../common/Icons';

export interface NumberFieldProps {
  field: FormField;
  value?: number | '';
  onChange?: (value: number | '') => void;
  error?: string;
}

export const NumberField: React.FC<NumberFieldProps> = ({ field, value = '', onChange, error }) => {
  const isRequired = Boolean(field.required || field.validation?.required);
  const min = typeof field.validation?.min === 'number' ? field.validation.min : undefined;
  const max = typeof field.validation?.max === 'number' ? field.validation.max : undefined;
  const hasError = Boolean(error);

  return (
    <div className={`form-field number-field ${hasError ? 'field-has-error' : ''}`} id={`field-${field.id}`}>
      <label htmlFor={field.name}>
        <span>{field.label}</span>
        {isRequired && (
          <span className="required-indicator" aria-hidden="true" title="Required field">
            {' '}*
          </span>
        )}
      </label>
      <input
        type="number"
        id={field.name}
        name={field.name}
        placeholder={field.placeholder}
        value={value}
        min={min}
        max={max}
        disabled={field.disabled}
        readOnly={field.readonly}
        required={isRequired}
        aria-invalid={hasError ? 'true' : undefined}
        aria-describedby={hasError ? `error-${field.name}` : field.helpText ? `help-${field.name}` : undefined}
        className={hasError ? 'input-error' : ''}
        onChange={(e) => {
          const val = e.target.value === '' ? '' : Number(e.target.value);
          onChange?.(val);
        }}
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

export default NumberField;
