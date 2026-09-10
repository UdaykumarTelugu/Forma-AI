import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  disabled,
  ...props
}) => {
  // TODO: Enhance with design system styles and loading spinner
  return (
    <button
      disabled={disabled || isLoading}
      data-variant={variant}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
};

export default Button;
