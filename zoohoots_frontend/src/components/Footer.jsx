import React from 'react';

export default function Footer({ setActiveTab }) {
  return (
    <footer>
      <div
        className="footer-brand"
        onClick={() => setActiveTab && setActiveTab('home')}
        title="Kembali ke Beranda ZOOHOOTS"
      >
        <span className="logo-text"><span className="logo-white">ZOOH</span><span className="logo-cyan">OOTS</span></span>
        <span className="footer-tagline">
          Dual Phase Screener · IDX LQ45
        </span>
      </div>
      <div className="footer-text">
        Sectors Hackathon 2026 · Track 3 Market Intelligence
      </div>

    </footer>
  );
}
