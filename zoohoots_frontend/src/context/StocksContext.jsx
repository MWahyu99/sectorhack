/**
 * StocksContext.jsx
 * Global context untuk data LQ45 — fetch SATU KALI di App level,
 * di-share ke semua komponen. Tidak ada double fetch, tidak ada race condition.
 *
 * v4: Fix loading stuck setelah StrictMode abort + fix finally block
 * v5: Tambah fetchFlow(ticker) untuk foreign flow + top broker data per ticker
 * v6: Tambah fetchFundamentals(ticker) untuk PE, PBV, Div Yield, Market Cap
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { STOCKS_DATA } from '../data/stocksData';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const FETCH_TIMEOUT = 12000;

// ─── LABEL MAPPING ───────────────────────────────────────────────────────────
function mapUnpLabel(backendLabel) {
  switch (backendLabel) {
    case 'unprecedented': return 'unp';
    case 'rare':          return 'unp';
    case 'uncommon':      return 'neu';
    case 'common':        return 'fam';
    default:              return 'fam';
  }
}

function mapL1(backendBias) {
  if (backendBias === 'buy')  return 'buy';
  if (backendBias === 'sell') return 'sell';
  return 'neu';
}

// ─── FETCH HELPER ─────────────────────────────────────────────────────────────
async function fetchWithTimeout(url, timeout = FETCH_TIMEOUT, signal) {
  const controller = new AbortController();
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ─── TRANSFORM ────────────────────────────────────────────────────────────────
const staticMap = Object.fromEntries(STOCKS_DATA.map((s) => [s.ticker, s]));

function transformScreenItem(item, idx, priceMap) {
  const staticEntry = staticMap[item.ticker] || {};
  const priceEntry  = priceMap[item.ticker]  || null;

  const l1    = mapL1(item.l1_bias);
  const unpL  = mapUnpLabel(item.unp_label);
  const l1p   = Math.round((item.l1_confidence || 0) * 10) / 10;
  const combo = item.combo || staticEntry.combo || 'normal';

  const matches = item.pattern_matches ?? staticEntry.matches ?? 30;
  const freqTk  = staticEntry.freqTk ?? parseFloat((matches / 8.2).toFixed(1));

  const price    = priceEntry?.price    ?? staticEntry.price    ?? '0';
  const rawPrice = priceEntry?.rawPrice ?? staticEntry.rawPrice ?? 0;
  const chg      = priceEntry?.chg      ?? staticEntry.chg      ?? '+0.00';

  return {
    rank:         idx + 1,
    ticker:       item.ticker,
    name:         staticEntry.name    || item.ticker,
    sector:       staticEntry.sector  || '—',
    unp:          Math.round(item.unp_score || 0),
    unpL,
    l1,
    l1p,
    combo,
    price,
    rawPrice,
    chg,
    freqTk,
    matches,
    foreignFlow:  staticEntry.foreignFlow  || '+Rp 0M',
    foreignPct:   staticEntry.foreignPct   || 50,
    domesticFlow: staticEntry.domesticFlow || '+Rp 0M',
    domesticPct:  staticEntry.domesticPct  || 50,
    topBrokers:   staticEntry.topBrokers   || [],
    fundamentals: staticEntry.fundamentals || { pe: 'N/A', pbv: 'N/A', divYield: 'N/A', mktCap: 'N/A' },
    historyMatches: staticEntry.historyMatches || [],
    _raw: item,
  };
}

// ─── CONTEXT ─────────────────────────────────────────────────────────────────
const StocksContext = createContext(null);

export function StocksProvider({ children }) {
  const [stocks, setStocks]           = useState(STOCKS_DATA);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [isLive, setIsLive]           = useState(false);
  const [isPriceLive, setIsPriceLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const abortRef    = useRef(null);
  const fetchingRef = useRef(false);

  // ── Flow cache per ticker ─────────────────────────────────────────────────
  const [flowCache, setFlowCache] = useState({});
  const flowCacheRef = useRef({});

  const fetchFlow = useCallback(async (ticker) => {
    if (!ticker) return;
    const cached = flowCacheRef.current[ticker];
    if (cached?.data && !cached?.loading) return;
    if (cached?.loading) return;

    flowCacheRef.current[ticker] = { ...cached, loading: true };
    setFlowCache((prev) => ({ ...prev, [ticker]: { ...prev[ticker], loading: true } }));

    try {
      const res = await fetch(`${API_BASE}/flow/${ticker}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      flowCacheRef.current[ticker] = { data, loading: false };
      setFlowCache((prev) => ({ ...prev, [ticker]: { data, loading: false } }));
      console.log(`[Flow] ${ticker}: foreignFlow=${data.foreignFlow}, brokers=${data.topBrokers?.length}`);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn(`[Flow] ${ticker} failed:`, err.message);
      }
      const errEntry = { data: null, loading: false, error: err.message };
      flowCacheRef.current[ticker] = errEntry;
      setFlowCache((prev) => ({ ...prev, [ticker]: errEntry }));
    }
  }, []);

  // ── Fundamentals cache per ticker ─────────────────────────────────────────
  const [fundCache, setFundCache] = useState({});
  const fundCacheRef = useRef({});

  const fetchFundamentals = useCallback(async (ticker) => {
    if (!ticker) return;
    const cached = fundCacheRef.current[ticker];
    if (cached?.data && !cached?.loading) return;
    if (cached?.loading) return;

    fundCacheRef.current[ticker] = { ...cached, loading: true };
    setFundCache((prev) => ({ ...prev, [ticker]: { ...prev[ticker], loading: true } }));

    try {
      const res = await fetch(`${API_BASE}/fundamentals/${ticker}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      fundCacheRef.current[ticker] = { data, loading: false };
      setFundCache((prev) => ({ ...prev, [ticker]: { data, loading: false } }));
      console.log(`[Fund] ${ticker}: PE=${data.pe}, PBV=${data.pbv}, Div=${data.divYield}, Cap=${data.mktCap}`);
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn(`[Fund] ${ticker} failed:`, err.message);
      }
      const errEntry = { data: null, loading: false, error: err.message };
      fundCacheRef.current[ticker] = errEntry;
      setFundCache((prev) => ({ ...prev, [ticker]: errEntry }));
    }
  }, []);

  const fetchData = useCallback(async (force = false) => {
    if (fetchingRef.current && !force) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const abortCtrl  = new AbortController();
    abortRef.current = abortCtrl;

    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    let aborted = false;

    try {
      const [screenRes, priceRes] = await Promise.allSettled([
        fetchWithTimeout(`${API_BASE}/screen?limit=50`, FETCH_TIMEOUT, abortCtrl.signal),
        fetchWithTimeout(`${API_BASE}/prices`, 8000, abortCtrl.signal),
      ]);

      if (abortCtrl.signal.aborted) {
        console.log('[Stocks] Aborted after fetch, skipping state update');
        aborted = true;
        return;
      }

      let screenItems = [];
      let screenLive  = false;

      if (screenRes.status === 'fulfilled' && screenRes.value.ok) {
        try {
          const json  = await screenRes.value.json();
          const items = json.results || json;
          if (Array.isArray(items) && items.length > 0) {
            screenItems = items;
            screenLive  = true;
            console.log(`[Stocks] Screen live: ${items.length} items`);
          }
        } catch (e) {
          console.warn('[Stocks] screen JSON parse error:', e);
        }
      } else {
        const msg = screenRes.reason?.message || `HTTP ${screenRes.value?.status}`;
        console.warn('[Stocks] Screener fallback:', msg);
        setError(msg);
      }

      let priceMap  = {};
      let priceLive = false;

      if (priceRes.status === 'fulfilled' && priceRes.value.ok) {
        try {
          const json  = await priceRes.value.json();
          const items = json.results || [];
          if (Array.isArray(items) && items.length > 0) {
            priceMap  = Object.fromEntries(items.map((p) => [p.ticker, p]));
            priceLive = true;
            console.log(`[Stocks] Price live: ${items.length} items`);
            console.log('[Stocks] priceMap sample:', Object.entries(priceMap).slice(0, 3));
          } else {
            console.warn('[Stocks] /prices returned empty array');
          }
        } catch (e) {
          console.warn('[Stocks] price JSON parse error:', e);
        }
      } else {
        const reason = priceRes.reason?.message || `HTTP ${priceRes.value?.status}`;
        console.warn('[Stocks] Price fallback to static, reason:', reason);
      }

      let finalStocks;

      if (screenLive) {
        finalStocks = screenItems
          .map((item, idx) => transformScreenItem(item, idx, priceMap))
          .sort((a, b) => b.unp - a.unp)
          .map((s, idx) => ({ ...s, rank: idx + 1 }));
        setIsLive(true);

        if (priceLive && finalStocks[0]) {
          const s = finalStocks[0];
          console.log('[Stocks] Sample merged:', { ticker: s.ticker, price: s.price, chg: s.chg });
        }
      } else {
        if (priceLive) {
          finalStocks = STOCKS_DATA.map((s) => {
            const p = priceMap[s.ticker];
            return p ? { ...s, price: p.price, rawPrice: p.rawPrice, chg: p.chg } : s;
          });
        } else {
          finalStocks = STOCKS_DATA;
        }
        setIsLive(false);
      }

      setIsPriceLive(priceLive);
      setStocks(finalStocks);
      setLastUpdated(new Date());

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[Stocks] Fetch AbortError');
        aborted = true;
        return;
      }
      console.error('[Stocks] Unexpected error:', err);
      setError(err.message);
    } finally {
      fetchingRef.current = false;
      if (!aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      fetchingRef.current = false;
    };
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return (
    <StocksContext.Provider value={{
      stocks,
      loading,
      error,
      isLive,
      isPriceLive,
      lastUpdated,
      refresh,
      // Flow data per ticker
      flowCache,
      fetchFlow,
      // Fundamentals per ticker
      fundCache,
      fetchFundamentals,
    }}>
      {children}
    </StocksContext.Provider>
  );
}

// ─── HOOKS ───────────────────────────────────────────────────────────────────
export function useStocksData() {
  const ctx = useContext(StocksContext);
  if (!ctx) throw new Error('useStocksData must be used inside <StocksProvider>');
  return ctx;
}

export function useStockDetail(ticker, stocks) {
  return stocks.find((s) => s.ticker === ticker) || stocks[0] || STOCKS_DATA[0];
}