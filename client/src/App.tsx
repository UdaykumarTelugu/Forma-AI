import React, { useState } from 'react';
import { HomePage } from './pages/HomePage';
import { ClaimFormPage } from './pages/ClaimFormPage';
import './index.css';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'home' | 'claim'>('home');

  // TODO: Add client-side router (e.g. React Router) when multiple routes are configured
  return (
    <div className="app-container">
      <nav style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '1rem' }}>
        <button type="button" onClick={() => setCurrentPage('home')}>Home</button>
        <button type="button" onClick={() => setCurrentPage('claim')}>Claim Form</button>
      </nav>
      <main style={{ padding: '1.5rem' }}>
        {currentPage === 'home' ? <HomePage /> : <ClaimFormPage />}
      </main>
    </div>
  );
};

export default App;
