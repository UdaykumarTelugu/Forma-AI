import React, { useState, useEffect } from 'react';
import {
  ShieldIcon,
  SparklesIcon,
  DashboardIcon,
  FilePlusIcon,
  FolderIcon,
  SettingsIcon,
  LogoutIcon,
  UserIcon,
} from '../common/Icons';
import { draftApi } from '../../services/draftApi';
import { listSubmittedClaims } from '../../services/submissionApi';

export type AppPage = 'dashboard' | 'new-claim' | 'my-claims' | 'profile' | 'settings' | 'claim-details';

interface AppLayoutProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activePage,
  onNavigate,
  onLogout,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeItemCount, setActiveItemCount] = useState<number>(0);

  useEffect(() => {
    const updateCounts = async () => {
      try {
        const [draftsRes, submittedRes] = await Promise.all([
          draftApi.listDrafts('auto-insurance-claim'),
          listSubmittedClaims(),
        ]);
        const draftCount = draftsRes.success && draftsRes.drafts ? draftsRes.drafts.length : 0;
        const submittedCount = submittedRes ? submittedRes.length : 0;
        setActiveItemCount(draftCount + submittedCount);
      } catch {
        // Safe fallback
      }
    };
    void updateCounts();
  }, [activePage]);

  const navItems: Array<{ id: AppPage; label: string; icon: React.ReactNode; badge?: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon size={18} /> },
    { id: 'new-claim', label: 'New Claim', icon: <FilePlusIcon size={18} />, badge: 'AI' },
    {
      id: 'my-claims',
      label: 'My Claims',
      icon: <FolderIcon size={18} />,
      badge: activeItemCount > 0 ? String(activeItemCount) : undefined,
    },
  ];

  const secondaryNavItems: Array<{ id: AppPage; label: string; icon: React.ReactNode }> = [
    { id: 'profile', label: 'Profile', icon: <UserIcon size={18} /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon size={18} /> },
  ];

  const handleNavClick = (page: AppPage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  const getPageTitle = (page: AppPage): string => {
    switch (page) {
      case 'dashboard':
        return 'Dashboard';
      case 'new-claim':
        return 'New Claim';
      case 'my-claims':
        return 'My Claims';
      case 'claim-details':
        return 'Claim Details';
      case 'profile':
        return 'Profile';
      case 'settings':
        return 'Settings';
      default:
        return 'Forma AI';
    }
  };

  return (
    <div className="forma-shell">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="forma-sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`forma-sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="forma-sidebar-brand" onClick={() => handleNavClick('dashboard')} role="button" tabIndex={0}>
          <div className="forma-brand-logo">
            <ShieldIcon size={20} color="#ffffff" />
            <span className="forma-brand-sparkle">
              <SparklesIcon size={10} color="#38bdf8" />
            </span>
          </div>
          <div className="forma-brand-text">
            <span className="forma-brand-name">FORMA AI</span>
            <span className="forma-brand-tag">InsurTech Engine</span>
          </div>
        </div>

        <nav className="forma-sidebar-nav" aria-label="Main navigation">
          <div className="forma-nav-section-label">Intake &amp; Claims</div>
          <ul className="forma-nav-list">
            {navItems.map((item) => {
              const isActive = activePage === item.id || (item.id === 'my-claims' && activePage === 'claim-details');
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`forma-nav-link ${isActive ? 'forma-nav-link-active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="forma-nav-icon">{item.icon}</span>
                    <span className="forma-nav-label">{item.label}</span>
                    {item.badge && <span className="forma-nav-badge">{item.badge}</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="forma-nav-divider" />

          <div className="forma-nav-section-label">Account &amp; System</div>
          <ul className="forma-nav-list">
            {secondaryNavItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`forma-nav-link ${isActive ? 'forma-nav-link-active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="forma-nav-icon">{item.icon}</span>
                    <span className="forma-nav-label">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Footer */}
        <div className="forma-sidebar-footer">
          <div
            className="forma-user-card"
            onClick={() => handleNavClick('profile')}
            role="button"
            tabIndex={0}
            title="View Profile"
          >
            <div className="forma-user-avatar">
              <UserIcon size={16} color="#ffffff" />
            </div>
            <div className="forma-user-meta">
              <span className="forma-user-name">Claims Specialist</span>
              <span className="forma-user-status">Workstation Active</span>
            </div>
          </div>
          <button
            type="button"
            className="forma-logout-btn"
            onClick={onLogout}
            title="Sign out of workstation"
            aria-label="Sign out"
          >
            <LogoutIcon size={16} />
          </button>
        </div>
      </aside>

      {/* Main App Container */}
      <div className="forma-main-wrapper">
        {/* Top Header */}
        <header className="forma-topbar">
          <div className="forma-topbar-left">
            <button
              type="button"
              className="forma-mobile-toggle"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <div className="forma-breadcrumbs">
              <span className="forma-crumb-root">Forma AI</span>
              <span className="forma-crumb-sep">/</span>
              <span className="forma-crumb-current">{getPageTitle(activePage)}</span>
            </div>
          </div>

          <div className="forma-topbar-right">
            <div className="forma-engine-status" title="Forma AI Backend Engine Online">
              <span className="forma-status-dot" />
              <span className="forma-status-text">AI Engine Active</span>
            </div>

            {activePage !== 'new-claim' && (
              <button
                type="button"
                className="forma-topbar-cta"
                onClick={() => handleNavClick('new-claim')}
              >
                <SparklesIcon size={14} color="#ffffff" />
                <span>New Claim</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <main className="forma-content-body">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
