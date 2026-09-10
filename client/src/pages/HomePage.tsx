import React from 'react';

/**
 * HomePage - Landing dashboard displaying available forms and quick actions
 */
export const HomePage: React.FC = () => {
  // TODO: Render form cards, search/filter controls, and recent activity
  return (
    <div className="home-page">
      <header>
        <h1>Forma AI — Dynamic Form Engine</h1>
        <p>AI-Augmented Dynamic Form Engine and Structured Data Extraction</p>
      </header>
      <main>
        <section className="form-catalog">
          <h2>Available Forms</h2>
          <p>Select a form to begin entering information or upload an incident narrative.</p>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
