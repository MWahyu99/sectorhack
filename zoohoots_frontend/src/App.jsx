import React, { useState } from 'react';
import Navbar from './components/Navbar';
import LandingView from './components/LandingView';
import ScreenerView from './components/ScreenerView';
import DailyNewsView from './components/DailyNewsView';
import HowItWorksView from './components/HowItWorksView';
import DesignSpecView from './components/DesignSpecView';
import Footer from './components/Footer';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedTicker, setSelectedTicker] = useState('BBCA');
  const [screenerMode, setScreenerMode] = useState('dashboard');

  const handleOpenStockDetail = (ticker) => {
    setSelectedTicker(ticker);
    setScreenerMode('deepdive');
    setActiveTab('screener');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavScreener = () => {
    setScreenerMode('dashboard');
    setActiveTab('screener');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-shell">
      {/* Primary Header Navigation: Home - Screener - Daily News(Opsional) - How it work */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNavScreener={handleNavScreener}
      />

      <main className="main-content">
        {activeTab === 'home' && (
          <LandingView
            setActiveTab={setActiveTab}
            onSelectStock={setSelectedTicker}
            onOpenStockDetail={handleOpenStockDetail}
            onNavScreener={handleNavScreener}
          />
        )}

        {activeTab === 'screener' && (
          <ScreenerView
            selectedTicker={selectedTicker}
            onSelectStock={setSelectedTicker}
            screenerMode={screenerMode}
            setScreenerMode={setScreenerMode}
          />
        )}

        {activeTab === 'dailynews' && (
          <DailyNewsView
            onSelectStock={handleOpenStockDetail}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'howitworks' && <HowItWorksView />}

        {/* Design Spec(Hide) - Disembunyikan dari navigasi, namun tetap ada jika dipanggil via parameter/state */}
        {activeTab === 'spec' && <DesignSpecView setActiveTab={setActiveTab} />}
      </main>

      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}
