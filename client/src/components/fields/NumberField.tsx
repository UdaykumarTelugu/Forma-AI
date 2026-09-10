import React from 'react';
import { FormField } from '../../types/form';

export interface NumberFieldProps {
  field: FormField;
  value?: number | '';
  onChange?: (value: number | '') => void;
  error?: string;
}

export const NumberField: React.FC<NumberFieldProps> = ({ field, value = '', onChange, error }) => {
  const isRequired = field.required || field.validation?.required;
  const min = typeof field.validation?.min === 'number' ? field.validation.min : undefined;
  const max = typeof field.validation?.max === 'number' ? field.validation.max : undefined;

  return (
    <div className="form-field number-field" id={`field-${field.id}`}>
      <label htmlFor={field.name}>
        {field.label}
        {isRequired && <span className="required-indicator" aria-hidden="true"> *</span>}
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
        onChange={(e) => {
          const val = e.target.value === '' ? '' : Number(e.target.value);
          onChange?.(val);
        }}
      />
      {field.helpText && <small className="field-help">{field.helpText}</small>}
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
};

export default NumberField;
