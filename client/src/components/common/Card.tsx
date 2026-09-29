import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  footer,
}) => {
  return (
    <div className={`forma-card ${className}`}>
      {(title || action) && (
        <div className="forma-card-header">
          <div className="forma-card-title-group">
            {typeof title === 'string' ? <h3 className="forma-card-title">{title}</h3> : title}
            {subtitle && <p className="forma-card-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="forma-card-action">{action}</div>}
        </div>
      )}
      <div className="forma-card-body">{children}</div>
      {footer && <div className="forma-card-footer">{footer}</div>}
    </div>
  );
};

export default Card;
