import React from 'react';
import { AlertCircleIcon, RefreshIcon } from './Icons';
import { Button } from './Button';

export interface ErrorMessageProps {
  message?: string;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message = 'An unexpected error occurred.',
  title = 'Error',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`forma-error-alert ${className}`} role="alert">
      <div className="forma-error-icon">
        <AlertCircleIcon size={20} color="#ef4444" />
      </div>
      <div className="forma-error-body">
        <h4 className="forma-error-title">{title}</h4>
        <p className="forma-error-message">{message}</p>
      </div>
      {onRetry && (
        <div className="forma-error-action">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshIcon size={14} />}
            onClick={onRetry}
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorMessage;
