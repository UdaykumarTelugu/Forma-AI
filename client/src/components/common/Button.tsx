import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`forma-btn forma-btn-${variant} forma-btn-${size} ${isLoading ? 'forma-btn-loading' : ''} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="forma-btn-spinner" aria-hidden="true" />
      ) : (
        icon && <span className="forma-btn-icon">{icon}</span>
      )}
      <span className="forma-btn-text">{children}</span>
    </button>
  );
};

export default Button;
