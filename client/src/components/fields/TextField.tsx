import React from 'react';
import { FormField } from '../../types/form';

export interface TextFieldProps {
  field: FormField;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
}

export const TextField: React.FC<TextFieldProps> = ({ field, value = '', onChange, error }) => {
  const isRequired = field.required || field.validation?.required;

  return (
    <div className="form-field text-field" id={`field-${field.id}`}>
      <label htmlFor={field.name}>
        {field.label}
        {isRequired && <span className="required-indicator" aria-hidden="true"> *</span>}
      </label>
      <input
        type="text"
        id={field.name}
        name={field.name}
        placeholder={field.placeholder}
        value={value}
        disabled={field.disabled}
        readOnly={field.readonly}
        required={isRequired}
        onChange={(e) => onChange?.(e.target.value)}
      />
      {field.helpText && <small className="field-help">{field.helpText}</small>}
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
};

export default TextField;
