import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';

/**
 * PhaseActivityChart
 * - Dual Mode: Line Chart & Candlestick Chart (with live toggles)
 * - Multi-Timeframe: 1 Hari (Daily), 1 Minggu (Weekly), 1 Bulan (Monthly)
 * - Interactive: Real-time crosshair, right-axis price badge, bottom date badge,
 *   floating glassmorphism tooltip, live HUD readout, click-to-pin session,
 *   and pronounced, non-flat multi-wave price dynamics.
 */
export default function PhaseActivityChart({
  stock,
  defaultMode = 'candle',
  defaultTimeframe = '1D',
  height = 320
}) {
  const [chartMode, setChartMode] = useState(defaultMode); // 'candle'|'line'|'bar'|'column'
  const [timeframe, setTimeframe] = useState(defaultTimeframe);
  const [hoveredBar, setHoveredBar] = useState(null);
  const [pinnedBar, setPinnedBar] = useState(null);
  const [mousePos, setMousePos] = useState(null);
  const [panOffset, setPanOffset] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChartMenu, setShowChartMenu] = useState(false);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState([]);
  const dragStartXRef = useRef(null);
  const dragStartPanRef = useRef(0);
  const pinchStartDistRef = useRef(null);
  const pinchStartZoomRef = useRef(1.0);
  const chartMenuRef = useRef(null);
  const indicatorMenuRef = useRef(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fullscreenWrapRef = useRef(null);

  // Generate dynamic, realistic, non-flat multi-wave OHLCV data
  const [rawCandles, setRawCandles] = useState([]);

useEffect(() => {
  if (!stock?.ticker) return;
  fetch(`/api/ohlcv/${stock.ticker}`)
    .then(r => r.json())
    .then(d => setRawCandles(d.candles || []))
    .catch(() => setRawCandles([]));
}, [stock?.ticker]);

const barsData = useMemo(() => {
  if (!stock || rawCandles.length === 0) return [];

  const indonesianMonths = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  let sourceData = rawCandles;

  // Agregasi Weekly / Monthly dari daily candles
  if (timeframe === '1W') {
    const weeks = {};
    rawCandles.forEach(c => {
      const d = new Date(c.date);
      // ISO week key: year + week number
      const day = d.getDay() || 7;
      const monday = new Date(d); monday.setDate(d.getDate() - day + 1);
      const key = monday.toISOString().slice(0, 10);
      if (!weeks[key]) weeks[key] = { date: key, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume };
      else {
        weeks[key].high   = Math.max(weeks[key].high, c.high);
        weeks[key].low    = Math.min(weeks[key].low, c.low);
        weeks[key].close  = c.close; // last close in week
        weeks[key].volume += c.volume;
      }
    });
    sourceData = Object.values(weeks).sort((a, b) => a.date.localeCompare(b.date)).slice(-28);
  } else if (timeframe === '1M') {
    const months = {};
    rawCandles.forEach(c => {
      const key = c.date.slice(0, 7); // "YYYY-MM"
      if (!months[key]) months[key] = { date: key + '-01', open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume };
      else {
        months[key].high   = Math.max(months[key].high, c.high);
        months[key].low    = Math.min(months[key].low, c.low);
        months[key].close  = c.close;
        months[key].volume += c.volume;
      }
    });
    sourceData = Object.values(months).sort((a, b) => a.date.localeCompare(b.date)).slice(-18);
  }

  return sourceData.map((c, i) => {
    const d = new Date(c.date);
    let dateLabel, fullDateStr;

    if (timeframe === '1D') {
      dateLabel   = `${d.getDate()} ${indonesianMonths[d.getMonth()]}`;
      fullDateStr = `${d.getDate()} ${indonesianMonths[d.getMonth()]} ${d.getFullYear()}`;
    } else if (timeframe === '1W') {
      const weekNum = Math.min(4, Math.ceil(d.getDate() / 7));
      dateLabel   = `W${weekNum} ${indonesianMonths[d.getMonth()]}`;
      fullDateStr = `Minggu ke-${weekNum} ${indonesianMonths[d.getMonth()]} ${d.getFullYear()}`;
    } else {
      dateLabel   = `${indonesianMonths[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;
      fullDateStr = `${indonesianMonths[d.getMonth()]} ${d.getFullYear()}`;
    }

    const open  = Math.round(c.open  || c.close);
    const high  = Math.round(c.high  || c.close);
    const low   = Math.round(c.low   || c.close);
    const close = Math.round(c.close);
    const isBullish  = close >= open;
    const changePct  = open > 0 ? ((close - open) / open) * 100 : 0;
    const changeRp   = close - open;
    const volume     = (c.volume || 0) / 1_000_000; // juta lot

    // UNP overlay tetap dari stock prop (bukan per-candle dari API)
    const unpVal = Math.min(99, Math.max(25, stock.unp || 50));
    const l1Val  = Math.min(96, Math.max(35, stock.l1p || 60));

    return {
      index: i, date: dateLabel, fullDate: fullDateStr,
      open, high, low, close, volume,
      unpVal, l1Val,
      l1Bias: `${(stock.l1 || 'buy').toUpperCase()} ${l1Val}%`,
      isBullish, changePct, changeRp,
    };
  });
}, [stock, rawCandles, timeframe]);

  // Overall min, max, avg statistics
  const stats = useMemo(() => {
    if (!barsData.length) return { min: 0, max: 0, avgVol: 0, highPrice: 0, lowPrice: 0, highBar: null, lowBar: null };
    let highPrice = -Infinity;
    let lowPrice = Infinity;
    let highBar = null;
    let lowBar = null;
    let sumVol = 0;

    barsData.forEach((b) => {
      if (b.high > highPrice) {
        highPrice = b.high;
        highBar = b;
      }
      if (b.low < lowPrice) {
        lowPrice = b.low;
        lowBar = b;
      }
      sumVol += b.volume;
    });

    const avgVol = (sumVol / (barsData.length || 1)).toFixed(1);
    return { min: lowPrice, max: highPrice, avgVol, highPrice, lowPrice, highBar, lowBar };
  }, [barsData]);

  // Pre-calculate technical indicators: Bollinger Bands, MACD, Slow Stochastic, RSI, PVT
  const indicatorsData = useMemo(() => {
    if (!barsData || barsData.length === 0) return null;
    const n = barsData.length;
    const closes = barsData.map(b => b.close);
    const highs = barsData.map(b => b.high);
    const lows = barsData.map(b => b.low);
    const volumes = barsData.map(b => b.volume);

    // 1. BOLLINGER BANDS (20, 2)
    const bbPeriod = Math.min(20, Math.max(5, n - 2));
    const bbMult = 2;
    const bb = new Array(n);
    for (let i = 0; i < n; i++) {
      const start = Math.max(0, i - bbPeriod + 1);
      const count = i - start + 1;
      let sum = 0;
      for (let j = start; j <= i; j++) sum += closes[j];
      const mid = sum / count;
      let sqSum = 0;
      for (let j = start; j <= i; j++) sqSum += (closes[j] - mid) ** 2;
      const std = Math.sqrt(sqSum / count);
      bb[i] = {
        mid,
        upper: mid + bbMult * std,
        lower: mid - bbMult * std,
        ready: count >= Math.min(4, bbPeriod)
      };
    }

    // 2. MACD (12, 26, 9)
    const calcEMA = (vals, period) => {
      const k = 2 / (period + 1);
      const res = new Array(vals.length);
      let val = vals[0] || 0;
      res[0] = val;
      for (let i = 1; i < vals.length; i++) {
        val = vals[i] * k + val * (1 - k);
        res[i] = val;
      }
      return res;
    };
    const ema12 = calcEMA(closes, 12);
    const ema26 = calcEMA(closes, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const macdSignal = calcEMA(macdLine, 9);
    const macdHist = macdLine.map((m, i) => m - macdSignal[i]);

    // 3. SLOW STOCHASTIC OSCILLATOR (14, 3, 3)
    const stochPeriod = Math.min(14, Math.max(5, n - 2));
    const rawK = new Array(n);
    for (let i = 0; i < n; i++) {
      const start = Math.max(0, i - stochPeriod + 1);
      let lowest = Infinity, highest = -Infinity;
      for (let j = start; j <= i; j++) {
        if (lows[j] < lowest) lowest = lows[j];
        if (highs[j] > highest) highest = highs[j];
      }
      const range = highest - lowest;
      rawK[i] = range === 0 ? 50 : Math.max(0, Math.min(100, ((closes[i] - lowest) / range) * 100));
    }
    const calcSMA = (vals, period) => {
      const res = new Array(vals.length);
      for (let i = 0; i < vals.length; i++) {
        const start = Math.max(0, i - period + 1);
        let s = 0, c = 0;
        for (let j = start; j <= i; j++) { s += vals[j]; c++; }
        res[i] = s / (c || 1);
      }
      return res;
    };
    const slowK = calcSMA(rawK, 3);
    const slowD = calcSMA(slowK, 3);

    // 4. RSI (14)
    const rsiPeriod = Math.min(14, Math.max(5, n - 2));
    const rsi = new Array(n);
    rsi[0] = 50;
    let avgGain = 0, avgLoss = 0;
    for (let i = 1; i < n; i++) {
      const diff = closes[i] - closes[i - 1];
      const g = diff > 0 ? diff : 0;
      const l = diff < 0 ? -diff : 0;
      if (i <= rsiPeriod) {
        avgGain += g;
        avgLoss += l;
        if (i === rsiPeriod) {
          avgGain /= rsiPeriod;
          avgLoss /= rsiPeriod;
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          rsi[i] = 100 - (100 / (1 + rs));
        } else {
          const rs = (avgLoss || 0.001) === 0 ? 100 : avgGain / (avgLoss || 0.001);
          rsi[i] = 100 - (100 / (1 + rs));
        }
      } else {
        avgGain = (avgGain * (rsiPeriod - 1) + g) / rsiPeriod;
        avgLoss = (avgLoss * (rsiPeriod - 1) + l) / rsiPeriod;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi[i] = 100 - (100 / (1 + rs));
      }
    }

    // 5. PRICE VOLUME TREND (PVT)
    const pvt = new Array(n);
    pvt[0] = 0;
    for (let i = 1; i < n; i++) {
      const prevC = closes[i - 1];
      const currC = closes[i];
      const pctChange = prevC === 0 ? 0 : (currC - prevC) / prevC;
      pvt[i] = pvt[i - 1] + (volumes[i] * pctChange);
    }
    const pvtSignal = calcSMA(pvt, 9);

    return {
      bb,
      macd: { line: macdLine, signal: macdSignal, hist: macdHist },
      stoch: { k: slowK, d: slowD },
      rsi,
      pvt: { line: pvt, signal: pvtSignal }
    };
  }, [barsData]);

  // Sub-pane indicators that render as dedicated bottom panels
  const activeSubPanes = useMemo(() =>
    ['macd', 'stochastic', 'rsi', 'pvt'].filter(id => activeIndicators.includes(id)),
    [activeIndicators]
  );
  const subPaneCount = activeSubPanes.length;
  const subPaneH = isFullscreen ? Math.min(85, Math.max(50, Math.floor(220 / (subPaneCount || 1)))) : 60;
  const paneGap = 8;
  const totalSubPaneH = subPaneCount * (subPaneH + paneGap);
  const currentHeight = isFullscreen ? (window.innerHeight - 160) : (height + totalSubPaneH);

  // Canvas drawing routine
  const renderChart = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !barsData.length) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container ? container.getBoundingClientRect() : canvas.getBoundingClientRect();
    const w = Math.max(320, rect.width);

    canvas.width = w * dpr;
    canvas.height = currentHeight * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, currentHeight);

    // Layout margins
    const padTop = 32;
    const padBottom = 34;
    const padLeft = 16;
    const padRight = 78; // Space for right Y-axis price labels
    const chartW = w - padLeft - padRight;
    const chartH = currentHeight - padTop - padBottom;

    // Price scaling with 10% breathing room top and bottom so chart NEVER looks flat
    const pricePadding = (stats.max - stats.min) * 0.10 || 60;
    const minP = stats.min - pricePadding;
    const maxP = stats.max + pricePadding;
    const priceRange = maxP - minP || 1;

    // Volume section takes 36px when sub-panes active, else 20% of chartH
    const volHeight = subPaneCount > 0 ? 36 : chartH * 0.20;
    const priceSectionH = subPaneCount > 0
      ? (isFullscreen ? chartH - totalSubPaneH - volHeight - 16 : height - padTop - padBottom - volHeight - 16)
      : chartH - volHeight - 16;
    const maxVol = Math.max(...barsData.map((b) => b.volume), 1);

    const priceToY = (p) => padTop + priceSectionH - ((p - minP) / priceRange) * priceSectionH;
    const volToH = (v) => (v / maxVol) * volHeight;
    const barCount = barsData.length;
    // zoomLevel > 1 makes candles wider; stepX grows proportionally
    const baseStepX = chartW / (barCount - 1 || 1);
    const stepX = baseStepX * zoomLevel;
    // Pan clamping: left edge = show first bar, right edge = show last bar
    const totalDataW = stepX * (barCount - 1);
    const minPan = -(totalDataW - chartW); // can't scroll past end
    const maxPan = 0;                       // can't scroll before start
    const clampedPan = zoomLevel <= 1
      ? 0
      : Math.max(minPan, Math.min(maxPan, panOffset));
    const barX = (i) => padLeft + i * stepX + clampedPan;

    // 1. Draw horizontal price grid lines and labels
    const gridRows = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(168, 184, 208, 0.75)';
    ctx.font = '11px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let r = 0; r <= gridRows; r++) {
      const p = minP + (priceRange / gridRows) * (gridRows - r);
      const y = padTop + (priceSectionH / gridRows) * r;

      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();

      // Right axis price label
      const labelText = `Rp ${Math.round(p).toLocaleString('id-ID')}`;
      ctx.fillText(labelText, w - padRight + 8, y);
    }

    // 2. UNP Anomaly Zone highlight on recent bars if UNP is high
    if (stock.unp >= 75) {
      const zoneStartIdx = Math.max(0, barCount - Math.round(barCount * 0.25));
      const zx = barX(zoneStartIdx);
      const zw = w - padRight - zx;

      const zg = ctx.createLinearGradient(zx, 0, w - padRight, 0);
      zg.addColorStop(0, 'rgba(0, 212, 255, 0.0)');
      zg.addColorStop(1, 'rgba(0, 212, 255, 0.14)');
      ctx.fillStyle = zg;
      ctx.fillRect(zx, padTop, zw, priceSectionH);

      // Anomaly zone badge
      ctx.fillStyle = '#00D4FF';
      ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('⚡ UNP Anomaly Zone', w - padRight - 10, padTop + 14);
    }

    // ── CLIP: prevent candles/lines from bleeding into Y-axis label area ──
    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, padTop - 4, chartW, chartH + padBottom);
    ctx.clip();

    // 3. Draw Volume Bars at bottom (prominent bar-chart style)
    const volBaseY = subPaneCount > 0 ? (padTop + priceSectionH + 8 + volHeight) : (padTop + chartH);
    const candleWidth = Math.max(4, Math.min(22, stepX * 0.68));
    const volBarW = Math.max(3, candleWidth * 0.85);

    barsData.forEach((b, i) => {
      const bx = barX(i);
      const vh = Math.max(3, volToH(b.volume));
      const vy = volBaseY - vh;
      const bullCol = '#22D3A5';
      const bearCol = '#FF5353';
      const col = b.isBullish ? bullCol : bearCol;

      // Filled bar
      ctx.fillStyle = b.isBullish ? 'rgba(34,211,165,0.55)' : 'rgba(255,83,83,0.55)';
      ctx.fillRect(bx - volBarW / 2, vy, volBarW, vh);
      // Solid top border for crisp bar definition
      ctx.fillStyle = col;
      ctx.fillRect(bx - volBarW / 2, vy, volBarW, Math.min(2, vh));
    });

    // 4. CHART RENDERING: LINE MODE OR CANDLE MODE
    if (chartMode === 'line') {
      // Area Gradient Fill under Price Line
      const areaGrad = ctx.createLinearGradient(0, padTop, 0, padTop + priceSectionH);
      areaGrad.addColorStop(0, 'rgba(0, 212, 255, 0.35)');
      areaGrad.addColorStop(0.7, 'rgba(0, 212, 255, 0.08)');
      areaGrad.addColorStop(1, 'rgba(0, 212, 255, 0.0)');

      ctx.beginPath();
      ctx.moveTo(barX(0), padTop + priceSectionH);
      barsData.forEach((b, i) => {
        ctx.lineTo(barX(i), priceToY(b.close));
      });
      ctx.lineTo(barX(barCount - 1), padTop + priceSectionH);
      ctx.closePath();
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // L1 Secondary Phase Trajectory (Dashed Purple)
      const l1Color = stock.l1 === 'buy' ? 'rgba(168, 130, 255, 0.85)' : 'rgba(255, 83, 83, 0.85)';
      ctx.strokeStyle = l1Color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      barsData.forEach((b, i) => {
        const offset = ((b.unpVal || 50) - 50) * (priceRange * 0.0018);
        const l1Y = priceToY(b.open + offset);
        if (i === 0) ctx.moveTo(barX(i), l1Y);
        else ctx.lineTo(barX(i), l1Y);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Main Neon Price Line
      ctx.strokeStyle = '#00D4FF';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      barsData.forEach((b, i) => {
        const x = barX(i);
        const y = priceToY(b.close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Individual vertex dots on line
      barsData.forEach((b, i) => {
        const x = barX(i);
        const y = priceToY(b.close);
        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#00D4FF';
        ctx.fill();
      });

      // End point glowing radar pulse
      const lastX = barX(barCount - 1);
      const lastY = priceToY(barsData[barCount - 1].close);

      const radGlow = ctx.createRadialGradient(lastX, lastY, 0, lastX, lastY, 16);
      radGlow.addColorStop(0, 'rgba(0, 212, 255, 0.8)');
      radGlow.addColorStop(1, 'rgba(0, 212, 255, 0.0)');
      ctx.beginPath();
      ctx.arc(lastX, lastY, 16, 0, Math.PI * 2);
      ctx.fillStyle = radGlow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#00D4FF';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else if (chartMode === 'bar') {
      // OHLC BAR MODE
      ctx.strokeStyle = 'rgba(168, 130, 255, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      barsData.forEach((b, i) => {
        const typical = (b.high + b.low + b.close) / 3;
        if (i === 0) ctx.moveTo(barX(i), priceToY(typical));
        else ctx.lineTo(barX(i), priceToY(typical));
      });
      ctx.stroke();
      ctx.setLineDash([]);
      barsData.forEach((b, i) => {
        const bx = barX(i);
        const highY = priceToY(b.high);
        const lowY = priceToY(b.low);
        const openY = priceToY(b.open);
        const closeY = priceToY(b.close);
        const col = b.isBullish ? '#22D3A5' : '#FF5353';
        const tick = Math.max(3, stepX * 0.28);
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(bx, highY); ctx.lineTo(bx, lowY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx - tick, openY); ctx.lineTo(bx, openY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx, closeY); ctx.lineTo(bx + tick, closeY); ctx.stroke();
      });
    } else if (chartMode === 'column') {
      // COLUMN MODE
      barsData.forEach((b, i) => {
        const bx = barX(i);
        const closeY = priceToY(b.close);
        const baseY = priceToY(minP);
        const colW = Math.max(3, stepX * 0.6);
        const grad = ctx.createLinearGradient(0, closeY, 0, baseY);
        grad.addColorStop(0, b.isBullish ? 'rgba(34,211,165,0.85)' : 'rgba(255,83,83,0.85)');
        grad.addColorStop(1, b.isBullish ? 'rgba(34,211,165,0.06)' : 'rgba(255,83,83,0.06)');
        ctx.fillStyle = grad;
        ctx.fillRect(bx - colW / 2, closeY, colW, baseY - closeY);
        ctx.strokeStyle = b.isBullish ? '#22D3A5' : '#FF5353';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(bx - colW / 2, closeY, colW, baseY - closeY);
      });
      ctx.strokeStyle = '#00D4FF';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      barsData.forEach((b, i) => {
        const x = barX(i); const y = priceToY(b.close);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    } else {
      // CANDLESTICK MODE
      // Phase Resonance Moving Line Overlay (Dashed Lilac Curve)
      ctx.strokeStyle = 'rgba(168, 130, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      barsData.forEach((b, i) => {
        const typical = (b.high + b.low + b.close) / 3;
        const cy = priceToY(typical);
        if (i === 0) ctx.moveTo(barX(i), cy);
        else ctx.lineTo(barX(i), cy);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Render Candlesticks
      barsData.forEach((b, i) => {
        const bx = barX(i);
        const highY = priceToY(b.high);
        const lowY = priceToY(b.low);
        const openY = priceToY(b.open);
        const closeY = priceToY(b.close);

        const bullColor = '#22D3A5'; // Rich Emerald Bullish
        const bearColor = '#FF5353'; // Vibrant Crimson Bearish
        const candleColor = b.isBullish ? bullColor : bearColor;

        // Upper & Lower Wicks (Shadows)
        ctx.strokeStyle = candleColor;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(bx, highY);
        ctx.lineTo(bx, lowY);
        ctx.stroke();

        // Candlestick Solid Body
        const bodyTop = Math.min(openY, closeY);
        const bodyH = Math.max(4, Math.abs(closeY - openY));
        const bodyW = candleWidth;

        ctx.fillStyle = candleColor;
        ctx.fillRect(bx - bodyW / 2, bodyTop, bodyW, bodyH);

        // Subtle dark border for ultra-crisp visual definition
        ctx.strokeStyle = 'rgba(5, 8, 16, 0.5)';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(bx - bodyW / 2, bodyTop, bodyW, bodyH);
      });
    }

    // High & Low Callout Badges on Chart
    if (stats.highBar && stats.lowBar) {
      const hx = barX(stats.highBar.index);
      const hy = priceToY(stats.highBar.high);
      ctx.fillStyle = '#22D3A5';
      ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`▲ H: Rp ${stats.highPrice.toLocaleString('id-ID')}`, hx + 6, hy - 4);

      const lx = barX(stats.lowBar.index);
      const ly = priceToY(stats.lowBar.low);
      ctx.fillStyle = '#FF5353';
      ctx.fillText(`▼ L: Rp ${stats.lowPrice.toLocaleString('id-ID')}`, lx + 6, ly + 14);
    }

    // ── TECHNICAL INDICATORS ──
    const activeTargetBar = hoveredBar || pinnedBar;
    const activeIdx = activeTargetBar ? activeTargetBar.index : barCount - 1;

    // 1. BOLLINGER BANDS (20, 2) OVERLAY ON PRICE SECTION
    if (activeIndicators.includes('bollinger') && indicatorsData?.bb) {
      const { bb } = indicatorsData;

      // Shaded ribbon between upper and lower bands
      ctx.fillStyle = 'rgba(255, 193, 7, 0.08)';
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < barCount; i++) {
        if (!bb[i]?.ready) continue;
        const x = barX(i);
        const y = priceToY(bb[i].upper);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      for (let i = barCount - 1; i >= 0; i--) {
        if (!bb[i]?.ready) continue;
        const x = barX(i);
        const y = priceToY(bb[i].lower);
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      // Upper band (Dashed amber)
      ctx.strokeStyle = 'rgba(255, 193, 7, 0.8)';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      started = false;
      for (let i = 0; i < barCount; i++) {
        if (!bb[i]?.ready) continue;
        const x = barX(i);
        const y = priceToY(bb[i].upper);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Lower band (Dashed amber)
      ctx.beginPath();
      started = false;
      for (let i = 0; i < barCount; i++) {
        if (!bb[i]?.ready) continue;
        const x = barX(i);
        const y = priceToY(bb[i].lower);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Middle SMA Band (Solid gold)
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      started = false;
      for (let i = 0; i < barCount; i++) {
        if (!bb[i]?.ready) continue;
        const x = barX(i);
        const y = priceToY(bb[i].mid);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // In-chart Live HUD for Bollinger Bands
      const curBB = bb[activeIdx] || bb[barCount - 1];
      if (curBB) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.95)';
        ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(
          `BB (20, 2) · U: Rp ${Math.round(curBB.upper).toLocaleString('id-ID')} | M: Rp ${Math.round(curBB.mid).toLocaleString('id-ID')} | L: Rp ${Math.round(curBB.lower).toLocaleString('id-ID')}`,
          padLeft + 8,
          padTop + 14
        );
      }
    }

    // 2. SUB-PANES (MACD, SLOW STOCHASTIC, RSI, PVT)
    if (subPaneCount > 0) {
      activeSubPanes.forEach((paneId, k) => {
        const pTop = volBaseY + 8 + k * (subPaneH + paneGap);
        const pHeight = subPaneH;

        // Pane background & subtle border
        ctx.fillStyle = 'rgba(10, 15, 28, 0.7)';
        ctx.fillRect(padLeft, pTop, chartW, pHeight);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(padLeft, pTop, chartW, pHeight);

        // A. MACD (12, 26, 9)
        if (paneId === 'macd' && indicatorsData?.macd) {
          const { line, signal, hist } = indicatorsData.macd;
          const maxVal = Math.max(...hist.map(Math.abs), ...line.map(Math.abs), ...signal.map(Math.abs), 0.1) * 1.15;
          const mY = (v) => pTop + pHeight / 2 - (v / maxVal) * (pHeight / 2 - 6);
          const zeroY = pTop + pHeight / 2;

          // Zero baseline
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(padLeft, zeroY); ctx.lineTo(padLeft + chartW, zeroY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Histogram bars
          const histW = Math.max(2, Math.min(10, candleWidth * 0.65));
          for (let i = 0; i < barCount; i++) {
            const bx = barX(i);
            const hVal = hist[i] || 0;
            const hy = mY(hVal);
            const isRising = i === 0 || hVal >= (hist[i - 1] || 0);
            if (hVal >= 0) {
              ctx.fillStyle = isRising ? '#22D3A5' : 'rgba(34, 211, 165, 0.55)';
              ctx.fillRect(bx - histW / 2, hy, histW, Math.max(1, zeroY - hy));
            } else {
              ctx.fillStyle = isRising ? 'rgba(255, 83, 83, 0.55)' : '#FF5353';
              ctx.fillRect(bx - histW / 2, zeroY, histW, Math.max(1, hy - zeroY));
            }
          }

          // MACD Line (Neon Cyan)
          ctx.strokeStyle = '#00D4FF';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          for (let i = 0; i < barCount; i++) {
            const bx = barX(i); const by = mY(line[i]);
            if (i === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
          }
          ctx.stroke();

          // Signal Line (Amber dashed)
          ctx.strokeStyle = '#FF9800';
          ctx.lineWidth = 1.4;
          ctx.setLineDash([3, 2]);
          ctx.beginPath();
          for (let i = 0; i < barCount; i++) {
            const bx = barX(i); const by = mY(signal[i]);
            if (i === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          // Active crosshair marker dot
          if (activeTargetBar) {
            const hx = barX(activeIdx);
            const hy = mY(line[activeIdx]);
            ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#00D4FF'; ctx.fill();
          }

          // Header label
          const curM = line[activeIdx] ?? 0;
          const curS = signal[activeIdx] ?? 0;
          const curH = hist[activeIdx] ?? 0;
          ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillStyle = '#A8B8D0';
          ctx.fillText('MACD (12, 26, 9)', padLeft + 6, pTop + 4);
          ctx.fillStyle = '#00D4FF';
          ctx.fillText(`MACD: ${curM.toFixed(1)}`, padLeft + 104, pTop + 4);
          ctx.fillStyle = '#FF9800';
          ctx.fillText(`Signal: ${curS.toFixed(1)}`, padLeft + 180, pTop + 4);
          ctx.fillStyle = curH >= 0 ? '#22D3A5' : '#FF5353';
          ctx.fillText(`Hist: ${curH >= 0 ? '+' : ''}${curH.toFixed(1)}`, padLeft + 258, pTop + 4);
        }

        // B. SLOW STOCHASTIC OSCILLATOR (14, 3, 3)
        else if (paneId === 'stochastic' && indicatorsData?.stoch) {
          const { k: stochK, d: stochD } = indicatorsData.stoch;
          const stochY = (v) => pTop + pHeight - (v / 100) * (pHeight - 8) - 4;

          // 20-80 band fill
          ctx.fillStyle = 'rgba(168, 130, 255, 0.06)';
          ctx.fillRect(padLeft, stochY(80), chartW, stochY(20) - stochY(80));

          // Dotted lines at 80 and 20
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          [80, 20].forEach(lv => {
            ctx.strokeStyle = lv === 80 ? 'rgba(255, 83, 83, 0.4)' : 'rgba(34, 211, 165, 0.4)';
            ctx.beginPath(); ctx.moveTo(padLeft, stochY(lv)); ctx.lineTo(padLeft + chartW, stochY(lv)); ctx.stroke();
          });
          ctx.setLineDash([]);

          // Slow %K line (Cyan)
          ctx.strokeStyle = '#00E5FF';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          for (let i = 0; i < barCount; i++) {
            const bx = barX(i); const by = stochY(stochK[i]);
            if (i === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
          }
          ctx.stroke();

          // Slow %D line (Magenta dashed)
          ctx.strokeStyle = '#E040FB';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 2]);
          ctx.beginPath();
          for (let i = 0; i < barCount; i++) {
            const bx = barX(i); const by = stochY(stochD[i]);
            if (i === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          // Active crosshair marker dot
          if (activeTargetBar) {
            const hx = barX(activeIdx);
            const hy = stochY(stochK[activeIdx]);
            ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#00E5FF'; ctx.fill();
          }

          // Header label
          const curK = stochK[activeIdx] ?? 50;
          const curD = stochD[activeIdx] ?? 50;
          ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillStyle = '#A8B8D0';
          ctx.fillText('Slow Stochastic (14, 3, 3)', padLeft + 6, pTop + 4);
          ctx.fillStyle = '#00E5FF';
          ctx.fillText(`%K: ${curK.toFixed(1)}`, padLeft + 154, pTop + 4);
          ctx.fillStyle = '#E040FB';
          ctx.fillText(`%D: ${curD.toFixed(1)}`, padLeft + 214, pTop + 4);
        }

        // C. RSI (14)
        else if (paneId === 'rsi' && indicatorsData?.rsi) {
          const rsi = indicatorsData.rsi;
          const rsiY = (v) => pTop + pHeight - (v / 100) * (pHeight - 8) - 4;

          // 30-70 band fill
          ctx.fillStyle = 'rgba(224, 64, 251, 0.05)';
          ctx.fillRect(padLeft, rsiY(70), chartW, rsiY(30) - rsiY(70));

          // Dotted lines at 70, 50, 30
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 2]);
          [70, 50, 30].forEach(lv => {
            ctx.strokeStyle = lv === 70 ? 'rgba(255, 83, 83, 0.35)' : lv === 30 ? 'rgba(34, 211, 165, 0.35)' : 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath(); ctx.moveTo(padLeft, rsiY(lv)); ctx.lineTo(padLeft + chartW, rsiY(lv)); ctx.stroke();
          });
          ctx.setLineDash([]);

          // RSI line (Neon purple)
          ctx.strokeStyle = '#E040FB';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          for (let i = 0; i < barCount; i++) {
            const bx = barX(i); const by = rsiY(rsi[i]);
            if (i === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
          }
          ctx.stroke();

          // Active crosshair marker dot
          if (activeTargetBar) {
            const hx = barX(activeIdx);
            const hy = rsiY(rsi[activeIdx]);
            ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#E040FB'; ctx.fill();
          }

          // Header label
          const curRSI = rsi[activeIdx] ?? 50;
          ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillStyle = '#A8B8D0';
          ctx.fillText('RSI (14)', padLeft + 6, pTop + 4);
          const rsiColor = curRSI >= 70 ? '#FF5353' : curRSI <= 30 ? '#22D3A5' : '#E040FB';
          ctx.fillStyle = rsiColor;
          ctx.fillText(`RSI: ${curRSI.toFixed(1)} ${curRSI >= 70 ? '(Overbought)' : curRSI <= 30 ? '(Oversold)' : ''}`, padLeft + 60, pTop + 4);
        }

        // D. PRICE VOLUME TREND (PVT)
        else if (paneId === 'pvt' && indicatorsData?.pvt) {
          const { line: pvtLine, signal: pvtSig } = indicatorsData.pvt;
          const minPVT = Math.min(...pvtLine, ...pvtSig);
          const maxPVT = Math.max(...pvtLine, ...pvtSig);
          const pvtRange = (maxPVT - minPVT) || 1;
          const pvtY = (v) => pTop + pHeight - ((v - minPVT) / pvtRange) * (pHeight - 12) - 6;
          const hasZero = minPVT <= 0 && maxPVT >= 0;
          const zeroY = hasZero ? pvtY(0) : null;

          if (zeroY) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.moveTo(padLeft, zeroY); ctx.lineTo(padLeft + chartW, zeroY); ctx.stroke();
            ctx.setLineDash([]);
          }

          // PVT line (Sky blue)
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          for (let i = 0; i < barCount; i++) {
            const bx = barX(i); const by = pvtY(pvtLine[i]);
            if (i === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
          }
          ctx.stroke();

          // Signal line (Amber dashed)
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 1.4;
          ctx.setLineDash([3, 2]);
          ctx.beginPath();
          for (let i = 0; i < barCount; i++) {
            const bx = barX(i); const by = pvtY(pvtSig[i]);
            if (i === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          // Active crosshair marker dot
          if (activeTargetBar) {
            const hx = barX(activeIdx);
            const hy = pvtY(pvtLine[activeIdx]);
            ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = '#38BDF8'; ctx.fill();
          }

          // Header label
          const curP = pvtLine[activeIdx] ?? 0;
          const curSig = pvtSig[activeIdx] ?? 0;
          ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillStyle = '#A8B8D0';
          ctx.fillText('Price Volume Trends (PVT)', padLeft + 6, pTop + 4);
          ctx.fillStyle = '#38BDF8';
          ctx.fillText(`PVT: ${(curP >= 0 ? '+' : '')}${curP.toFixed(2)}M`, padLeft + 158, pTop + 4);
          ctx.fillStyle = '#F59E0B';
          ctx.fillText(`Signal: ${(curSig >= 0 ? '+' : '')}${curSig.toFixed(2)}M`, padLeft + 260, pTop + 4);
        }
      });
    }

    // ── END CLIP ──
    ctx.restore();

    // 5. Draw Right-Axis Indicator Labels
    if (subPaneCount > 0) {
      ctx.font = '9px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      activeSubPanes.forEach((paneId, k) => {
        const pTop = volBaseY + 8 + k * (subPaneH + paneGap);
        const pHeight = subPaneH;

        if (paneId === 'macd') {
          const zeroY = pTop + pHeight / 2;
          ctx.fillStyle = 'rgba(168, 184, 208, 0.7)';
          ctx.fillText('0.0', w - padRight + 8, zeroY);
        } else if (paneId === 'stochastic') {
          const stochY = (v) => pTop + pHeight - (v / 100) * (pHeight - 8) - 4;
          ctx.fillStyle = '#FF5353'; ctx.fillText('80', w - padRight + 8, stochY(80));
          ctx.fillStyle = '#22D3A5'; ctx.fillText('20', w - padRight + 8, stochY(20));
        } else if (paneId === 'rsi') {
          const rsiY = (v) => pTop + pHeight - (v / 100) * (pHeight - 8) - 4;
          ctx.fillStyle = '#FF5353'; ctx.fillText('70', w - padRight + 8, rsiY(70));
          ctx.fillStyle = '#22D3A5'; ctx.fillText('30', w - padRight + 8, rsiY(30));
        } else if (paneId === 'pvt' && indicatorsData?.pvt) {
          const { line: pvtLine, signal: pvtSig } = indicatorsData.pvt;
          const minPVT = Math.min(...pvtLine, ...pvtSig);
          const maxPVT = Math.max(...pvtLine, ...pvtSig);
          const pvtRange = (maxPVT - minPVT) || 1;
          const pvtY = (v) => pTop + pHeight - ((v - minPVT) / pvtRange) * (pHeight - 12) - 6;
          if (minPVT <= 0 && maxPVT >= 0) {
            ctx.fillStyle = 'rgba(168, 184, 208, 0.7)';
            ctx.fillText('0.0', w - padRight + 8, pvtY(0));
          }
        }
      });
    }

    // 6. Draw X-axis Dates
    ctx.fillStyle = 'rgba(168, 184, 208, 0.75)';
    ctx.font = '11px "Plus Jakarta Sans", "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const dateStep = Math.max(1, Math.floor(barCount / 6));
    for (let i = 0; i < barCount; i += dateStep) {
      const bx = barX(i);
      ctx.fillText(barsData[i].date, bx, padTop + chartH + 8);
    }
    // Always render last date
    if ((barCount - 1) % dateStep !== 0) {
      ctx.fillText(barsData[barCount - 1].date, barX(barCount - 1), padTop + chartH + 8);
    }

    // 7. Draw interactive crosshair if hovered or pinned
    if (activeTargetBar) {
      const hx = barX(activeTargetBar.index);
      const hy = priceToY(activeTargetBar.close);

      // Vertical guide line across full chart including sub-panes
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.65)';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(hx, padTop);
      ctx.lineTo(hx, padTop + chartH);
      ctx.stroke();

      // Horizontal price line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.moveTo(padLeft, hy);
      ctx.lineTo(w - padRight, hy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Active price pill on right scale
      const pillText = `Rp ${activeTargetBar.close.toLocaleString('id-ID')}`;
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      const textW = ctx.measureText(pillText).width;
      const pillX = w - padRight + 4;
      const pillY = hy - 11;

      ctx.fillStyle = activeTargetBar.isBullish ? '#22D3A5' : '#FF5353';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, textW + 10, 22, 4);
      ctx.fill();

      ctx.fillStyle = '#050810';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(pillText, pillX + 5, hy);

      // Dot on active target point
      ctx.beginPath();
      ctx.arc(hx, hy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = activeTargetBar.isBullish ? '#22D3A5' : '#FF5353';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }, [barsData, chartMode, height, currentHeight, hoveredBar, pinnedBar, stats, stock, panOffset, zoomLevel, isFullscreen, activeIndicators, indicatorsData, activeSubPanes, subPaneCount]);

  // ResizeObserver for crystal clear auto-responsive rendering
  useEffect(() => {
    renderChart();
    const container = containerRef.current;
    if (!container) return;

    let ro;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => {
        renderChart();
      });
      ro.observe(container);
    } else {
      const handleResize = () => renderChart();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }

    return () => {
      if (ro) ro.disconnect();
    };
  }, [renderChart]);

  // Close chart type / indicator menu when clicking outside
  useEffect(() => {
    if (!showChartMenu && !showIndicatorMenu) return;
    const handler = (e) => {
      if (showChartMenu && chartMenuRef.current && !chartMenuRef.current.contains(e.target)) {
        setShowChartMenu(false);
      }
      if (showIndicatorMenu && indicatorMenuRef.current && !indicatorMenuRef.current.contains(e.target)) {
        setShowIndicatorMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showChartMenu, showIndicatorMenu]);

  // Toggle indicator
  const toggleIndicator = (id) => {
    setActiveIndicators(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // ── PAN / DRAG HANDLERS ──

  const handleDragStart = (clientX) => {
    setIsDragging(true);
    dragStartXRef.current = clientX;
    dragStartPanRef.current = panOffset;
  };

  const handleDragMove = (clientX) => {
    if (!isDragging || dragStartXRef.current === null) return;
    const delta = clientX - dragStartXRef.current;
    setPanOffset(dragStartPanRef.current + delta);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    dragStartXRef.current = null;
  };

  // ── ZOOM HELPERS ──
  // Zoom centered on a given canvas-X position
  const applyZoom = useCallback((newZoom, pivotCanvasX) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const padLeft = 16;
    const padRight = 78;
    const chartW = rect.width - padLeft - padRight;
    const barCount = barsData.length;
    const oldStepX = (chartW / (barCount - 1 || 1)) * zoomLevel;
    const newStepX = (chartW / (barCount - 1 || 1)) * newZoom;
    // Keep the pivot point stationary: adjust pan so the bar under cursor stays
    const pivotOffsetInChart = (pivotCanvasX - padLeft);
    const newPan = panOffset - (pivotOffsetInChart / oldStepX) * (newStepX - oldStepX);
    setZoomLevel(newZoom);
    setPanOffset(newPan);
  }, [zoomLevel, panOffset, barsData.length]);

  // ── MOUSE WHEEL ZOOM ──
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newZoom = Math.max(1.0, Math.min(10.0, zoomLevel * zoomFactor));
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    applyZoom(newZoom, e.clientX - rect.left);
  }, [applyZoom, zoomLevel]);

  // Attach wheel with passive:false so we can preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── HOVER / CROSSHAIR INTERACTION (only when not dragging) ──
  const handlePointerInteraction = (clientX, clientY) => {
    if (isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas || !barsData.length) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const padLeft = 16;
    const padRight = 78;
    const chartW = rect.width - padLeft - padRight;
    const barCount = barsData.length;
    const stepX = (chartW / (barCount - 1 || 1)) * zoomLevel;
    const totalDataW = stepX * (barCount - 1);
    const minPan = -(totalDataW - chartW);
    const clampedPan = zoomLevel <= 1 ? 0 : Math.max(minPan, Math.min(0, panOffset));

    const rawIdx = Math.round((x - padLeft - clampedPan) / stepX);
    const clampedIdx = Math.max(0, Math.min(barCount - 1, rawIdx));

    setHoveredBar(barsData[clampedIdx]);
    setMousePos({ x, y });
  };

  const handleMouseDown = (e) => {
    handleDragStart(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      handleDragMove(e.clientX);
    } else {
      handlePointerInteraction(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => handleDragEnd();

  // ── TOUCH: SINGLE-FINGER PAN, TWO-FINGER PINCH ZOOM ──
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      handleDragStart(e.touches[0].clientX);
    } else if (e.touches.length === 2) {
      handleDragEnd();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = zoomLevel;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1) {
      if (isDragging) handleDragMove(e.touches[0].clientX);
      else handlePointerInteraction(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2 && pinchStartDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / pinchStartDistRef.current;
      const newZoom = Math.max(1.0, Math.min(10.0, pinchStartZoomRef.current * scale));
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        applyZoom(newZoom, midX - rect.left);
      }
    }
  };

  const handleTouchEnd = () => {
    handleDragEnd();
    pinchStartDistRef.current = null;
  };

  const handleMouseLeave = () => {
    handleDragEnd();
    setHoveredBar(null);
    setMousePos(null);
  };

  const handleCanvasClick = () => {
    if (!isDragging && hoveredBar) {
      setPinnedBar(pinnedBar?.index === hoveredBar.index ? null : hoveredBar);
    }
  };

  // ── FULLSCREEN TOGGLE ──
  const handleFullscreen = () => {
    const el = fullscreenWrapRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const onFSChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  // Reset zoom + pan when timeframe/stock changes
  useEffect(() => {
    setZoomLevel(1.0);
    setPanOffset(0);
  }, [timeframe, stock]);

  const activeDisplayBar = hoveredBar || pinnedBar || barsData[barsData.length - 1];
  const isUp = activeDisplayBar?.close >= activeDisplayBar?.open;

  return (
    <div
      className={`phase-activity-wrapper${isFullscreen ? ' pac-fullscreen' : ''}`}
      ref={(el) => { containerRef.current = el; fullscreenWrapRef.current = el; }}
    >
       {rawCandles.length === 0 && (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3, #aaa)' }}>
        Memuat data OHLCV...
      </div>
    )}
      {/* ── HEADER CONTROLS TOOLBAR ── */}
      <div className="phase-act-header">
        <div className="phase-act-title-area">
          <div className="phase-act-main-title">
            <span className="card-title-dot pulse-dot"></span>
            <span className="font-display">Phase Activity Chart</span>
            <span className="stock-ticker-pill">{stock.ticker}</span>
          </div>
          <div className="phase-act-subtitle">
            {timeframe === '1D' && 'Daily Cycle · 35 Sesi Perdagangan Terakhir'}
            {timeframe === '1W' && 'Weekly Swing · 28 Minggu (Multi-Bulan)'}
            {timeframe === '1M' && 'Monthly Macro Phase · 18 Bulan (Multi-Tahun)'}
          </div>
        </div>

        <div className="phase-act-controls">
          {/* CHART TYPE DROPDOWN (TradingView style) */}
          <div className="chart-type-dropdown" ref={chartMenuRef}>
            <button
              className="chart-type-btn"
              onClick={() => setShowChartMenu((v) => !v)}
              title="Pilih Tipe Chart"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                {chartMode === 'line'   && <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />}
                {chartMode === 'candle' && (<><line x1="9" y1="2" x2="9" y2="6"/><rect x="6" y="6" width="6" height="12" rx="1" fill="currentColor"/><line x1="9" y1="18" x2="9" y2="22"/><line x1="17" y1="4" x2="17" y2="9"/><rect x="14" y="9" width="6" height="7" rx="1" fill="currentColor"/><line x1="17" y1="16" x2="17" y2="20"/></>)}
                {chartMode === 'bar'    && (<><line x1="12" y1="2" x2="12" y2="22"/><line x1="4" y1="7" x2="12" y2="7"/><line x1="12" y1="17" x2="20" y2="17"/></>)}
                {chartMode === 'column' && (<><rect x="3" y="12" width="4" height="10" rx="1" fill="currentColor"/><rect x="10" y="6" width="4" height="16" rx="1" fill="currentColor"/><rect x="17" y="9" width="4" height="13" rx="1" fill="currentColor"/></>)}
              </svg>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            {showChartMenu && (
              <div className="chart-type-menu">
                {[
                  { id: 'bar',    label: 'Bar',    icon: <><line x1="12" y1="2" x2="12" y2="22"/><line x1="4" y1="7" x2="12" y2="7"/><line x1="12" y1="17" x2="20" y2="17"/></> },
                  { id: 'line',   label: 'Line',   icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /> },
                  { id: 'candle', label: 'Candle', icon: <><line x1="9" y1="2" x2="9" y2="6"/><rect x="6" y="6" width="6" height="12" rx="1" fill="currentColor"/><line x1="9" y1="18" x2="9" y2="22"/><line x1="17" y1="4" x2="17" y2="9"/><rect x="14" y="9" width="6" height="7" rx="1" fill="currentColor"/><line x1="17" y1="16" x2="17" y2="20"/></> },
                  { id: 'column', label: 'Column', icon: <><rect x="3" y="12" width="4" height="10" rx="1" fill="currentColor"/><rect x="10" y="6" width="4" height="16" rx="1" fill="currentColor"/><rect x="17" y="9" width="4" height="13" rx="1" fill="currentColor"/></> },
                ].map(({ id, label, icon }) => (
                  <button
                    key={id}
                    className={`chart-type-item${chartMode === id ? ' active' : ''}`}
                    onClick={() => { setChartMode(id); setShowChartMenu(false); }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      {icon}
                    </svg>
                    {label}
                    {chartMode === id && <span className="ctm-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INDICATORS DROPDOWN */}
          <div className="chart-type-dropdown" ref={indicatorMenuRef}>
            <button
              className={`chart-type-btn${activeIndicators.length > 0 ? ' has-active' : ''}`}
              onClick={() => setShowIndicatorMenu((v) => !v)}
              title="Indikator Teknikal"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              <span style={{ fontSize: '11px', fontWeight: 600 }}>Indicators</span>
              {activeIndicators.length > 0 && (
                <span className="indicator-count">{activeIndicators.length}</span>
              )}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            {showIndicatorMenu && (
              <div className="chart-type-menu indicator-menu">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px 6px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', fontWeight: 700 }}>
                    Indikator ({activeIndicators.length}/5)
                  </span>
                  {activeIndicators.length > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setActiveIndicators([]); }}
                      style={{ background: 'none', border: 'none', color: 'var(--cyan)', fontSize: '10px', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                    >
                      Reset
                    </button>
                  )}
                </div>
                {[
                  { id: 'bollinger',  label: 'Bollinger Bands' },
                  { id: 'macd',       label: 'MACD' },
                  { id: 'stochastic', label: 'Slow Stochastic Oscillator' },
                  { id: 'rsi',        label: 'RSI' },
                  { id: 'pvt',        label: 'Price Volume Trends' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    className={`chart-type-item${activeIndicators.includes(id) ? ' active' : ''}`}
                    onClick={() => toggleIndicator(id)}
                  >
                    <span className={`ind-dot${activeIndicators.includes(id) ? ' on' : ''}`} />
                    <span>{label}</span>
                    {activeIndicators.includes(id) && <span className="ctm-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>


          {/* MULTI TIMEFRAME SELECTOR */}
          <div className="phase-tf-group" role="group" aria-label="Pilih Timeframe">
            <button
              className={`tf-pill-btn ${timeframe === '1D' ? 'active' : ''}`}
              onClick={() => setTimeframe('1D')}
              title="Timeframe 1 Hari (Daily Sesi)"
            >
              <span className="tf-short">1H</span>
              <span className="tf-full">1 Hari (Daily)</span>
            </button>
            <button
              className={`tf-pill-btn ${timeframe === '1W' ? 'active' : ''}`}
              onClick={() => setTimeframe('1W')}
              title="Timeframe 1 Minggu (Weekly Swing)"
            >
              <span className="tf-short">1M</span>
              <span className="tf-full">1 Minggu (Weekly)</span>
            </button>
            <button
              className={`tf-pill-btn ${timeframe === '1M' ? 'active' : ''}`}
              onClick={() => setTimeframe('1M')}
              title="Timeframe 1 Bulan (Monthly Macro)"
            >
              <span className="tf-short">1B</span>
              <span className="tf-full">1 Bulan (Monthly)</span>
            </button>
          </div>

          {/* FULLSCREEN BUTTON */}
          <button
            className="chart-fullscreen-btn"
            onClick={handleFullscreen}
            title={isFullscreen ? 'Keluar Fullscreen' : 'Tampilkan Chart Fullscreen'}
            aria-label={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen Chart'}
          >
            {isFullscreen ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="8 3 3 3 3 8"></polyline>
                <line x1="3" y1="3" x2="10" y2="10"></line>
                <polyline points="16 3 21 3 21 8"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <polyline points="8 21 3 21 3 16"></polyline>
                <line x1="3" y1="21" x2="10" y2="14"></line>
                <polyline points="16 21 21 21 21 16"></polyline>
                <line x1="21" y1="21" x2="14" y2="14"></line>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
            )}
            <span className="tf-full">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>
      </div>

      {/* ── LIVE HUD / QUICK METRICS STRIP ── */}
      <div className="phase-metrics-strip">
        <div className="pms-item">
          <span className="pms-label">Sesi:</span>
          <span className="pms-val highlight">{activeDisplayBar?.fullDate || activeDisplayBar?.date}</span>
        </div>
        <div className="pms-item">
          <span className="pms-label">Open:</span>
          <span className="pms-val">Rp {activeDisplayBar?.open?.toLocaleString('id-ID')}</span>
        </div>
        <div className="pms-item">
          <span className="pms-label">High:</span>
          <span className="pms-val up">Rp {activeDisplayBar?.high?.toLocaleString('id-ID')}</span>
        </div>
        <div className="pms-item">
          <span className="pms-label">Low:</span>
          <span className="pms-val dn">Rp {activeDisplayBar?.low?.toLocaleString('id-ID')}</span>
        </div>
        <div className="pms-item">
          <span className="pms-label">Close:</span>
          <span className={`pms-val font-bold ${isUp ? 'up' : 'dn'}`}>
            Rp {activeDisplayBar?.close?.toLocaleString('id-ID')} ({isUp ? '+' : ''}{activeDisplayBar?.changePct?.toFixed(2)}%)
          </span>
        </div>
        <div className="pms-item">
          <span className="pms-label">Vol:</span>
          <span className="pms-val">{activeDisplayBar?.volume} Jt</span>
        </div>
        <div className="pms-item pms-engine-pill">
          <span className="pms-label">UNP:</span>
          <span className="pms-val unp-tag">{activeDisplayBar?.unpVal}</span>
          <span className="pms-label" style={{ marginLeft: '8px' }}>L1:</span>
          <span className={`pms-val ${stock.l1 === 'buy' ? 'l1-tag' : 'l1-tag-sell'}`}>{activeDisplayBar?.l1Val}%</span>
        </div>
      </div>

      {/* ── INTERACTIVE CANVAS CONTAINER ── */}
      {/* Zoom + Pan hint bar */}
      <div className="chart-pan-hint">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
        </svg>
        <span>
          {zoomLevel <= 1.01
            ? 'Scroll untuk zoom · Pinch di layar sentuh'
            : `Zoom ${zoomLevel.toFixed(1)}x · Drag untuk geser kiri/kanan`}
        </span>
        {zoomLevel > 1.01 && (
          <button
            className="chart-reset-pan"
            onClick={() => { setZoomLevel(1.0); setPanOffset(0); }}
            title="Reset zoom & tampilan"
          >
            ↺ Reset Zoom
          </button>
        )}
      </div>

      <div className="phase-canvas-container" style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleCanvasClick}
          style={{
            width: '100%',
            height: isFullscreen ? `${window.innerHeight - 160}px` : `${currentHeight}px`,
            display: 'block',
            cursor: isDragging ? 'grabbing' : 'crosshair',
            userSelect: 'none',
            touchAction: 'none'
          }}
        />

        {/* FLOATING HOVER / PINNED TOOLTIP CARD */}
        {(hoveredBar || pinnedBar) && (
          <div
            className="chart-floating-tooltip"
            style={{
              position: 'absolute',
              top: '12px',
              left: Math.min(Math.max(16, (mousePos?.x || 100) - 110), (containerRef.current?.offsetWidth || 650) - 240),
              pointerEvents: 'none'
            }}
          >
            <div className="cft-header">
              <span className="cft-date">{activeDisplayBar.fullDate}</span>
              <span className={`cft-badge ${activeDisplayBar.isBullish ? 'bull' : 'bear'}`}>
                {activeDisplayBar.isBullish ? '▲ Bullish' : '▼ Bearish'}
              </span>
            </div>
            <div className="cft-grid">
              <div className="cft-row">
                <span className="cft-lbl">Open:</span>
                <span className="cft-num">Rp {activeDisplayBar.open.toLocaleString('id-ID')}</span>
              </div>
              <div className="cft-row">
                <span className="cft-lbl">High:</span>
                <span className="cft-num up">Rp {activeDisplayBar.high.toLocaleString('id-ID')}</span>
              </div>
              <div className="cft-row">
                <span className="cft-lbl">Low:</span>
                <span className="cft-num dn">Rp {activeDisplayBar.low.toLocaleString('id-ID')}</span>
              </div>
              <div className="cft-row">
                <span className="cft-lbl">Close:</span>
                <span className={`cft-num ${activeDisplayBar.isBullish ? 'up' : 'dn'}`}>
                  Rp {activeDisplayBar.close.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
            <div className="cft-footer">
              <div>Perubahan: <strong className={activeDisplayBar.isBullish ? 'up' : 'dn'}>
                {activeDisplayBar.isBullish ? '+' : ''}{activeDisplayBar.changeRp?.toLocaleString('id-ID')} ({activeDisplayBar.isBullish ? '+' : ''}{activeDisplayBar.changePct?.toFixed(2)}%)
              </strong></div>
              <div>Vol: <strong>{activeDisplayBar.volume} Jt lembar</strong> · UNP: <strong style={{ color: 'var(--cyan)' }}>{activeDisplayBar.unpVal}</strong> · L1: <strong style={{ color: 'var(--purple)' }}>{activeDisplayBar.l1Bias}</strong></div>
              {/* Active Technical Indicators Readout in Tooltip */}
              {activeIndicators.length > 0 && indicatorsData && (
                <div style={{ marginTop: '5px', paddingTop: '5px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {activeIndicators.includes('bollinger') && indicatorsData.bb[activeDisplayBar.index] && (
                    <span style={{ color: '#FFD700' }}>
                      BB: Rp {Math.round(indicatorsData.bb[activeDisplayBar.index].mid).toLocaleString('id-ID')}
                    </span>
                  )}
                  {activeIndicators.includes('macd') && indicatorsData.macd && (
                    <span style={{ color: '#00D4FF' }}>
                      MACD: {indicatorsData.macd.line[activeDisplayBar.index]?.toFixed(1)}
                    </span>
                  )}
                  {activeIndicators.includes('stochastic') && indicatorsData.stoch && (
                    <span style={{ color: '#00E5FF' }}>
                      Stoch: {indicatorsData.stoch.k[activeDisplayBar.index]?.toFixed(0)}%
                    </span>
                  )}
                  {activeIndicators.includes('rsi') && indicatorsData.rsi && (
                    <span style={{ color: '#E040FB' }}>
                      RSI: {indicatorsData.rsi[activeDisplayBar.index]?.toFixed(1)}
                    </span>
                  )}
                  {activeIndicators.includes('pvt') && indicatorsData.pvt && (
                    <span style={{ color: '#38BDF8' }}>
                      PVT: {indicatorsData.pvt.line[activeDisplayBar.index]?.toFixed(2)}M
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── FOOTER LEGEND & RANGE SUMMARY ── */}
      <div className="phase-act-footer">
        <div className="phase-legend-items">
          {chartMode === 'candle' ? (
            <>
              <div className="p-legend-item">
                <span className="p-legend-box bull"></span> Candle Bullish (Naik)
              </div>
              <div className="p-legend-item">
                <span className="p-legend-box bear"></span> Candle Bearish (Turun)
              </div>
              <div className="p-legend-item">
                <span className="p-legend-line resonance"></span> Phase Resonance Wave
              </div>
            </>
          ) : (
            <>
              <div className="p-legend-item">
                <span className="p-legend-line cyan"></span> Harga ({stock.ticker})
              </div>
              <div className="p-legend-item">
                <span className="p-legend-line purple-dash"></span> L1 Bias Trajectory
              </div>
              <div className="p-legend-item">
                <span className="p-legend-box cyan-zone"></span> UNP Anomaly Zone
              </div>
            </>
          )}
          <div className="p-legend-item">
            <span className="p-legend-box vol-box"></span> Volume Histogram
          </div>

          {/* ACTIVE INDICATORS LEGENDS */}
          {activeIndicators.includes('bollinger') && (
            <div className="p-legend-item">
              <span className="p-legend-box" style={{ background: 'rgba(255, 193, 7, 0.4)', borderColor: '#FFC107' }}></span> BB (20, 2)
            </div>
          )}
          {activeIndicators.includes('macd') && (
            <div className="p-legend-item">
              <span className="p-legend-line" style={{ background: '#00D4FF', borderColor: '#00D4FF' }}></span> MACD (12, 26, 9)
            </div>
          )}
          {activeIndicators.includes('stochastic') && (
            <div className="p-legend-item">
              <span className="p-legend-line" style={{ background: '#00E5FF', borderColor: '#00E5FF' }}></span> Slow Stoch (14, 3, 3)
            </div>
          )}
          {activeIndicators.includes('rsi') && (
            <div className="p-legend-item">
              <span className="p-legend-line" style={{ background: '#E040FB', borderColor: '#E040FB' }}></span> RSI (14)
            </div>
          )}
          {activeIndicators.includes('pvt') && (
            <div className="p-legend-item">
              <span className="p-legend-line" style={{ background: '#38BDF8', borderColor: '#38BDF8' }}></span> PVT Trend
            </div>
          )}
        </div>

        <div className="phase-range-summary">
          <span>Range: <strong>Rp {stats.lowPrice?.toLocaleString('id-ID')}</strong> — <strong>Rp {stats.highPrice?.toLocaleString('id-ID')}</strong></span>
          <span>Rata-rata Vol: <strong>{stats.avgVol} Jt</strong></span>
        </div>
      </div>
    </div>
  );
}
