import React from 'react';

export default function Navbar({ activeTab, setActiveTab, onNavScreener }) {
  const handleGoScreener = () => {
    if (onNavScreener) onNavScreener();
    else setActiveTab('screener');
  };

  return (
    <nav className="topnav">
      <div className="logo" onClick={() => setActiveTab('home')}>
        <div className="logo-mark">
          <svg viewBox="0 0 18 18" fill="none">
            <path d="M9 2C9 2 3 6 3 10.5C3 13.5 5.7 16 9 16C12.3 16 15 13.5 15 10.5C15 6 9 2 9 2Z" fill="#050810"/>
            <path d="M9 7C9 7 6 9.5 6 11.5C6 12.8 7.3 14 9 14C10.7 14 12 12.8 12 11.5C12 9.5 9 7 9 7Z" fill="#00D4FF"/>
          </svg>
        </div>
        <span className="logo-text"><span className="logo-white">ZOOH</span><span className="logo-cyan">OOTS</span></span>
      </div>

      {/* NAVBAR MENU: Home - Screener - Daily News(Opsional) - How it work - Design Spec(Hide) */}
      <ul className="nav-links">
        <li>
          <button
            className={activeTab === 'home' ? 'active' : ''}
            onClick={() => setActiveTab('home')}
          >
            Home
          </button>
        </li>
        <li>
          <button
            className={activeTab === 'screener' ? 'active' : ''}
            onClick={handleGoScreener}
          >
            Screener
          </button>
        </li>
        <li>
          <button
            className={activeTab === 'dailynews' ? 'active' : ''}
            onClick={() => setActiveTab('dailynews')}
          >
            Daily News
          </button>
        </li>
        <li>
          <button
            className={activeTab === 'howitworks' ? 'active' : ''}
            onClick={() => setActiveTab('howitworks')}
          >
            How it work
          </button>
        </li>
        {/* Design Spec(Hide) - Disembunyikan dari Navbar sesuai task ticket */}
      </ul>

      <div className="nav-right">
        <button className="btn-outline" onClick={() => alert('Fitur Otentikasi Terintegrasi Segera Hadir')}>
          Log In
        </button>
        <button className="btn-primary" onClick={handleGoScreener}>
          Get Started
        </button>
      </div>
    </nav>
  );
}
