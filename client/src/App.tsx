import React, { useState } from 'react';
import { AppLayout, AppPage } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClaimFormPage } from './pages/ClaimFormPage';
import { MyClaimsPage } from './pages/MyClaimsPage';
import { ClaimDetailsPage } from './pages/ClaimDetailsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import './index.css';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  if (!isAuthenticated) {
    return (
      <LoginPage
        onLogin={() => {
          setIsAuthenticated(true);
          setCurrentPage('dashboard');
        }}
      />
    );
  }

  const handleStartNewClaim = () => {
    setCurrentDraftId(null);
    setCurrentPage('new-claim');
  };

  const handleResumeDraft = (draftId: string) => {
    setCurrentDraftId(draftId);
    setCurrentPage('new-claim');
  };

  const handleViewClaimDetails = (claimId: string) => {
    setSelectedClaimId(claimId);
    setCurrentPage('claim-details');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AppLayout
      activePage={currentPage}
      onNavigate={(page) => {
        if (page === 'new-claim' && currentPage !== 'new-claim') {
          setCurrentDraftId(null);
        }
        setCurrentPage(page);
      }}
      onLogout={handleLogout}
    >
      {currentPage === 'dashboard' && (
        <DashboardPage
          onStartNewClaim={handleStartNewClaim}
          onResumeDraft={handleResumeDraft}
          onViewAllClaims={() => setCurrentPage('my-claims')}
          onViewClaimDetails={handleViewClaimDetails}
        />
      )}

      {currentPage === 'new-claim' && (
        <ClaimFormPage
          key={currentDraftId || 'new'}
          initialDraftId={currentDraftId}
          onNavigateHome={() => setCurrentPage('dashboard')}
          onViewAllClaims={() => setCurrentPage('my-claims')}
          onViewClaimDetails={handleViewClaimDetails}
        />
      )}

      {currentPage === 'my-claims' && (
        <MyClaimsPage
          onStartNewClaim={handleStartNewClaim}
          onResumeDraft={handleResumeDraft}
          onViewClaimDetails={handleViewClaimDetails}
        />
      )}

      {currentPage === 'claim-details' && (
        <ClaimDetailsPage
          claimId={selectedClaimId || ''}
          onBack={() => setCurrentPage('my-claims')}
        />
      )}

      {currentPage === 'profile' && <ProfilePage />}

      {currentPage === 'settings' && <SettingsPage />}
    </AppLayout>
  );
};

export default App;
