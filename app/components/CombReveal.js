// The comb draws itself in: a pulse traces the rim of each cell outward from
// the centre, and the gold leaf (or the face) settles in behind it. Once the
// comb has formed, a face re-traces itself every few seconds, and any cell
// the pointer crosses answers with a trace of its own.
//
// Adapted from the V5 design prototype (merge/CombReveal.jsx). What changed
// in the port:
//   - positions are read from the live arrangement every frame, so a pulse
//     lands on the cell where it is now, after a click or a search has moved it
//   - it waits for the archive's stories to arrive, so the comb is drawn once,
//     at its full size, instead of starting and being replaced a moment later
//   - a cell is shown by a data attribute set here, not by React state, so the
//     reveal does not re-render the whole comb thirty times a second
//   - visitors who ask their system for less motion get the comb at once

import { useEffect, useRef, useState } from 'react';

const GOLD = '#f2bf49', LIGHT = '#ffd47a', RIM = '#E3A444', FPS = 30, TR = 20;
const clamp = (t) => Math.max(0, Math.min(1, t));
const sm = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
const eDraw = (t) => 1 - Math.pow(1 - clamp(t), 3);
const NB = (c, r) => [[c + 1, r + 1], [c + 1, r - 1], [c - 1, r + 1], [c - 1, r - 1], [c, r + 2], [c, r - 2]];

// flat-top rim, 3px inside the cell box (the frame of cell-gold.png, 548×468)
function pts(x0, y0, size) {
  const x = x0 + 3, y = y0 + 3, w = size - 6, h = size * 0.854 - 6;
  return [[x + 0.25 * w, y], [x + 0.75 * w, y], [x + w, y + h / 2], [x + 0.75 * w, y + h], [x + 0.25 * w, y + h], [x, y + h / 2]];
}
const at = (p, s, d, i) => p[((s + d * i) % 6 + 6) % 6];
function pathFrac(ctx, p, frac, s, d) {
  const n = 6 * clamp(frac);
  if (n <= 0) return;
  const full = Math.floor(n), rem = n - full;
  ctx.beginPath();
  const a = at(p, s, d, 0);
  ctx.moveTo(a[0], a[1]);
  for (let i = 1; i <= full; i++) { const b = at(p, s, d, i); ctx.lineTo(b[0], b[1]); }
  if (rem > 0 && full < 6) {
    const a2 = at(p, s, d, full), b = at(p, s, d, full + 1);
    ctx.lineTo(a2[0] + (b[0] - a2[0]) * rem, a2[1] + (b[1] - a2[1]) * rem);
  }
  if (frac >= 1) ctx.closePath();
  ctx.stroke();
}
function pointAt(p, frac, s, d) {
  const n = 6 * clamp(frac), i = Math.min(5, Math.floor(n)), rem = n - i, a = at(p, s, d, i), b = at(p, s, d, i + 1);
  return [a[0] + (b[0] - a[0]) * rem, a[1] + (b[1] - a[1]) * rem];
}
function head(ctx, p, tr, s, d, k) {
  const tail = Math.max(0, tr - 0.15);
  ctx.globalAlpha = 1; ctx.strokeStyle = LIGHT; ctx.lineWidth = 3.2 * k;
  ctx.shadowColor = 'rgba(252,146,38,.9)'; ctx.shadowBlur = 18 * k;
  ctx.beginPath();
  const tp = pointAt(p, tail, s, d);
  ctx.moveTo(tp[0], tp[1]);
  for (let i = Math.floor(tail * 6) + 1; i <= Math.floor(tr * 6) && i < 6; i++) { const v = at(p, s, d, i); ctx.lineTo(v[0], v[1]); }
  const hp = pointAt(p, tr, s, d);
  ctx.lineTo(hp[0], hp[1]); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = LIGHT; ctx.beginPath(); ctx.arc(hp[0], hp[1], 4.5 * k, 0, 7); ctx.fill();
}

// reveal order: breadth-first from the cell nearest the middle of the field
function schedule(base, W, H, size) {
  const byKey = new Map(base.map((b) => [b.k, b]));
  let seed = base[0], best = Infinity;
  for (const b of base) {
    const d = (b.x + size / 2 - W / 2) ** 2 + (b.y + size / 2 - H / 2) ** 2;
    if (d < best) { best = d; seed = b; }
  }
  const depth = new Map([[seed.k, 0]]), q = [seed];
  while (q.length) {
    const b = q.shift(), [c, r] = b.k.split(',').map(Number);
    for (const [nc, nr] of NB(c, r)) {
      const k = nc + ',' + nr;
      if (byKey.has(k) && !depth.has(k)) { depth.set(k, depth.get(b.k) + 1); q.push(byKey.get(k)); }
    }
  }
  const out = new Map();
  base.forEach((b, i) => {
    const d = depth.has(b.k) ? depth.get(b.k) : 12;
    out.set(b.k, { t0: 8 + d * TR * 0.62 + (i * 7) % 6, dir: d % 2 ? -1 : 1, start: (i * 5) % 6 });
  });
  return out;
}

const prefersLessMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * @param fieldRef   the .arch-field element
 * @param canvasRef  a <canvas> that is the field's first child
 * @param base       the lattice, unarranged ({k, x, y}); a new one replays the reveal
 * @param cells      the live arrangement, read every frame for positions
 * @param faceOf     Map of cell key → face, read every frame
 * @param ready      false until the archive's stories have arrived
 * @param run        bump to replay the reveal
 * @returns revealing — true while cells should start hidden
 */
export function useCombReveal({ fieldRef, canvasRef, base, cells, faceOf, size, W, H, enabled = true, ready = true, run = 0 }) {
  const [reduce] = useState(prefersLessMotion);
  const [done, setDone] = useState(null);
  const live = useRef({ cells, faceOf });
  useEffect(() => { live.current = { cells, faceOf }; }, [cells, faceOf]);

  const active = enabled && !reduce;

  useEffect(() => {
    const field = fieldRef.current, cv = canvasRef.current;
    if (!active || !ready || !field || !cv || !base.length) return undefined;
    const ctx = cv.getContext('2d');
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    field.querySelectorAll('.cell[data-shown]').forEach((el) => el.removeAttribute('data-shown'));

    const sched = schedule(base, W, H, size);
    const seen = new Set();
    const pings = [];
    const els = new Map();
    const cellEl = (k) => {
      let el = els.get(k);
      if (!el || !el.isConnected) { el = field.querySelector(`.cell[data-k="${k}"]`); els.set(k, el); }
      return el;
    };
    let frame = 0, lastIdle = 0, raf = 0, timer = 0, formed = false, dirty = true;
    let posCells = null, pos = new Map();
    const ping = (k, hover) => { if (sched.has(k) && !pings.some((p) => p.k === k)) pings.push({ k, f0: frame, hover }); };
    const onOver = (e) => {
      const cell = e.target.closest && e.target.closest('.cell');
      if (cell && cell.dataset.k && cell.querySelector('.hexcell')) ping(cell.dataset.k, true);
    };
    field.addEventListener('mouseover', onOver);

    const tick = () => {
      frame++;
      const { cells: now, faceOf: faces } = live.current;
      if (now !== posCells) { posCells = now; pos = new Map(now.map((b) => [b.k, b])); }
      const willDraw = !formed || pings.length > 0;
      if (willDraw || dirty) {
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.clearRect(0, 0, W, H);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      }
      dirty = false;

      if (!formed) {
        let settledAll = true;
        for (const b of base) {
          const s = sched.get(b.k), age = frame - s.t0;
          if (age < 0) { settledAll = false; continue; }
          if (age >= TR * 0.75 && !seen.has(b.k)) {
            seen.add(b.k);
            const el = cellEl(b.k);
            if (el) el.setAttribute('data-shown', '');
          }
          const settled = sm(TR, TR + 22, age);
          if (settled >= 1) continue;
          settledAll = false; dirty = true;
          const here = pos.get(b.k) || b, face = !!faces.get(b.k);
          const p = pts(here.x, here.y, size), tr = eDraw(age / TR);
          ctx.globalAlpha = (1 - settled) * (face ? 0.95 : 0.6);
          ctx.strokeStyle = face ? GOLD : RIM; ctx.lineWidth = face ? 2.2 : 1.5;
          pathFrac(ctx, p, tr, s.start, s.dir);
          if (tr < 1) head(ctx, p, tr, s.start, s.dir, face ? 1 : 0.7);
          else {
            const q = 1 - settled, v = at(p, s.start, s.dir, 0);
            ctx.globalAlpha = q; ctx.fillStyle = GOLD;
            ctx.beginPath(); ctx.arc(v[0], v[1], 4.5 * (1 + 1.8 * (1 - q)), 0, 7); ctx.fill();
          }
        }
        if (settledAll) { formed = true; lastIdle = frame; setDone({ base, run }); }
      } else if (frame - lastIdle > 84) {
        // formed: every few seconds one face re-traces itself
        lastIdle = frame;
        const keys = [...faces.keys()];
        if (keys.length) ping(keys[Math.floor(Math.random() * keys.length)], false);
      }

      for (let i = pings.length - 1; i >= 0; i--) if (frame - pings[i].f0 >= TR + 4) pings.splice(i, 1);
      for (const pg of pings) {
        const s = sched.get(pg.k), q = eDraw((frame - pg.f0) / TR);
        if (q >= 1) continue;
        const here = pos.get(pg.k);
        if (!here) continue;
        const p = pts(here.x, here.y, size);
        ctx.globalAlpha = 1; ctx.strokeStyle = pg.hover ? GOLD : LIGHT; ctx.lineWidth = pg.hover ? 2.6 : 2;
        pathFrac(ctx, p, q, s.start, -s.dir);
        head(ctx, p, q, s.start, -s.dir, 1);
        dirty = true;
      }
      ctx.globalAlpha = 1;
      timer = setTimeout(() => { raf = requestAnimationFrame(tick); }, 1000 / FPS);
    };
    raf = requestAnimationFrame(tick);
    // a browser that never paints this page (a hidden pane, a frozen tab) must
    // not leave the comb invisible: after twenty seconds, show whatever is left
    const failsafe = setTimeout(() => {
      if (formed) return;
      field.querySelectorAll('.cell').forEach((el) => el.setAttribute('data-shown', ''));
      formed = true; lastIdle = frame;
      setDone({ base, run });
    }, 20000);
    return () => {
      cancelAnimationFrame(raf); clearTimeout(timer); clearTimeout(failsafe);
      field.removeEventListener('mouseover', onOver);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    };
  }, [fieldRef, canvasRef, base, size, W, H, active, ready, run]);

  const revealing = active && !(done && done.base === base && done.run === run);
  return { revealing };
}
