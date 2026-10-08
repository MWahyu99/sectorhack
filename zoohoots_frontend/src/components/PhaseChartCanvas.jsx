import React, { useRef, useEffect } from 'react';

export default function PhaseChartCanvas({ stock, timeframe }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !stock) return;

    let animId;
    const ctx = c.getContext('2d');

    const handleResize = () => {
      c.width = c.offsetWidth || 700;
      c.height = 220;
      renderChart();
    };

    const renderChart = () => {
      const w = c.width;
      const h = c.height;
      ctx.clearRect(0, 0, w, h);

      // Number of points according to timeframe
      const pts = timeframe === '1M' ? 30 : timeframe === '3M' ? 60 : timeframe === '6M' ? 120 : 200;

      // Seeded random pseudo generator
      let seed = stock.ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 42) + pts;
      const pseudoRand = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      };

      // Base price
      const basePrice = stock.rawPrice || 5000;
      const prices = [];
      let p = basePrice * 0.92;
      for (let i = 0; i < pts; i++) {
        p += (pseudoRand() - 0.46) * (basePrice * 0.005) + (basePrice * 0.0003);
        prices.push(p);
      }
      const mn = Math.min(...prices) - basePrice * 0.02;
      const mx = Math.max(...prices) + basePrice * 0.02;
      const sy = (v) => h - 14 - ((v - mn) / (mx - mn)) * (h - 28);
      const sx = (i) => (i / (pts - 1)) * (w - 12) + 6;

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      [0.25, 0.5, 0.75].forEach((r) => {
        ctx.beginPath();
        ctx.moveTo(0, h * r);
        ctx.lineTo(w, h * r);
        ctx.stroke();
      });

      // UNP zone (last 16%)
      const zoneX = w * 0.82;
      const g2 = ctx.createLinearGradient(zoneX, 0, w, 0);
      g2.addColorStop(0, 'rgba(0, 212, 255, 0)');
      g2.addColorStop(1, 'rgba(0, 212, 255, 0.12)');
      ctx.fillStyle = g2;
      ctx.fillRect(zoneX, 0, w - zoneX, h);

      // L1 overlay line
      const l1prices = [];
      let lp = basePrice * 0.91;
      for (let i = 0; i < pts; i++) {
        lp += (pseudoRand() - 0.45) * (basePrice * 0.004) + (basePrice * 0.00025);
        l1prices.push(lp);
      }
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(168, 130, 255, 0.65)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 3]);
      l1prices.forEach((v, i) => (i === 0 ? ctx.moveTo(sx(i), sy(v)) : ctx.lineTo(sx(i), sy(v))));
      ctx.stroke();
      ctx.setLineDash([]);

      // UNP area fill
      const ag = ctx.createLinearGradient(0, 0, 0, h);
      ag.addColorStop(0, 'rgba(0, 212, 255, 0.25)');
      ag.addColorStop(1, 'rgba(0, 212, 255, 0.0)');
      ctx.beginPath();
      ctx.moveTo(sx(0), h);
      prices.forEach((v, i) => ctx.lineTo(sx(i), sy(v)));
      ctx.lineTo(sx(pts - 1), h);
      ctx.closePath();
      ctx.fillStyle = ag;
      ctx.fill();

      // UNP line
      ctx.beginPath();
      ctx.strokeStyle = '#00D4FF';
      ctx.lineWidth = 2.2;
      prices.forEach((v, i) => (i === 0 ? ctx.moveTo(sx(i), sy(v)) : ctx.lineTo(sx(i), sy(v))));
      ctx.stroke();

      // "Now" dashed line
      const nx = w * 0.88;
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(nx, 0);
      ctx.lineTo(nx, h);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText('Now', nx + 4, 14);

      // End glowing dots
      [
        [prices, sx(pts - 1), sy(prices[pts - 1]), '#00D4FF'],
        [l1prices, sx(pts - 1), sy(l1prices[pts - 1]), '#A882FF']
      ].forEach(([_, ex, ey, col]) => {
        const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 10);
        eg.addColorStop(0, col + '66');
        eg.addColorStop(1, col + '00');
        ctx.beginPath();
        ctx.arc(ex, ey, 10, 0, Math.PI * 2);
        ctx.fillStyle = eg;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [stock, timeframe]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '220px', display: 'block', maxWidth: '100%' }}
    />
  );
}
