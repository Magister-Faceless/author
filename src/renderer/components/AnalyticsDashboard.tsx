import React from 'react';

export const AnalyticsDashboard: React.FC = () => {
  return (
    <div className="analytics-dashboard">
      <div className="page-header">
        <h1>Writing Analytics</h1>
        <p>Track your writing progress, productivity, and insights</p>
      </div>
      
      <div className="coming-soon">
        <h2>Coming Soon</h2>
        <p>Analytics features will be available in the next development phase.</p>
        <ul>
          <li>Writing session tracking</li>
          <li>Progress visualization</li>
          <li>Productivity metrics</li>
          <li>Goal achievement tracking</li>
        </ul>
      </div>
    </div>
  );
};
