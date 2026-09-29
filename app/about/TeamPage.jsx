'use client';

// The About page (V4 design): the team, advisors and allies as a small comb
// that draws itself in, with a reading panel beside it. Everyone comes from
// app/data/team.js, so adding an advisor or an ally needs no change here.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { TEAM, ADVISORS, ALLIES, ROSTER_EMAIL, ADVISOR_NOTE } from '../data/team';

const GOLD = '#f2bf49', LIGHT = '#f7d27a', CREAM = '#f4e8d2', FPS = 30, TR = 22;
const clamp = (t) => Math.max(0, Math.min(1, t));
const sm = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
const eDraw = (t) => 1 - Math.pow(1 - clamp(t), 3);
// pointy-top cells; odd rows sit half a cell to the right
const NB = (r) => ((r & 1)
  ? [[1, 0], [-1, 0], [0, -1], [1, -1], [0, 1], [1, 1]]
  : [[1, 0], [-1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]]);
const cellKey = (c, r) => c + ',' + r;
const initialsOf = (n) => n.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 3).toUpperCase();

// rows of three; a short first row sits to the right, as the team's two-over-three does
function placeRows(items, firstRow) {
  const rows = Math.max(1, Math.ceil(items.length / 3));
  const firstCount = items.length - 3 * (rows - 1);
  const cells = [];
  let i = 0;
  for (let r = 0; r < rows; r++) {
    const n = r === 0 ? firstCount : 3;
    for (let j = 0; j < n; j++) cells.push({ ...items[i++], c: 3 - n + j, r: firstRow + r });
  }
  return { cells, rows };
}

function buildRoster() {
  const team = TEAM.map((m) => ({ g: 'team', kind: 'The team', name: m.name, sub: m.role, img: m.image, pos: m.imagePosition, mail: m.email, bio: m.bio, slot: m.slot }));
  const adv = ADVISORS.map((a) => ({ g: 'adv', kind: 'Advisor', name: a.name, sub: a.role, url: a.url }));
  const allies = ALLIES.length
    ? ALLIES.map((a) => ({ g: 'ally', kind: 'Ally', name: a.name, sub: a.role, url: a.url, img: a.logo }))
    : [{ g: 'pend' }, { g: 'pend' }, { g: 'pend' }];
  const groups = [
    { label: 'The team', items: team, delay: 0 },
    { label: 'Advisors', items: adv, delay: 40 },
    { label: ALLIES.length ? 'Allies' : 'Allies · pending', items: allies, delay: 70 },
  ].filter((grp) => grp.items.length);

  const people = [], labels = [];
  let row = 0;
  for (const grp of groups) {
    let placed;
    if (grp.items.every((x) => x.slot)) {
      const rows = Math.max(...grp.items.map((x) => x.slot[1])) + 1;
      placed = { rows, cells: grp.items.map((x) => ({ ...x, c: x.slot[0], r: row + x.slot[1] })) };
    } else {
      placed = placeRows(grp.items, row);
    }
    const { cells, rows } = placed;
    // reveal order: breadth-first from the cell nearest the middle of the group
    const byKey = new Map(cells.map((x) => [cellKey(x.c, x.r), x]));
    const fx = (x) => x.c + 0.5 * (x.r & 1), fy = (x) => x.r * 0.866;
    const mx = cells.reduce((s, x) => s + fx(x), 0) / cells.length;
    const my = cells.reduce((s, x) => s + fy(x), 0) / cells.length;
    let seed = cells[0], best = Infinity;
    for (const x of cells) { const d = (fx(x) - mx) ** 2 + (fy(x) - my) ** 2; if (d < best - 1e-9) { best = d; seed = x; } }
    const depth = new Map([[seed, 0]]), q = [seed];
    while (q.length) {
      const x = q.shift();
      for (const [dc, dr] of NB(x.r)) {
        const y = byKey.get(cellKey(x.c + dc, x.r + dr));
        if (y && !depth.has(y)) { depth.set(y, depth.get(x) + 1); q.push(y); }
      }
    }
    cells.forEach((x, j) => {
      const d = depth.has(x) ? depth.get(x) : 4;
      x.t0 = grp.delay + d * TR * 0.75;
      x.dir = d % 2 ? -1 : 1;
      x.start = ((people.length + j) * 5) % 6;
    });
    labels.push({ text: grp.label, row: row + (rows - 1) / 2 });
    people.push(...cells);
    row += rows;
  }
  people.forEach((x, i) => { x.i = i; });
  // horizontal extent in cell widths (odd rows sit half a cell right)
  const xs = people.map((x) => x.c + 0.5 * (x.r & 1));
  const minX = Math.min(...xs), span = Math.max(...xs) + 1 - minX;
  return { people, labels, rows: row, minX, span };
}

// a comb narrower than this drops the group labels and uses the whole width
const NARROW = 600;
function measure(width, { minX, span, rows }) {
  const narrow = width < NARROW;
  const gutter = narrow ? 0 : 150; // room for the group labels
  const R = Math.max(24, Math.min(118, (width - gutter) / (span * Math.sqrt(3))));
  const w = Math.sqrt(3) * R, top = 16;
  // narrow: centred in the column; wide: left-aligned, labels to the right
  const ox = narrow ? (width - span * w) / 2 : 0;
  return { width, narrow, R, w, top, gap: 7, minX, ox, labelX: span * w + 12, height: Math.round((1.5 * (rows - 1) + 2) * R + top + 24) };
}
const centre = (L, c, r) => [L.ox + L.w * (c + 0.5 * (Math.round(r) & 1) - L.minX) + L.w / 2, 1.5 * L.R * r + L.R + L.top];

function hexPts(cx, cy, r) {
  const p = [];
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return p;
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
  if (rem > 0 && full < 6) { const a2 = at(p, s, d, full), b = at(p, s, d, full + 1); ctx.lineTo(a2[0] + (b[0] - a2[0]) * rem, a2[1] + (b[1] - a2[1]) * rem); }
  if (frac >= 1) ctx.closePath();
  ctx.stroke();
}
function pointAt(p, frac, s, d) {
  const n = 6 * clamp(frac), i = Math.min(5, Math.floor(n)), rem = n - i, a = at(p, s, d, i), b = at(p, s, d, i + 1);
  return [a[0] + (b[0] - a[0]) * rem, a[1] + (b[1] - a[1]) * rem];
}
function head(ctx, p, tr, s, d, col) {
  const tail = Math.max(0, tr - 0.14);
  ctx.globalAlpha = 1; ctx.strokeStyle = col; ctx.lineWidth = 3.5;
  ctx.shadowColor = 'rgba(242,191,73,.9)'; ctx.shadowBlur = 16;
  ctx.beginPath();
  const tp = pointAt(p, tail, s, d);
  ctx.moveTo(tp[0], tp[1]);
  for (let i = Math.floor(tail * 6) + 1; i <= Math.floor(tr * 6) && i < 6; i++) { const v = at(p, s, d, i); ctx.lineTo(v[0], v[1]); }
  const hp = pointAt(p, tr, s, d);
  ctx.lineTo(hp[0], hp[1]); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(hp[0], hp[1], 5, 0, 7); ctx.fill();
}

export default function TeamPage() {
  const roster = useMemo(() => buildRoster(), []);
  const { people, labels } = roster;
  const named = useMemo(() => people.filter((x) => x.g !== 'pend'), [people]);
  // null: everyone shown; a number: that person isolated
  const [sel, setSel] = useState(null);
  const [L, setL] = useState(null);
  const fieldRef = useRef(null), canvasRef = useRef(null), bioRef = useRef(null);
  const live = useRef({ L: null, sel: null });
  const pingRef = useRef(() => undefined);
  useEffect(() => { live.current = { L, sel }; }, [L, sel]);
  // Escape brings everyone back
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSel(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // the comb is sized from the width it is given
  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => {
      const next = measure(el.clientWidth, roster);
      setL((prev) => (prev && prev.width === next.width ? prev : next));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [roster]);

  const measured = L !== null;
  useEffect(() => {
    const cv = canvasRef.current, field = fieldRef.current;
    if (!measured || !cv || !field) return undefined;
    const ctx = cv.getContext('2d');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // less motion: every comb is already drawn, and nothing pulses
    let frame = reduce ? 1000 : 0, lastIdle = frame, raf = 0, timer = 0, cw = 0, ch = 0, dpr = 0;
    const shown = new Set();
    const pings = [];
    // outlines follow the isolation: the chosen one grows with its portrait,
    // the rest fade back, both eased so it never snaps
    const scale = new Map(), fade = new Map();
    const ease = (m, k, target) => { const v = m.has(k) ? m.get(k) : target; const n = reduce ? target : v + (target - v) * 0.22; m.set(k, n); return n; };
    pingRef.current = (i, hover) => { if (!reduce && !pings.some((p) => p.i === i)) pings.push({ i, f0: frame, hover }); };
    const tick = () => {
      frame++;
      const { L: lay, sel: chosen } = live.current;
      const iso = chosen !== null && chosen !== undefined;
      if (lay) {
        const DPR = Math.min(2, window.devicePixelRatio || 1);
        if (cw !== lay.width || ch !== lay.height || dpr !== DPR) {
          cw = lay.width; ch = lay.height; dpr = DPR;
          cv.width = Math.round(cw * DPR); cv.height = Math.round(ch * DPR);
          cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
        }
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, cw, ch);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const x of people) {
          const age = frame - x.t0;
          if (age < 0) continue;
          const sc = ease(scale, x.i, chosen === x.i ? 1.08 : 1);
          const fa = ease(fade, x.i, iso && chosen !== x.i ? 0.12 : 1);
          const [cx, cy] = centre(lay, x.c, x.r), p = hexPts(cx, cy, (lay.R - 1.5) * sc);
          const tr = eDraw(age / TR), settled = sm(TR, TR + 18, age);
          if (age >= TR * 0.8 && !shown.has(x.i)) {
            const el = field.querySelector(`.tp-cell[data-i="${x.i}"]`);
            if (el) { el.setAttribute('data-on', ''); shown.add(x.i); }
          }
          if (x.g === 'pend') {
            ctx.setLineDash([5, 6]); ctx.globalAlpha = 0.35 * fa; ctx.strokeStyle = GOLD; ctx.lineWidth = 1.2;
            pathFrac(ctx, p, tr, x.start, x.dir); ctx.setLineDash([]);
            if (tr < 1) head(ctx, p, tr, x.start, x.dir, LIGHT);
            continue;
          }
          const isSel = chosen === x.i;
          ctx.globalAlpha = (0.5 + 0.45 * settled) * fa; ctx.strokeStyle = isSel ? GOLD : CREAM; ctx.lineWidth = isSel ? 2.6 : 1.8;
          pathFrac(ctx, p, tr, x.start, x.dir);
          const q2 = eDraw((age - TR * 0.35) / TR);
          if (q2 > 0) {
            ctx.globalAlpha = 0.4 * fa; ctx.strokeStyle = GOLD; ctx.lineWidth = 1;
            pathFrac(ctx, p.map(([px, py]) => [cx + (px - cx) * 0.9, cy + (py - cy) * 0.9]), q2, x.start, x.dir);
          }
          if (tr < 1) head(ctx, p, tr, x.start, x.dir, LIGHT);
          else if (settled < 1) {
            const k = 1 - settled, v = at(p, x.start, x.dir, 0);
            ctx.globalAlpha = k; ctx.fillStyle = GOLD;
            ctx.beginPath(); ctx.arc(v[0], v[1], 5 * (1 + 1.6 * (1 - k)), 0, 7); ctx.fill();
          }
        }
        // once formed, one face re-traces itself every few seconds
        if (!reduce && frame > 150 && frame - lastIdle > 84) {
          lastIdle = frame;
          const liveOnes = iso ? [people[chosen]] : people.filter((x) => x.g !== 'pend');
          const pick = liveOnes[Math.floor(Math.random() * liveOnes.length)];
          if (pick) pingRef.current(pick.i, false);
        }
        for (let i = pings.length - 1; i >= 0; i--) if (frame - pings[i].f0 >= TR + 6) pings.splice(i, 1);
        for (const pg of pings) {
          const x = people[pg.i], q = eDraw((frame - pg.f0) / TR);
          if (q >= 1) continue;
          const [cx, cy] = centre(lay, x.c, x.r), p = hexPts(cx, cy, (lay.R - 1.5) * (scale.get(x.i) || 1));
          ctx.globalAlpha = 1; ctx.strokeStyle = pg.hover ? GOLD : LIGHT; ctx.lineWidth = pg.hover ? 3 : 2;
          pathFrac(ctx, p, q, x.start, -x.dir);
          head(ctx, p, q, x.start, -x.dir, pg.hover ? GOLD : LIGHT);
        }
        ctx.globalAlpha = 1;
      }
      timer = setTimeout(() => { raf = requestAnimationFrame(tick); }, 1000 / FPS);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); pingRef.current = () => undefined; };
  }, [measured, people]);

  const clear = () => setSel(null);
  const select = (i) => {
    if (i === sel) { clear(); return; }
    setSel(i);
    pingRef.current(i, true);
    // stacked layout: the story is below the comb, so take the reader to it
    if (window.matchMedia('(max-width: 1100px)').matches && bioRef.current) {
      bioRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const x = sel === null ? null : people[sel];
  const place = x ? named.indexOf(x) + 1 : 0;
  const isolating = x !== null;

  return (
    <div className="tp">
      <div className="tp-wrap">
        <header className="tp-head">
          <Link className="tp-brand" href="/">HONEYCOMB</Link>
          <Link className="tp-ui tp-back" href="/">← Back to the comb</Link>
        </header>

        <section className="tp-hero">
          <p className="tp-ui tp-eyebrow">Your experience. Our collective history.</p>
          <h1>The people keeping the archive.</h1>
          <p className="tp-lede">Honeycomb is built by a handpicked team and kept honest by the people who advise it. Each comb draws itself in as the network forms — select one to read their story.</p>
        </section>

        <div className="tp-layout">
          <div>
            <div className="tp-field" ref={fieldRef} style={L ? { height: L.height } : undefined}
                 onClick={(e) => { if (e.target === e.currentTarget) clear(); }}>
              <canvas ref={canvasRef} aria-hidden="true" />
              {L && people.map((p) => {
                const [cx, cy] = centre(L, p.c, p.r);
                const style = { left: cx - L.w / 2 + L.gap / 2, top: cy - L.R + L.gap / 2, width: L.w - L.gap, height: 2 * L.R - L.gap };
                if (p.g === 'pend') {
                  return <div key={p.i} className={'tp-cell tp-cell--pend' + (isolating ? ' tp-cell--faded' : '')} data-i={p.i} style={style} aria-hidden="true"><div className="tp-hex" /></div>;
                }
                const isSel = sel === p.i;
                return (
                  <button
                    key={p.i} type="button" data-i={p.i} style={style}
                    className={'tp-cell' + (isSel ? ' tp-cell--sel' : isolating ? ' tp-cell--faded' : '')}
                    aria-label={`${p.name}, ${p.kind}`} aria-pressed={isSel}
                    onMouseEnter={() => pingRef.current(p.i, true)}
                    onClick={() => select(p.i)}
                  >
                    <div className="tp-hex">
                      {p.img
                        ? <img src={p.img} alt="" style={{ objectPosition: p.pos || '50% 45%' }} />
                        : <span className="tp-init">{initialsOf(p.name)}</span>}
                    </div>
                    <span className="tp-tag"><span className="tp-nm">{p.name}</span><span className="tp-rl">{p.kind}</span></span>
                  </button>
                );
              })}
              {L && !L.narrow && labels.map((l) => (
                <span key={l.text} className="tp-ui tp-glabel" style={{ left: L.labelX, top: centre(L, 0, l.row)[1] - 7 }}>{l.text}</span>
              ))}
            </div>
            {!ALLIES.length && (
              <div className="tp-pend">
                <svg viewBox="0 0 44 50" fill="none" stroke="#d89126" strokeWidth="1.5" strokeDasharray="4 4" aria-hidden="true"><polygon points="22,1 43,13 43,37 22,49 1,37 1,13" /></svg>
                <div>
                  <h3>Allies</h3>
                  <p>Our allies are being gathered with their permission. They will be named here once they have agreed to it.</p>
                </div>
              </div>
            )}
          </div>

          <aside className={'tp-bio' + (x ? '' : ' tp-bio--intro')} ref={bioRef} aria-live="polite">
            {x ? (<>
            <p className="tp-ui tp-k">
              <span>{x.kind}</span>
              <span>{String(place).padStart(2, '0')} / {String(named.length).padStart(2, '0')}</span>
            </p>
            <h2>{x.name}</h2>
            <p className="tp-role">{x.sub || x.kind}</p>
            {x.bio
              ? x.bio.map((para) => <p key={para.slice(0, 24)}>{para}</p>)
              : x.g === 'adv' ? <p className="tp-note">{ADVISOR_NOTE}</p> : null}
            {x.mail
              ? <a className="tp-mail" href={`mailto:${x.mail}`}>{x.mail}</a>
              : x.url ? <a className="tp-mail" href={x.url} target="_blank" rel="noreferrer">Profile ↗</a> : null}
            {x.g === 'adv' && (
              <div>
                <a className="tp-cta" href={`mailto:${ROSTER_EMAIL}?subject=Standing%20with%20Honeycomb`}>Become an ally <span aria-hidden="true">→</span></a>
              </div>
            )}
            <button type="button" className="tp-all" onClick={clear}>← Everyone</button>
            </>) : (<>
            <p className="tp-ui tp-k"><span>The people</span><span>{String(named.length).padStart(2, '0')}</span></p>
            <h2>Select anyone to read their story.</h2>
            <ul className="tp-roll">
              {named.map((p) => (
                <li key={p.i}>
                  <button type="button" onClick={() => select(p.i)} onMouseEnter={() => pingRef.current(p.i, true)}>
                    <span className="tp-roll-nm">{p.name}</span>
                    <span className="tp-roll-rl">{p.sub || p.kind}</span>
                  </button>
                </li>
              ))}
            </ul>
            </>)}
          </aside>
        </div>

        <footer className="tp-foot">
          <span className="tp-ui">Honeycomb</span>
          <a className="tp-ui" href={`mailto:${ROSTER_EMAIL}`}>{ROSTER_EMAIL}</a>
          <Link className="tp-ui" href="/privacy">How we handle your story</Link>
        </footer>
      </div>
    </div>
  );
}
