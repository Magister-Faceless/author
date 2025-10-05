import React from 'react';

export const ResearchPanel: React.FC = () => {
  return (
    <div className="research-panel">
      <div className="page-header">
        <h1>Research Center</h1>
        <p>Organize your research, references, and fact-checking</p>
      </div>
      
      <div className="coming-soon">
        <h2>Coming Soon</h2>
        <p>Research management features will be available in the next development phase.</p>
        <ul>
          <li>Research note organization</li>
          <li>Reference management</li>
          <li>Fact-checking tools</li>
          <li>Source verification</li>
        </ul>
      </div>
    </div>
  );
};
