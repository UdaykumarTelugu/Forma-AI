import React from 'react';
import { FormField } from '../../types/form';

export interface SelectFieldProps {
  field: FormField;
  value?: string | number;
  onChange?: (value: string | number) => void;
  error?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({ field, value = '', onChange, error }) => {
  const isRequired = field.required || field.validation?.required;

  return (
    <div className="form-field select-field" id={`field-${field.id}`}>
      <label htmlFor={field.name}>
        {field.label}
        {isRequired && <span className="required-indicator" aria-hidden="true"> *</span>}
      </label>
      <select
        id={field.name}
        name={field.name}
        value={value}
        disabled={field.disabled}
        required={isRequired}
        onChange={(e) => onChange?.(e.target.value)}
      >
        <option value="">{field.placeholder || '-- Select an option --'}</option>
        {field.options?.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
      {field.helpText && <small className="field-help">{field.helpText}</small>}
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
};

export default SelectField;
