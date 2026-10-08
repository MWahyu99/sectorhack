import React from 'react';

export default function PageTabs({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'home', label: '🏠 Home' },
    { id: 'screener', label: '📊 Screener' },
    { id: 'dailynews', label: '📰 Daily News' },
    { id: 'howitworks', label: '⚡ How It Works' }
    // Design Spec(Hide) - disembunyikan sesuai permintaan
  ];

  return (
    <div className="page-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`page-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
