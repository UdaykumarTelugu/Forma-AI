import React from 'react';
import { FormField } from '../../types/form';

export interface TextareaFieldProps {
  field: FormField;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
}

export const TextareaField: React.FC<TextareaFieldProps> = ({
  field,
  value = '',
  onChange,
  error,
}) => {
  const isRequired = field.required || field.validation?.required;

  return (
    <div className="form-field textarea-field" id={`field-${field.id}`}>
      <label htmlFor={field.name}>
        {field.label}
        {isRequired && <span className="required-indicator" aria-hidden="true"> *</span>}
      </label>
      <textarea
        id={field.name}
        name={field.name}
        placeholder={field.placeholder}
        value={value}
        disabled={field.disabled}
        readOnly={field.readonly}
        required={isRequired}
        rows={4}
        onChange={(e) => onChange?.(e.target.value)}
      />
      {field.helpText && <small className="field-help">{field.helpText}</small>}
      {error && <span className="field-error" role="alert">{error}</span>}
    </div>
  );
};

export default TextareaField;
