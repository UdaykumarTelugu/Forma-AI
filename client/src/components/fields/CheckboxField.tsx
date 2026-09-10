import React from 'react';
import { FormField } from '../../types/form';

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
  const isRequired = field.required || field.validation?.required;

  return (
    <div className="form-field checkbox-field" id={`field-${field.id}`}>
      <label className="checkbox-label" htmlFor={field.name}>
        <input
          type="checkbox"
          id={field.name}
          name={field.name}
          checked={checked}
          disabled={field.disabled}
          required={isRequired}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <span>
          {field.label}
          {isRequired && <span className="required-indicator" aria-hidden="true"> *</span>}
        </span>
      </label>
      {field.helpText && <small className="field-help">{field.helpText}</small>}
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
};

export default CheckboxField;
