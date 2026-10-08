import React from 'react';
import HeroCanvas from './HeroCanvas';
import StockTickerTape from './StockTickerTape';
import { useStocksData } from '../hooks/useStocksData';

export default function LandingView({ setActiveTab, onSelectStock, onOpenStockDetail, onNavScreener }) {
  const { stocks, isLive, loading } = useStocksData();

  // Top 3 by UNP score (already sorted desc by hook)
  const topStocks = stocks.slice(0, 3);

  const handleOpenDetail = (ticker) => {
    if (onOpenStockDetail) {
      onOpenStockDetail(ticker);
    } else {
      onSelectStock(ticker);
      setActiveTab('screener');
    }
  };

  const handleGoScreener = () => {
    if (onNavScreener) {
      onNavScreener();
    } else {
      setActiveTab('screener');
    }
  };

  const handleCardClick = (ticker) => {
    handleOpenDetail(ticker);
  };

  return (
    <div className="landing-view">
      {/* ── RUNNING REAL-TIME STOCK TICKER TAPE (TOP OF HOME, ABOVE HERO EYEBROW) ── */}
      <StockTickerTape stocks={stocks} onOpenStockDetail={handleOpenDetail} />

      <section className="hero">
        <div className="hero-bg">
          <HeroCanvas />
        </div>
        <div className="hero-content">
          <div className="eyebrow">
            <span className="eyebrow-dot"></span>Dual Phase Screener · LQ45 · IDX
            {/* Live indicator */}
            {!loading && (
              <span
                style={{
                  marginLeft: '10px',
                  fontSize: '10px',
                  color: isLive ? 'var(--cyan)' : 'var(--text-3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: isLive ? 'var(--cyan)' : '#666',
                    display: 'inline-block',
                  }}
                />
                {isLive ? 'LIVE' : 'CACHE'}
              </span>
            )}
          </div>
          <h1 className="font-display">
            Dua Engine.<br />
            <span className="hl-cyan">Satu belum pernah terjadi.</span><br />
            <span className="hl-purple">Satu tunjukkan arahnya.</span>
          </h1>
          <p className="hero-sub">
            ZOOHOOTS menjalankan dua engine secara bersamaan pada 45 saham LQ45 —{' '}
            <strong style={{ color: 'var(--cyan)' }}>Unprecedented Detector</strong> menemukan kondisi langka,{' '}
            <strong style={{ color: 'var(--purple)' }}>Phase Resonance L1</strong> memberi arah. Bersama, mereka membentuk sinyal yang lebih kuat dari keduanya sendiri.
          </p>

          <div className="hero-cta">
            <button className="btn-hero" onClick={handleGoScreener}>
              Mulai Screener LQ45
            </button>
            <button className="btn-ghost" onClick={() => handleOpenDetail('BBCA')}>
              Lihat Demo BBCA →
            </button>
          </div>

          <div className="hero-preview">
            {loading ? (
              // Loading skeleton
              [1, 2, 3].map((i) => (
                <div key={i} className="preview-card" style={{ opacity: 0.4, pointerEvents: 'none' }}>
                  <div className="pc-ticker" style={{ background: 'var(--surface-2)', borderRadius: '4px', height: '18px', width: '60px' }}></div>
                  <div className="pc-name" style={{ background: 'var(--surface-2)', borderRadius: '4px', height: '12px', width: '100px', marginTop: '6px' }}></div>
                  <div style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-3)', fontSize: '12px' }}>Loading…</div>
                </div>
              ))
            ) : (
              topStocks.map((s) => {
                const comboLabel = s.combo === 'strong' ? '⚡ Strong Signal' : s.combo === 'caution' ? '⚠️ Hati-hati' : 'Normal';
                const comboCls = s.combo === 'strong' ? 'badge-strong' : s.combo === 'caution' ? 'badge-caution' : 'badge-fam';
                const l1cls = s.l1 === 'buy' ? 'badge-l1-buy' : s.l1 === 'sell' ? 'badge-l1-sell' : 'badge-l1-neu';
                const isUp = s.chg.startsWith('+');

                return (
                  <div
                    key={s.ticker}
                    className={`preview-card ${s.combo === 'strong' ? 'strong' : ''}`}
                    onClick={() => handleCardClick(s.ticker)}
                    title={`Klik untuk melihat detail ${s.ticker}`}
                  >
                    <div className="pc-ticker">{s.ticker}</div>
                    <div className="pc-name">{s.name}</div>
                    <div className="dual-scores">
                      <div className="score-col">
                        <div className="sc-engine unp">UNP</div>
                        <div className="sc-val unp">{s.unp}</div>
                        <div className="sc-sub">
                          <span className="badge badge-unp" style={{ fontSize: '10px', padding: '2px 6px' }}>
                            Unprecedented
                          </span>
                        </div>
                      </div>
                      <div className="dual-divider"></div>
                      <div className="score-col">
                        <div className="sc-engine l1">L1</div>
                        <div className="sc-val l1-buy">{s.l1.toUpperCase()}</div>
                        <div className="sc-sub">
                          <span className={`badge ${l1cls}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                            {s.l1p}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="pc-combo">
                      <span className={`badge ${comboCls}`} style={{ fontSize: '11px', padding: '3px 8px' }}>
                        {comboLabel}
                      </span>
                    </div>
                    <div className="pc-price-row">
                      <span className={`pc-chg ${isUp ? 'up' : 'dn'}`}>
                        {isUp ? '▲' : '▼'} {s.chg}%
                      </span>
                      <span>Rp {s.price}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <div className="stats-bar">
        <div className="stat-item">
          <div className="stat-val">{stocks.length || 45}</div>
          <div className="stat-label">Saham LQ45</div>
        </div>
        <div className="stat-div"></div>
        <div className="stat-item">
          <div className="stat-val">2</div>
          <div className="stat-label">Engine Screener</div>
        </div>
        <div className="stat-div"></div>
        <div className="stat-item">
          <div className="stat-val">0–100</div>
          <div className="stat-label">Unprecedented Score</div>
        </div>
        <div className="stat-div"></div>
        <div className="stat-item">
          <div className="stat-val">BUY/SELL</div>
          <div className="stat-label">L1 Phase Bias</div>
        </div>
      </div>

      <section className="features">
        <div className="section-header">
          <div className="section-eyebrow">Dua Screener, Satu Platform</div>
          <h2 className="section-title font-display">Unprecedented + Phase L1</h2>
          <p className="section-sub">
            Setiap engine menjawab pertanyaan berbeda. Kombinasinya yang bicara sinyal sesungguhnya.
          </p>
        </div>

        <div className="engine-showcase">
          <div className="engine-card unp-card">
            <div className="engine-icon c">
              <svg viewBox="0 0 24 24">
                <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div className="engine-chip engine-unp" style={{ marginBottom: '10px' }}>
              <span className="engine-dot c"></span>SCREENER 1
            </div>
            <div className="engine-name">Unprecedented Detector</div>
            <div className="engine-q c">"Apakah kondisi ini pernah terjadi sebelumnya?"</div>
            <p className="engine-desc">
              Menggunakan pattern matching historis untuk mengukur kelangkaan kondisi fase saat ini. Semakin tinggi skor, semakin jarang kondisi ini terjadi sepanjang sejarah.
            </p>
            <div className="engine-outputs">
              <span className="badge badge-unp">Score ≥50 Unprecedented</span>
              <span className="badge badge-neu">Score 25–49 Neutral</span>
              <span className="badge badge-fam">Score 0–24 Familiar</span>
            </div>
          </div>

          <div className="engine-card l1-card">
            <div className="engine-icon p">
              <svg viewBox="0 0 24 24">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="engine-chip engine-l1" style={{ marginBottom: '10px' }}>
              <span className="engine-dot p"></span>SCREENER 2
            </div>
            <div className="engine-name">Phase Resonance L1</div>
            <div className="engine-q p">"Ke mana arah fase saat ini?"</div>
            <p className="engine-desc">
              Dari semua pattern match historis, hitung persentase yang berakhir naik vs turun. Jika mayoritas jelas, L1 memberikan bias arah yang actionable untuk eksekusi.
            </p>
            <div className="engine-outputs">
              <span className="badge badge-l1-buy">BUY ≥65%</span>
              <span className="badge badge-l1-sell">SELL ≥65%</span>
              <span className="badge badge-l1-neu">Neutral</span>
            </div>
          </div>
        </div>

        <div className="combo-card">
          <div className="combo-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="2" strokeLinecap="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            Kombinasi Sinyal
          </div>
          <div className="combo-grid">
            <div className="combo-row">
              <div className="combo-signals">
                <span className="badge badge-unp" style={{ fontSize: '9px' }}>UNP Tinggi</span>
                <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>+</span>
                <span className="badge badge-l1-buy" style={{ fontSize: '9px' }}>L1 BUY</span>
              </div>
              <span className="combo-result strong">→ Strong Signal ⚡</span>
            </div>
            <div className="combo-row">
              <div className="combo-signals">
                <span className="badge badge-unp" style={{ fontSize: '9px' }}>UNP Tinggi</span>
                <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>+</span>
                <span className="badge badge-l1-sell" style={{ fontSize: '9px' }}>L1 SELL</span>
              </div>
              <span className="combo-result caution">→ Hati-hati ⚠️</span>
            </div>
            <div className="combo-row">
              <div className="combo-signals">
                <span className="badge badge-neu" style={{ fontSize: '9px' }}>UNP Neutral</span>
                <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>+</span>
                <span className="badge badge-l1-buy" style={{ fontSize: '9px' }}>L1 BUY</span>
              </div>
              <span className="combo-result" style={{ color: 'var(--green)' }}>→ Bullish Biasa</span>
            </div>
            <div className="combo-row">
              <div className="combo-signals">
                <span className="badge badge-fam" style={{ fontSize: '9px' }}>Familiar</span>
                <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>+</span>
                <span className="badge badge-l1-neu" style={{ fontSize: '9px' }}>L1 Neutral</span>
              </div>
              <span className="combo-result skip">→ Skip</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}