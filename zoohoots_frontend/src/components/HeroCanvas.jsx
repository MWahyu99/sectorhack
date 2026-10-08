import React, { useRef, useEffect } from 'react';

export default function HeroCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    let animId;
    let t = 0;

    const resize = () => {
      c.width = c.offsetWidth || window.innerWidth;
      c.height = c.offsetHeight || 400;
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(c);

    const ctx = c.getContext('2d');
    const waves = [
      { freq: 0.011, amp: 0.13, phase: 0,   alpha: 0.55, w: 1.5, col: '0,212,255' },
      { freq: 0.007, amp: 0.17, phase: 1.3, alpha: 0.3,  w: 1,   col: '168,130,255' },
      { freq: 0.018, amp: 0.07, phase: 2.1, alpha: 0.4,  w: 1,   col: '0,212,255' },
    ];

    const draw = () => {
      const w = c.width;
      const h = c.height;
      ctx.clearRect(0, 0, w, h);

      waves.forEach((l) => {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${l.col},${l.alpha})`;
        ctx.lineWidth = l.w;
        for (let x = 0; x <= w; x += 2) {
          const y = h / 2 + Math.sin(x * l.freq + t + l.phase) * h * l.amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      [0.2, 0.55, 0.8].forEach((xr, i) => {
        const col = i === 1 ? '168,130,255' : '0,212,255';
        const x = w * xr;
        const y = h / 2 + Math.sin(x * waves[0].freq + t + i) * h * waves[0].amp;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 18);
        g.addColorStop(0, `rgba(${col},0.4)`);
        g.addColorStop(1, `rgba(${col},0)`);
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col},0.9)`;
        ctx.fill();
      });

      t += 0.014;
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', opacity: 0.35, display: 'block' }}
    />
  );
}
