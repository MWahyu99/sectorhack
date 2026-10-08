/**
 * StockTickerTape.jsx
 * Running ticker tape di atas hero — tampilkan semua saham dari live API.
 * Jika stocks prop tidak diberikan, fallback ke STOCKS_DATA statis.
 */

import React, { useRef, useEffect } from 'react';
import { STOCKS_DATA } from '../data/stocksData';

export default function StockTickerTape({ stocks: stocksProp, onOpenStockDetail }) {
  // Gunakan stocks dari prop (live) atau fallback ke static
  const stocks = (stocksProp && stocksProp.length > 0) ? stocksProp : STOCKS_DATA;

  // Duplikasi untuk seamless loop
  const items = [...stocks, ...stocks];

  return (
    <div className="ticker-tape-wrapper" style={{
      width: '100%',
      overflow: 'hidden',
      background: 'var(--surface-1, #0d0d0d)',
      borderBottom: '1px solid var(--border, rgba(255,255,255,0.06))',
      padding: '8px 0',
      position: 'relative',
      zIndex: 10,
    }}>
      <div
        className="ticker-tape-track"
        style={{
          display: 'flex',
          gap: '0',
          animation: `tickerScroll ${Math.max(stocks.length * 3, 30)}s linear infinite`,
          whiteSpace: 'nowrap',
          willChange: 'transform',
        }}
      >
        {items.map((s, idx) => {
          const isUp = typeof s.chg === 'string'
            ? s.chg.startsWith('+')
            : s.chg >= 0;
          const chgDisplay = typeof s.chg === 'string' ? s.chg : (s.chg >= 0 ? `+${s.chg}` : `${s.chg}`);
          const isStrong = s.combo === 'strong';
          const color = isUp ? '#00d4aa' : '#ff4d6d';

          return (
            <span
              key={`${s.ticker}-${idx}`}
              onClick={() => onOpenStockDetail && onOpenStockDetail(s.ticker)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0 18px',
                cursor: onOpenStockDetail ? 'pointer' : 'default',
                fontSize: '12px',
                fontFamily: 'var(--font-mono, monospace)',
                borderRight: '1px solid var(--border, rgba(255,255,255,0.06))',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {isStrong && (
                <span style={{ color: 'var(--cyan, #00d4aa)', fontSize: '10px' }}>⚡</span>
              )}
              <span style={{ color: 'var(--text-1, #fff)', fontWeight: 600 }}>
                {s.ticker}
              </span>
              {s.price && (
                <span style={{ color: 'var(--text-2, rgba(255,255,255,0.7))' }}>
                  Rp {s.price}
                </span>
              )}
              <span style={{ color }}>
                {isUp ? '▲' : '▼'} {chgDisplay}%
              </span>
              {/* UNP score live dari API */}
              {s.unp !== undefined && (
                <span style={{
                  fontSize: '10px',
                  color: s.unpL === 'unp' ? 'var(--cyan, #00d4aa)' : 'var(--text-3, rgba(255,255,255,0.4))',
                  marginLeft: '2px',
                }}>
                  UNP:{s.unp}
                </span>
              )}
            </span>
          );
        })}
      </div>

      {/* Gradient fades kanan-kiri */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: '60px',
        background: 'linear-gradient(90deg, var(--surface-1, #0d0d0d), transparent)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: '60px',
        background: 'linear-gradient(-90deg, var(--surface-1, #0d0d0d), transparent)',
        pointerEvents: 'none',
      }} />

      <style>{`
        @keyframes tickerScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .ticker-tape-track:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}