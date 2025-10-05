import React from 'react';

export const OutlineView: React.FC = () => {
  return (
    <div className="outline-view">
      <div className="page-header">
        <h1>Story Outline</h1>
        <p>Plan your story structure, plot points, and chapter organization</p>
      </div>
      
      <div className="coming-soon">
        <h2>Coming Soon</h2>
        <p>Outline management features will be available in the next development phase.</p>
        <ul>
          <li>Interactive story structure</li>
          <li>Chapter organization</li>
          <li>Plot point tracking</li>
          <li>Three-act structure tools</li>
        </ul>
      </div>
    </div>
  );
};
