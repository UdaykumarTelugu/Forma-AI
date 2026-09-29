import React from 'react';

export interface LoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}

export const Loading: React.FC<LoadingProps> = ({
  message = 'Loading...',
  size = 'md',
  fullPage = false,
}) => {
  return (
    <div className={`forma-loading-wrap ${fullPage ? 'forma-loading-fullpage' : ''}`} role="status">
      <div className={`forma-spinner forma-spinner-${size}`} aria-hidden="true" />
      {message && <span className="forma-loading-text">{message}</span>}
    </div>
  );
};

export default Loading;
