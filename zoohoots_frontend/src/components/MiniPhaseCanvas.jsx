import React, { useRef, useEffect } from 'react';

export default function MiniPhaseCanvas({ stock }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stock) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.offsetWidth || 300;
    const h = 80;
    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);
    const pts = 90;
    const cUNP = '#00D4FF';
    const cL1 = stock.l1 === 'buy' ? '#A882FF' : stock.l1 === 'sell' ? '#FF6B6B' : '#5A7090';

    // Seeded random pseudo generator based on stock ticker for deterministic curve
    let seed = stock.ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 100);
    const pseudoRand = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    // Draw two lines (UNP + L1)
    [[cUNP, 0.9], [cL1, 0.6]].forEach(([col, amp], li) => {
      const prices = [];
      let p = 100;
      for (let i = 0; i < pts; i++) {
        p += (pseudoRand() - 0.47) * 2 + (stock.unp / 100) * 0.1 * (li === 0 ? 1 : 0.7);
        prices.push(p);
      }
      const mn = Math.min(...prices);
      const mx = Math.max(...prices);
      const sy = (v) => h - 6 - ((v - mn) / (mx - mn + 0.01)) * (h - 12);
      const sx = (i) => (i / (pts - 1)) * (w - 4) + 2;

      if (li === 0) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, col + '40');
        g.addColorStop(1, col + '00');
        ctx.beginPath();
        ctx.moveTo(sx(0), h);
        prices.forEach((v, i) => ctx.lineTo(sx(i), sy(v)));
        ctx.lineTo(sx(pts - 1), h);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.strokeStyle = col;
      ctx.lineWidth = li === 0 ? 2 : 1.5;
      prices.forEach((v, i) => (i === 0 ? ctx.moveTo(sx(i), sy(v)) : ctx.lineTo(sx(i), sy(v))));
      ctx.stroke();
    });
  }, [stock]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '80px', display: 'block' }}
    />
  );
}
