import React from 'react';

export interface LoadingProps {
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ message = 'Loading...' }) => {
  // TODO: Add animated spinner or skeleton loader
  return (
    <div className="loading-container" role="status">
      <span>{message}</span>
    </div>
  );
};

export default Loading;
