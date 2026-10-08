import React, { useState, useMemo } from 'react';
import PhaseActivityChart from './PhaseActivityChart';
import { useStocksData } from '../hooks/useStocksData';

export default function DashboardView({ selectedTicker, onSelectStock, setActiveTab, onOpenDetail }) {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // ── API DATA ──────────────────────────────────────────────────────────────
  const { stocks, loading, error, lastUpdated, refresh, isLive } = useStocksData();

  // Hitung tanggal display
  const dateLabel = lastUpdated
    ? lastUpdated.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

  const filteredStocks = useMemo(() => {
    return stocks.filter((s) => {
      const matchSearch =
        s.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      if (filter === 'all')    return true;
      if (filter === 'strong') return s.combo === 'strong';
      if (filter === 'unp')    return s.unpL === 'unp';
      if (filter === 'buy')    return s.l1 === 'buy';
      if (filter === 'sell')   return s.l1 === 'sell';
      return true;
    });
  }, [stocks, filter, searchTerm]);

  const activeStock = useMemo(() => {
    return stocks.find((s) => s.ticker === selectedTicker) || stocks[0];
  }, [stocks, selectedTicker]);

  // Guard saat masih loading & belum ada data
  if (!activeStock) {
    return (
      <div className="dashboard" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-3)', textAlign: 'center', padding: '48px' }}>
          <div className="loading-spinner" style={{ marginBottom: '12px' }} />
          Memuat data screener…
        </div>
      </div>
    );
  }

  const isUp = (activeStock.chg || '').startsWith('+');

  const comboVerdict = useMemo(() => {
    if (activeStock.combo === 'strong') {
      return {
        cls: 'strong-buy',
        icon: '⚡',
        title: 'Strong Signal — UNP Tinggi + L1 BUY',
        desc: `UNP ${activeStock.unp} (kondisi langka) + L1 ${activeStock.l1.toUpperCase()} ${activeStock.l1p}% (bias jelas). Kombinasi terkuat dalam metodologi ZOOHOOTS.`
      };
    }
    if (activeStock.combo === 'caution') {
      return {
        cls: 'caution',
        icon: '⚠️',
        title: 'Hati-hati — UNP Tinggi + L1 SELL',
        desc: `UNP ${activeStock.unp} menunjukkan kondisi langka, namun L1 ${activeStock.l1.toUpperCase()} ${activeStock.l1p}% mengarah ke bawah. Potensi koreksi signifikan.`
      };
    }
    return {
      cls: 'normal',
      icon: '📊',
      title: 'Normal — Tidak Ada Sinyal Kuat',
      desc: `UNP ${activeStock.unp} dan L1 ${activeStock.l1} tidak membentuk kombinasi yang kuat. Skip atau tunggu konfirmasi lebih lanjut.`
    };
  }, [activeStock]);

  const l1BigCls = activeStock.l1 === 'buy' ? 'p' : activeStock.l1 === 'sell' ? 'r' : 'd';

  return (
    <div className="dashboard" id="dash-shell">
      {/* SIDEBAR: LQ45 DUAL SCREENER BOARD */}
      <div className="dash-sidebar">
        <div className="dash-sidebar-header">
          <div className="dash-header-title-box">
            <span className="dash-sidebar-title">LQ45 Dual Screener</span>
            <span className="sidebar-count-badge">{stocks.length} Saham</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="dimmed date-badge">{dateLabel}</span>
            {/* Live/cache indicator */}
            <span
              title={isLive ? 'Data live dari ZUHUT engine' : (error || 'Data cache — API tidak terjangkau')}
              style={{
                width: '7px', height: '7px', borderRadius: '50%',
                backgroundColor: isLive ? 'var(--green, #4ade80)' : 'var(--yellow, #facc15)',
                display: 'inline-block', cursor: 'help',
              }}
            />
            <button
              onClick={refresh}
              disabled={loading}
              title="Refresh data"
              style={{
                background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                color: 'var(--text-3)', fontSize: '12px', padding: '2px 4px',
                opacity: loading ? 0.5 : 1,
              }}
            >
              ↻
            </button>
          </div>
        </div>

        {/* Error notice (subtle, tidak menghalangi UI) */}
        {error && !loading && (
          <div style={{
            fontSize: '10px', color: 'var(--yellow, #facc15)', padding: '6px 12px',
            background: 'rgba(250,204,21,0.08)', borderBottom: '1px solid rgba(250,204,21,0.15)',
          }}>
            ⚠ {error}
          </div>
        )}

        <div className="search-box-wrap">
          <div className="search-input-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="search-icon">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Cari kode / nama saham (BBCA, TLKM)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="sidebar-filter">
          <button
            className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Semua ({stocks.length})
          </button>
          <button
            className={`filter-chip ${filter === 'strong' ? 'active strong-f' : ''}`}
            onClick={() => setFilter('strong')}
          >
            ⚡ Strong
          </button>
          <button
            className={`filter-chip ${filter === 'unp' ? 'active' : ''}`}
            onClick={() => setFilter('unp')}
          >
            UNP Tinggi
          </button>
          <button
            className={`filter-chip ${filter === 'buy' ? 'active l1' : ''}`}
            onClick={() => setFilter('buy')}
          >
            L1 BUY
          </button>
          <button
            className={`filter-chip ${filter === 'sell' ? 'active l1' : ''}`}
            onClick={() => setFilter('sell')}
          >
            L1 SELL
          </button>
        </div>

        <div className="list-col-header">
          <span className="lch-rank">#</span>
          <span className="lch-info">Saham & Harga</span>
          <div className="lch-scores">
            <span className="lch-unp">UNP</span>
            <span className="lch-l1">L1</span>
          </div>
        </div>

        <div className="stock-list">
          {loading && stocks.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
              Memuat data…
            </div>
          ) : filteredStocks.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
              Tidak ada saham yang cocok dengan filter atau pencarian.
            </div>
          ) : (
            filteredStocks.map((s) => {
              const isSelected = s.ticker === activeStock.ticker;
              const l1pillCls = s.l1 === 'buy' ? 'l1-buy' : s.l1 === 'sell' ? 'l1-sell' : 'l1-neu';
              const l1pillTxt = s.l1 === 'buy' ? 'BUY' : s.l1 === 'sell' ? 'SELL' : 'NEU';
              const l1valCls  = s.l1 === 'buy' ? 'p' : s.l1 === 'sell' ? 'r' : 'dim';
              const unpCls    = s.unpL === 'unp' ? 'unp' : 'fam-neu';
              const unpValCls = s.unpL === 'unp' ? 'c' : 'dim';
              const isStockUp = (s.chg || '').startsWith('+');

              return (
                <div
                  key={s.ticker}
                  className={`stock-row ${isSelected ? 'selected' : ''} ${s.l1 === 'buy' ? 'l1-dominant' : ''}`}
                  onClick={() => {
                    onSelectStock(s.ticker);
                    if (onOpenDetail) onOpenDetail(s.ticker);
                    else if (setActiveTab) setActiveTab('deepdive');
                  }}
                >
                  <span className="s-rank">{s.rank}</span>
                  <div className="s-info">
                    <div className="s-ticker-row">
                      <span className="s-ticker">{s.ticker}</span>
                      {s.combo === 'strong' && <span className="s-strong-badge" title="Strong Signal (UNP + L1)">⚡</span>}
                      <span className="s-price-badge">Rp {s.price}</span>
                    </div>
                    <div className="s-name-row">
                      <span className="s-name" title={s.name}>{s.name}</span>
                      <span className={`s-chg-pill ${isStockUp ? 'up' : 'dn'}`}>
                        {isStockUp ? '▲' : '▼'} {s.chg}%
                      </span>
                      <span className="s-open-badge">Detail →</span>
                    </div>
                  </div>
                  <div className="s-dual">
                    <div className={`s-score-pill ${unpCls}`}>
                      <div className="spe-label">UNP</div>
                      <div className={`spe-val ${unpValCls}`}>{s.unp}</div>
                    </div>
                    <div className={`s-score-pill ${l1pillCls}`}>
                      <div className="spe-label">L1</div>
                      <div className={`spe-val ${l1valCls}`}>{l1pillTxt}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DETAIL VIEW: ACTIVE STOCK ANALYSIS */}
      <div className="dash-detail">
        <div className="dash-stock-header">
          <div>
            <div className="dash-ticker-row">
              <span className="dash-main-ticker font-display">{activeStock.ticker}</span>
              {activeStock.combo === 'strong' && (
                <span className="badge badge-strong dash-badge-strong">⚡ Strong Signal</span>
              )}
              {activeStock.combo === 'caution' && (
                <span className="badge badge-caution dash-badge-caution">⚠️ Hati-hati</span>
              )}
            </div>
            <div className="dash-sub-info">
              <span className="dash-company-name">{activeStock.name}</span>
              <span className="dash-dot-sep">·</span>
              <span className="dash-sector-name">{activeStock.sector}</span>
            </div>
          </div>
          <div className="dash-price-box">
            <div className="dash-main-price font-display">Rp {activeStock.price}</div>
            <div className={`dash-price-chg ${isUp ? 'up' : 'dn'}`}>
              <span className="dash-chg-arrow">{isUp ? '▲' : '▼'}</span>
              <span>{activeStock.chg}%</span>
              <span className="dash-chg-sub">Hari ini</span>
            </div>
          </div>
        </div>

        <div className="dual-score-header">
          <div className="dsh-card unp-card">
            <div className="dsh-engine">
              <span className="engine-dot c"></span>
              <span className="dsh-engine-label c">UNP · Screener 1 (Unprecedented Detector)</span>
            </div>
            <div className="dsh-score c">{activeStock.unp}</div>
            <div className="dsh-label">
              {activeStock.unpL === 'unp'
                ? 'Unprecedented (Kondisi Sangat Langka)'
                : activeStock.unpL === 'neu'
                ? 'Neutral (Kondisi Moderat)'
                : 'Familiar (Kondisi Lazim)'}
            </div>
            <div className="dsh-subtext">
              Skor anomali siklus harga · Preseden historis: {activeStock.matches || 27} kali
            </div>
          </div>

          <div className="dsh-card l1-card">
            <div className="dsh-engine">
              <span className="engine-dot p"></span>
              <span className="dsh-engine-label p">L1 · Screener 2 (Phase Resonance L1)</span>
            </div>
            <div className={`dsh-score ${l1BigCls}`}>{activeStock.l1.toUpperCase()}</div>
            <div className="dsh-label">
              {activeStock.l1p}% bias {activeStock.l1 === 'buy' ? 'naik (Bullish)' : activeStock.l1 === 'sell' ? 'turun (Bearish)' : 'netral'}
            </div>
            <div className="dsh-subtext">
              Probabilitas arah resonansi fase · Ambang batas actionable: &ge;65%
            </div>
          </div>
        </div>

        <div className={`verdict-card ${comboVerdict.cls}`}>
          <div className="verdict-icon">{comboVerdict.icon}</div>
          <div className="verdict-body">
            <div className="verdict-title">{comboVerdict.title}</div>
            <div className="verdict-desc">{comboVerdict.desc}</div>
          </div>
        </div>

        <div className="phase-card-box">
          <PhaseActivityChart stock={activeStock} defaultMode="candle" defaultTimeframe="1D" height={290} />
        </div>

        <div className="metrics-row">
          <div className="metric-card">
            <div className="metric-label">UNP Score</div>
            <div className="metric-val" style={{ color: activeStock.unpL === 'unp' ? 'var(--cyan)' : activeStock.unpL === 'neu' ? 'var(--yellow)' : 'var(--text-3)' }}>
              {activeStock.unp}
            </div>
            <div className="metric-sub">Kerapatan Anomali</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">L1 Bias %</div>
            <div className="metric-val" style={{ color: activeStock.l1 === 'buy' ? 'var(--purple)' : activeStock.l1 === 'sell' ? 'var(--red)' : 'var(--text-3)' }}>
              {activeStock.l1p}%
            </div>
            <div className="metric-sub">Akurasi Resonansi</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Freq (tk)</div>
            <div className="metric-val" style={{ color: 'var(--cyan)' }}>{activeStock.freqTk || 15.0}</div>
            <div className="metric-sub">Frekuensi Sinyal</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Historical Matches</div>
            <div className="metric-val">{activeStock.matches || 30}</div>
            <div className="metric-sub">Preseden Historis</div>
          </div>
        </div>

        <div className="interpret-box">
          <div className="interpret-title">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Analisis Singkat Metodologi ZOOHOOTS
          </div>
          <p className="interpret-text">
            <strong>{activeStock.ticker}</strong> — UNP {activeStock.unp} (
            {activeStock.unpL === 'unp'
              ? `kondisi langka, hanya ${activeStock.matches || 27} preseden historis`
              : activeStock.unpL === 'neu'
              ? 'kondisi moderat'
              : 'kondisi lazim/familiar'}
            ). L1 {activeStock.l1.toUpperCase()} dengan bias {activeStock.l1p}%
            {activeStock.l1p >= 65
              ? ' — di atas ambang batas 65%, sinyal arah actionable'
              : ' — di bawah ambang batas, arah belum konfirmasi kuat'}
            . Status Kombinasi: <strong>{activeStock.combo === 'strong' ? 'Strong Signal (UNP Tinggi + L1 BUY)' : activeStock.combo === 'caution' ? 'Hati-hati (UNP Tinggi + L1 SELL)' : 'Normal / Tidak Dominan'}</strong>.
            {!isLive && <span style={{ color: 'var(--text-3)', fontSize: '11px' }}> (data cache)</span>}
          </p>
        </div>

        <button
          className="detail-jump-btn"
          onClick={() => {
            onSelectStock(activeStock.ticker);
            if (onOpenDetail) onOpenDetail(activeStock.ticker);
            else if (setActiveTab) setActiveTab('deepdive');
          }}
        >
          <span>Buka Analisis Detail Lengkap {activeStock.ticker}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </div>
    </div>
  );
}