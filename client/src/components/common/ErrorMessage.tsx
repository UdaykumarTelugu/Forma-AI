import React from 'react';

export interface ErrorMessageProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message = 'An unexpected error occurred.',
  onRetry,
}) => {
  // TODO: Add alert iconography and retry action button styling
  return (
    <div className="error-message-container" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
