import React from 'react';

export default function DesignSpecView({ setActiveTab }) {
  const colorTokens = [
    { name: '--bg', hex: '#0A0E1A', bg: '#0A0E1A' },
    { name: '--surface', hex: '#111827', bg: '#111827' },
    { name: '--surface2', hex: '#1A2540', bg: '#1A2540' },
    { name: '--cyan (UNP)', hex: '#00D4FF', bg: '#00D4FF' },
    { name: '--purple (L1)', hex: '#A882FF', bg: '#A882FF' },
    { name: '--green (BUY)', hex: '#22D3A5', bg: '#22D3A5' },
    { name: '--red (SELL)', hex: '#FF6B6B', bg: '#FF6B6B' },
    { name: '--yellow (Neutral)', hex: '#FBBF24', bg: '#FBBF24' },
    { name: '--text', hex: '#F0F4FF', bg: '#F0F4FF' }
  ];

  return (
    <div className="spec-page">
      <div style={{ marginBottom: '18px' }}>
        <button
          onClick={() => setActiveTab ? setActiveTab('home') : null}
          className="btn-outline"
          style={{ fontSize: '12px', padding: '6px 14px' }}
        >
          ← Kembali ke Halaman Utama
        </button>
      </div>

      <div className="section-header" style={{ textAlign: 'left', marginBottom: '32px' }}>
        <div className="section-eyebrow">Internal Developer Spec · Hidden from Navbar</div>
        <h2 className="section-title font-display">Design System — Dual Screener</h2>
        <p className="section-sub" style={{ margin: 0, maxWidth: 'none' }}>
          Dokumentasi token, tipografi, komponen UI dual engine, dan spesifikasi API endpoint backend.
        </p>
      </div>

      <div className="spec-section">
        <div className="spec-h">Color Tokens</div>
        <div className="color-grid">
          {colorTokens.map((c, i) => (
            <div key={i} className="color-swatch">
              <div className="swatch-block" style={{ background: c.bg }}></div>
              <div className="swatch-info">
                <div className="swatch-name">{c.name}</div>
                <div className="swatch-hex">{c.hex}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '12px', padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-2)' }}>
          <strong style={{ color: 'var(--text)' }}>Pedoman Engine Color:</strong> Cyan (#00D4FF) = UNP (Unprecedented Detector), Purple (#A882FF) = L1 (Phase Resonance Direction). Warna ini konsisten di seluruh badge, glow, border, dan chart canvas.
        </div>
      </div>

      <div className="spec-section">
        <div className="spec-h">Komponen UI — Dual Engine</div>
        <div className="component-grid">
          <div className="comp-row">
            <span className="comp-label">Engine Chips</span>
            <span className="engine-chip engine-unp">
              <span className="engine-dot c"></span>SCREENER 1 · UNP
            </span>
            <span className="engine-chip engine-l1">
              <span className="engine-dot p"></span>SCREENER 2 · L1
            </span>
          </div>

          <div className="comp-row">
            <span className="comp-label">UNP Badges</span>
            <span className="badge badge-unp">Unprecedented</span>
            <span className="badge badge-neu">Neutral</span>
            <span className="badge badge-fam">Familiar</span>
          </div>

          <div className="comp-row">
            <span className="comp-label">L1 Badges</span>
            <span className="badge badge-l1-buy">L1 BUY</span>
            <span className="badge badge-l1-sell">L1 SELL</span>
            <span className="badge badge-l1-neu">L1 Neutral</span>
          </div>

          <div className="comp-row">
            <span className="comp-label">Combo Badges</span>
            <span className="badge badge-strong">⚡ Strong Signal</span>
            <span className="badge badge-caution">⚠️ Hati-hati</span>
          </div>

          <div className="comp-row" style={{ alignItems: 'flex-start' }}>
            <span className="comp-label">Score Pills<br />(Sidebar List)</span>
            <div className="s-dual">
              <div className="s-score-pill unp">
                <div className="spe-label">UNP</div>
                <div className="spe-val c">94</div>
              </div>
              <div className="s-score-pill l1-buy">
                <div className="spe-label">L1</div>
                <div className="spe-val p">BUY</div>
              </div>
            </div>
            <div className="s-dual" style={{ marginLeft: '12px' }}>
              <div className="s-score-pill fam-neu">
                <div className="spe-label">UNP</div>
                <div className="spe-val dim">32</div>
              </div>
              <div className="s-score-pill l1-neu">
                <div className="spe-label">L1</div>
                <div className="spe-val dim">NEU</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="spec-section">
        <div className="spec-h">API Specification Shape (Python Backend Bridge)</div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px', fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.8 }}>
          <p style={{ marginBottom: '10px' }}>
            <strong style={{ color: 'var(--text)' }}>GET /api/lq45</strong> — Return daftar 45 saham LQ45 beserta hasil kalkulasi kedua engine:
          </p>
          <pre style={{ background: 'var(--surface2)', padding: '12px', borderRadius: '6px', fontSize: '11px', overflowX: 'auto', color: 'var(--text)' }}>
{`[
  {
    "ticker": "BBCA",
    "name": "Bank Central Asia Tbk",
    "price": 9250,
    "change_pct": 2.14,
    "unp_score": 94,
    "unp_label": "unprecedented",
    "l1_bias": "buy",
    "l1_pct": 74.1,
    "combo": "strong",
    "pattern_matches": 27,
    "frequency_tk": 12.4
  },
  ...
]`}
          </pre>
          <p style={{ marginTop: '12px' }}>
            <strong style={{ color: 'var(--text)' }}>GET /api/lq45/:ticker</strong> — Detail lengkap satu emiten termasuk historical match log dan data Sectors API (Broker summary + Foreign flow).
          </p>
          <p style={{ marginTop: '8px' }}>
            <strong style={{ color: 'var(--text)' }}>Sorting Default:</strong> <code>combo == 'strong'</code> di paling atas, kemudian disortir berdasarkan <code>unp_score DESC</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
