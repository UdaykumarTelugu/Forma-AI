import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, ...props }, ref) => {
    // TODO: Implement design system styling and error states
    return (
      <div className="input-group">
        {label && <label htmlFor={id}>{label}</label>}
        <input id={id} ref={ref} {...props} />
        {error && <span className="input-error">{error}</span>}
        {helperText && !error && <span className="input-helper">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
