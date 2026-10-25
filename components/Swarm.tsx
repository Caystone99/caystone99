"use client";

import { useEffect, useRef } from "react";

// A swarm with no leader: each dot follows three local rules (keep apart, align, stay together) and steers
// clear of the pointer. Nearby dots are joined by a faint line, like robots in radio range.
const N = 70, SEE = 64, APART = 22, SPEED = 1.1, LINK = 54;

type Bot = { x: number; y: number; vx: number; vy: number };

export default function Swarm() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0;
    const pointer = { x: -999, y: -999 };
    const bots: Bot[] = [];

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2;
      bots.push({ x: Math.random() * w, y: Math.random() * h, vx: Math.cos(a) * SPEED, vy: Math.sin(a) * SPEED });
    }

    const ink = () => getComputedStyle(c).getPropertyValue("--ink").trim() || "#1d1b17";

    function step() {
      for (const b of bots) {
        let ax = 0, ay = 0, cx = 0, cy = 0, sx = 0, sy = 0, n = 0;
        for (const o of bots) {
          if (o === b) continue;
          const dx = o.x - b.x, dy = o.y - b.y, d = Math.hypot(dx, dy);
          if (d < SEE) {
            ax += o.vx; ay += o.vy; cx += o.x; cy += o.y; n++;
            if (d < APART) { sx -= dx / (d || 1); sy -= dy / (d || 1); }
          }
        }
        if (n) {
          b.vx += (ax / n - b.vx) * 0.04 + (cx / n - b.x) * 0.0006;
          b.vy += (ay / n - b.vy) * 0.04 + (cy / n - b.y) * 0.0006;
        }
        b.vx += sx * 0.05; b.vy += sy * 0.05;
        const pd = Math.hypot(b.x - pointer.x, b.y - pointer.y);
        if (pd < 90) { b.vx += ((b.x - pointer.x) / pd) * 0.35; b.vy += ((b.y - pointer.y) / pd) * 0.35; }
        const s = Math.hypot(b.vx, b.vy) || 1;
        b.vx = (b.vx / s) * SPEED; b.vy = (b.vy / s) * SPEED;
        b.x = (b.x + b.vx + w) % w; b.y = (b.y + b.vy + h) % h;
      }
    }

    function draw() {
      const color = ink();
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = color; ctx.fillStyle = color;
      ctx.lineWidth = 0.6;
      for (let i = 0; i < bots.length; i++) {
        for (let j = i + 1; j < bots.length; j++) {
          const d = Math.hypot(bots[i].x - bots[j].x, bots[i].y - bots[j].y);
          if (d < LINK) {
            ctx.globalAlpha = (1 - d / LINK) * 0.35;
            ctx.beginPath(); ctx.moveTo(bots[i].x, bots[i].y); ctx.lineTo(bots[j].x, bots[j].y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 0.85;
      for (const b of bots) { ctx.beginPath(); ctx.arc(b.x, b.y, 1.7, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }

    function loop() { step(); draw(); raf = requestAnimationFrame(loop); }
    if (still) { for (let i = 0; i < 200; i++) step(); draw(); } else loop();

    const move = (e: PointerEvent) => { const r = c.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; };
    const leave = () => { pointer.x = -999; pointer.y = -999; };
    const ro = new ResizeObserver(() => { size(); if (still) draw(); });
    ro.observe(c);
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); c.removeEventListener("pointermove", move); c.removeEventListener("pointerleave", leave); };
  }, []);

  return <canvas ref={canvas} className="swarm" aria-label="A swarm of dots moving together, with no leader" role="img" />;
}
