import React, { useState } from 'react';
import DashboardView from './DashboardView';
import DetailSahamView from './DetailSahamView';

export default function ScreenerView({
  selectedTicker,
  onSelectStock,
  screenerMode: externalMode,
  setScreenerMode: externalSetMode
}) {
  const [internalMode, setInternalMode] = useState('dashboard');
  const screenerMode = externalMode !== undefined ? externalMode : internalMode;
  const setScreenerMode = externalSetMode || setInternalMode;

  const handleOpenDetail = (ticker) => {
    onSelectStock(ticker);
    setScreenerMode('deepdive');
  };

  const handleBackToWatchlist = () => {
    setScreenerMode('dashboard');
  };

  return (
    <div className="screener-wrapper">
      {/* SUB-HEADER / MODE TOGGLE */}
      <div className="screener-subnav">
        <div className="screener-title-area">
          <span className="screener-badge">LQ45 DUAL PHASE ENGINE</span>
          <h2 className="screener-title font-display">
            {screenerMode === 'dashboard'
              ? 'Screener Watchlist · 45 Emiten LQ45'
              : `Detail Saham: ${selectedTicker}`}
          </h2>
        </div>

        {screenerMode === 'deepdive' && (
          <button className="back-watchlist-nav-btn" onClick={handleBackToWatchlist}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span>Kembali ke Screener Watchlist</span>
          </button>
        )}
      </div>

      {/* RENDER ACTIVE MODE */}
      {screenerMode === 'dashboard' ? (
        <DashboardView
          selectedTicker={selectedTicker}
          onSelectStock={onSelectStock}
          onOpenDetail={handleOpenDetail}
          setActiveTab={() => setScreenerMode('deepdive')}
        />
      ) : (
        <DetailSahamView
          selectedTicker={selectedTicker}
          onSelectStock={onSelectStock}
          setActiveTab={handleBackToWatchlist}
          onBackToWatchlist={handleBackToWatchlist}
        />
      )}
    </div>
  );
}
