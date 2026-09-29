import React, { useState } from 'react';
import { ShieldIcon, SparklesIcon, ArrowRightIcon } from '../components/common/Icons';
import { Button } from '../components/common/Button';
import { ErrorMessage } from '../components/common/ErrorMessage';

interface LoginPageProps {
  onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('claims.operator@forma.ai');
  const [password, setPassword] = useState('••••••••••••');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide both your operator email/ID and password to sign in.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    setTimeout(() => {
      onLogin();
    }, 200);
  };

  return (
    <div className="forma-login-wrapper">
      <div className="forma-login-container">
        {/* Left Branding Panel */}
        <div className="forma-login-brand-panel">
          <div className="forma-login-brand-header">
            <div className="forma-brand-logo">
              <ShieldIcon size={24} color="#ffffff" />
              <span className="forma-brand-sparkle">
                <SparklesIcon size={12} color="#38bdf8" />
              </span>
            </div>
            <span className="forma-login-brand-title">Forma AI</span>
          </div>

          <div className="forma-login-brand-copy">
            <span className="forma-login-tagline">AI-Augmented Dynamic Insurance Claim Form Engine</span>
            <h1 className="forma-login-heading">
              Smarter Intake.<br />
              <span className="forma-text-accent">Zero Redundant Typing.</span>
            </h1>
            <p className="forma-login-desc">
              Describe incidents naturally in plain English. Forma AI extracts key facts, validates schema constraints, and dynamically presents only the required questions.
            </p>
          </div>

          <div className="forma-login-highlights">
            <div className="forma-highlight-row">
              <span className="forma-highlight-dot" />
              <div>
                <strong>Natural Language Extraction</strong>
                <p>Converts free-text incident narratives into structured form values.</p>
              </div>
            </div>
            <div className="forma-highlight-row">
              <span className="forma-highlight-dot" />
              <div>
                <strong>Hierarchical Conditional Logic</strong>
                <p>Irrelevant sections disappear automatically based on incident circumstances.</p>
              </div>
            </div>
            <div className="forma-highlight-row">
              <span className="forma-highlight-dot" />
              <div>
                <strong>Authoritative Human-in-the-Loop</strong>
                <p>AI suggests facts while you maintain 100% control over review and submission.</p>
              </div>
            </div>
          </div>

          <div className="forma-login-footer-meta">
            <span>Enterprise Claim Engine &middot; Active Version</span>
          </div>
        </div>

        {/* Right Sign-In Panel */}
        <div className="forma-login-form-panel">
          <div className="forma-login-form-header">
            <h2 className="forma-login-form-title">Workstation Sign In</h2>
            <p className="forma-login-form-sub">
              Access the claims intake workspace to create, review, or resume filings.
            </p>
          </div>

          <form className="forma-login-form" onSubmit={handleSubmit}>
            {error && <ErrorMessage message={error} className="forma-mb-sm" />}

            <div className="forma-form-group">
              <label htmlFor="login-username" className="forma-label">
                Work Email or Operator ID
              </label>
              <input
                id="login-username"
                type="text"
                className="forma-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="name@company.com"
                required
                autoComplete="username"
              />
            </div>

            <div className="forma-form-group">
              <div className="forma-password-label-row">
                <label htmlFor="login-password" className="forma-label">
                  Password
                </label>
              </div>
              <input
                id="login-password"
                type="password"
                className="forma-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                autoComplete="current-password"
              />
            </div>

            <div className="forma-form-options">
              <label className="forma-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember this session</span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="forma-login-submit-btn"
              isLoading={isSubmitting}
              icon={<ArrowRightIcon size={16} />}
            >
              Enter Workspace
            </Button>

            <div className="forma-login-note">
              <span>Claims Operator Session &middot; Ready</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
