'use client';

// Honeycomb site — interactive archive field from the Claude Design project
// (gravity clustering, vines, tweakable field) merged with the topbar,
// slideout navigation, story panel, and recorder flow from the
// projecthoneycomb.site deploy. Submissions go through this repo's backend
// (R2 presigned upload + /api/submit-experience).

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { HoneycombMark, Input, Button } from './ds';
import {
  useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakToggle,
  TweakRadio, TweakSelect, TweakColor, TweakButton,
} from './Tweaks';
import { FACES } from '../data/people';
import { PAGES } from '../data/pages';
import RecorderModal from './RecorderModal';

const TWEAK_DEFAULTS = {
  cellSize: 156,
  cellCount: 38,
  brightShare: 75,
  distribution: 'clustered',
  seed: 1,
  gaps: 3,
  fieldWidth: 1600,
  fieldHeight: 1000,
  clusterShare: 30,
  pull: 70,
  push: 255,
  dormantRespond: false,
  showFaces: true,
  ground: '#0D0806',
  backdrop: 'Archive texture',
  textureOpacity: 29,
  vignette: true,
  vines: true,
  vineSeed: 1,
};

const BACKDROPS = {
  'Archive texture': '/assets/archive-background.webp',
  'Bees at work': '/uploads/bees.jpg',
  'Honey cells': '/uploads/honey-cells.jpg',
  'Wax structure': '/uploads/wax-structure.jpg',
  'Golden dunes': '/uploads/golden-dunes.jpg',
};

// ── field generation (unchanged from the design project) ────────────────────

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const key = ([c, r]) => c + ',' + r;
const neighbors = ([c, r]) => [[c - 1, r - 1], [c - 1, r + 1], [c + 1, r - 1], [c + 1, r + 1], [c, r - 2], [c, r + 2]];
function shuffle(arr, rng) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function genField(cols, rows, count, mode, brightShare, gaps, rng) {
  const all = [];
  for (let c = 0; c < cols; c++) for (let r = c % 2; r < rows; r += 2) all.push([c, r]);
  // carve honeycomb-sized holes the field flows around — prefer interior slots so gaps read as natural
  let holeSet = new Set();
  if (gaps > 0) {
    const interior = all.filter(([c, r]) => c > 0 && c < cols - 1 && r > 1 && r < rows - 2);
    holeSet = new Set(shuffle(interior.length >= gaps ? interior : all, rng).slice(0, gaps).map(key));
  }
  const slots = all.filter((s) => !holeSet.has(key(s)));
  const valid = new Set(slots.map(key));
  count = Math.min(count, slots.length);
  let picked = [];
  if (mode === 'clustered') {
    let center = slots[0], best = Infinity;
    for (const s of slots) { const d = (s[0] - cols / 2) ** 2 + ((s[1] - rows / 2) * 0.57) ** 2; if (d < best) { best = d; center = s; } }
    const set = new Set([key(center)]); const frontier = [center]; picked = [center];
    while (picked.length < count && frontier.length) {
      const i = Math.floor(rng() * frontier.length);
      const nbrs = neighbors(frontier[i]).filter((n) => valid.has(key(n)) && !set.has(key(n)));
      if (!nbrs.length) { frontier.splice(i, 1); continue; }
      const n = nbrs[Math.floor(rng() * nbrs.length)];
      set.add(key(n)); frontier.push(n); picked.push(n);
    }
  } else if (mode === 'scattered') {
    const sh = shuffle(slots, rng); const set = new Set();
    for (const s of sh) { if (picked.length >= count) break; if (!neighbors(s).some((n) => set.has(key(n)))) { picked.push(s); set.add(key(s)); } }
    for (const s of sh) { if (picked.length >= count) break; if (!set.has(key(s))) { picked.push(s); set.add(key(s)); } }
  } else {
    picked = shuffle(slots, rng).slice(0, count);
  }
  const order = shuffle(picked, rng);
  const nBright = Math.max(1, Math.round(picked.length * brightShare / 100));
  const brightSet = new Set(order.slice(0, nBright).map(key));
  return picked.map((s) => [s[0], s[1], brightSet.has(key(s)) ? 'b' : 'd']);
}

const GATE_CELLS = [[0, 2, 'd'], [1, 1, 'd'], [1, 5, 'd'], [2, 6, 'd'], [12, 1, 'd'], [12, 5, 'd'], [13, 2, 'b'], [13, 4, 'd'], [14, 3, 'd'], [0, 4, 'b']];

function Cells({ list, size }) {
  const cx = size * 0.751, cy = size * 0.428;
  return list.map(([c, r, t]) => (
    <div key={c + ',' + r} className="cell" style={{ left: c * cx, top: r * cy, width: size }}>
      <img src="/assets/cell-bright.png" alt="" className={t === 'b' ? 'cell-bright' : 'cell-dormant'} style={{ width: '100%' }} />
    </div>
  ));
}

// ── topbar (from the projecthoneycomb.site deploy) ──────────────────────────

function TopBar({ onNav, onSubmit, activePage }) {
  const [navOpen, setNavOpen] = useState(false);
  const go = (id) => { setNavOpen(false); onNav(id); };
  useEffect(() => {
    if (!navOpen) return;
    const close = (e) => { if (!e.target.closest('.site-header')) setNavOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [navOpen]);
  return (
    <header className="site-header">
      <button className="brand" type="button" aria-label="Honeycomb home" onClick={() => go('home')}>
        <img src="/hc-connected-field-watermark.svg" alt="" />
        <span>HONEYCOMB</span>
      </button>
      <button
        className="menu-button" type="button"
        aria-expanded={navOpen} aria-controls="primary-navigation"
        onClick={() => setNavOpen((o) => !o)}
      >
        <span aria-hidden="true" /> MENU
      </button>
      <nav id="primary-navigation" className={navOpen ? 'nav-open' : ''} aria-label="Primary navigation">
        <button type="button" onClick={() => go('home')}>HOME</button>
        {PAGES.map((p) => (
          <button
            key={p.id} type="button"
            onClick={() => go(p.id)}
            style={activePage === p.id ? { color: 'var(--gold)' } : undefined}
          >
            {p.id.toUpperCase()}
          </button>
        ))}
        <button className="share-button" type="button" aria-label="Share your experience"
                onClick={() => { setNavOpen(false); onSubmit(); }}>
          SUBMIT
        </button>
      </nav>
    </header>
  );
}

// ── story panel slideout (from the projecthoneycomb.site deploy) ────────────

function StoryPanel({ page, person, onClose, openRecorder }) {
  const open = Boolean(page || person);
  return (
    <aside
      className={`story-panel ${page?.id === 'about' ? 'story-panel--about' : ''}`}
      aria-hidden={!open} aria-live="polite"
    >
      <button className="close-panel" type="button" aria-label="Close panel" onClick={onClose}>
        <span aria-hidden="true">×</span>
      </button>
      {page && (
        <>
          <div className="story-content">
            <p className="record-label">{page.eyebrow}</p>
            <h1>{page.title}</h1>
            <div className="panel-copy">{page.body({ openRecorder })}</div>
          </div>
          <PanelFooter />
        </>
      )}
      {person && person.experience && (
        <>
          <div className="story-content">
            <p className="record-label">
              FROM THE ARCHIVE{person.experience.displayName ? ` · ${String(person.experience.displayName).toUpperCase()}` : ''}
            </p>
            <h1>{person.experience.title}</h1>
            <div className="panel-copy">
              <dl className="story-meta">
                <div><dt>WHERE</dt><dd>{person.experience.location || 'Location withheld'}</dd></div>
                <div><dt>WHEN</dt><dd>{person.experience.experienceYear || '—'}</dd></div>
              </dl>
              {person.experience.mediaUrl && person.experience.recordingMode === 'video' && (
                <video className="story-media" src={person.experience.mediaUrl} controls playsInline preload="metadata" />
              )}
              {person.experience.mediaUrl && person.experience.recordingMode === 'audio' && (
                <audio className="story-media" src={person.experience.mediaUrl} controls preload="metadata" />
              )}
              {person.experience.transcript && <p className="story-summary">{person.experience.transcript}</p>}
              {(person.experience.hashtags || []).length > 0 && (
                <div className="story-tags">
                  {person.experience.hashtags.map((tag) => <span key={tag}>#{String(tag).toUpperCase()}</span>)}
                </div>
              )}
              <button className="story-action" type="button" onClick={openRecorder}>
                ADD YOUR OWN EXPERIENCE <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
          <PanelFooter />
        </>
      )}
      {person && !person.experience && (
        <>
          <div className="story-content">
            <p className="record-label">FROM THE ARCHIVE · {person.name.toUpperCase()}</p>
            <h1>{person.name}</h1>
            <div className="panel-copy">
              {person.video ? (
                <video className="story-media" src={person.video} controls playsInline preload="metadata" />
              ) : null}
              {person.about.map((p, i) => <p key={i}>{p}</p>)}
              <button className="story-action" type="button" onClick={openRecorder}>
                ADD YOUR OWN EXPERIENCE <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
          <PanelFooter />
        </>
      )}
    </aside>
  );
}

function PanelFooter() {
  return (
    <footer className="story-footer">
      <img src="/hc-connected-field-watermark-white.svg" alt="" />
      <div>
        <strong>YOUR EXPERIENCE</strong>
        <span>OUR COLLECTIVE HISTORY</span>
      </div>
      <small>HONEYCOMB</small>
    </footer>
  );
}

// ── gate (from the design project) ──────────────────────────────────────────

function Gate({ onEnter, size }) {
  const [pw, setPw] = useState('');
  const submit = (e) => { e.preventDefault(); onEnter(); };
  return (
    <div>
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 14 * size * 0.751 + size, height: 6 * size * 0.428 + size, opacity: 0.5, zIndex: 2 }}>
        <Cells list={GATE_CELLS} size={size} />
      </div>
      <div className="gate-center">
        <p className="gate-eyebrow">Private archive</p>
        <h1 className="gate-title">Enter the <em>Honeycomb.</em></h1>
        <p className="gate-body">This living archive is shared by invitation. Enter the password to continue.</p>
        <form className="gate-form" onSubmit={submit}>
          <Input label="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="" autoFocus />
          <Button type="submit">Enter</Button>
        </form>
        <p className="gate-note"><span>✦</span> The session stays unlocked for 30 days on this device.</p>
      </div>
    </div>
  );
}

// ── archive field (design project, + person panel wiring + touch panning) ───

function Archive({ t, panelOpen, focusKey, setFocusKey, onPersonSelect, experiences }) {
  const [vp, setVp] = useState(() => (typeof window === 'undefined' ? [1280, 800] : [window.innerWidth, window.innerHeight]));
  useEffect(() => {
    const onR = () => setVp([window.innerWidth, window.innerHeight]);
    onR();
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  const size = t.cellSize, cx = size * 0.751, cy = size * 0.428;
  const rows = Math.max(3, Math.floor((t.fieldHeight - size * 0.866) / cy) + 1);
  const cols = Math.max(3, Math.floor((t.fieldWidth - size) / cx) + 1);
  const W = (cols - 1) * cx + size, H = (rows - 1) * cy + size;
  // the canvas may exceed the viewport in both axes; mouse near any edge pans
  // the field that way, and touch drags pan directly (applied via ref so
  // panning skips re-renders)
  const maxPanX = Math.max(0, (W - (vp[0] - 30)) / 2);
  const maxPanY = Math.max(0, (H - (vp[1] - 30)) / 2);
  const fieldRef = useRef(null);
  const panRef = useRef({ x: 0, y: 0 });
  const apply = useCallback(() => {
    if (fieldRef.current) fieldRef.current.style.transform = `translate(calc(-50% + ${panRef.current.x}px), calc(-50% + ${panRef.current.y}px))`;
  }, []);
  useEffect(() => { panRef.current.x = Math.max(-maxPanX, Math.min(maxPanX, panRef.current.x)); panRef.current.y = Math.max(-maxPanY, Math.min(maxPanY, panRef.current.y)); apply(); });
  // desktop: mouse-edge auto panning
  useEffect(() => {
    const mouse = { x: -1, y: -1, on: false };
    const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = !(e.target.closest && e.target.closest('.twk-panel,.twk-tab,.site-header,.story-panel,.modal-backdrop')); };
    const onLeave = () => { mouse.on = false; };
    let raf;
    const ZONE = 90;
    const step = () => {
      if (mouse.on && !panelOpen && (maxPanX > 0 || maxPanY > 0)) {
        const vw = window.innerWidth, vh = window.innerHeight;
        let { x, y } = panRef.current;
        if (mouse.y >= 0 && mouse.y < ZONE) y += (1 - mouse.y / ZONE) * 14;
        else if (mouse.y > vh - ZONE) y -= (1 - (vh - mouse.y) / ZONE) * 14;
        if (mouse.x >= 0 && mouse.x < ZONE) x += (1 - mouse.x / ZONE) * 14;
        else if (mouse.x > vw - ZONE) x -= (1 - (vw - mouse.x) / ZONE) * 14;
        x = Math.max(-maxPanX, Math.min(maxPanX, x));
        y = Math.max(-maxPanY, Math.min(maxPanY, y));
        if (x !== panRef.current.x || y !== panRef.current.y) { panRef.current = { x, y }; apply(); }
      }
      raf = requestAnimationFrame(step);
    };
    window.addEventListener('mousemove', onMove);
    document.documentElement.addEventListener('mouseleave', onLeave);
    raf = requestAnimationFrame(step);
    return () => { window.removeEventListener('mousemove', onMove); document.documentElement.removeEventListener('mouseleave', onLeave); cancelAnimationFrame(raf); };
  }, [maxPanX, maxPanY, panelOpen, apply]);
  // touch: drag to pan
  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    let start = null;
    const down = (e) => {
      if (e.pointerType !== 'touch') return;
      start = { x: e.clientX, y: e.clientY, px: panRef.current.x, py: panRef.current.y, moved: false };
    };
    const move = (e) => {
      if (!start || e.pointerType !== 'touch') return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (Math.abs(dx) + Math.abs(dy) > 8) start.moved = true;
      panRef.current = {
        x: Math.max(-maxPanX, Math.min(maxPanX, start.px + dx)),
        y: Math.max(-maxPanY, Math.min(maxPanY, start.py + dy)),
      };
      apply();
    };
    const up = () => { start = null; };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [maxPanX, maxPanY, apply]);
  const field = useMemo(
    () => genField(cols, rows, t.cellCount, t.distribution, t.brightShare, t.gaps, mulberry32(t.seed * 7919 + 13)),
    [cols, rows, t.cellCount, t.distribution, t.brightShare, t.gaps, t.seed]
  );
  const base = useMemo(() => field.map(([c, r, ty]) => ({ k: c + ',' + r, t: ty, x: c * cx, y: r * cy })), [field, cx, cy]);
  useEffect(() => { setFocusKey(null); }, [field, setFocusKey]);
  // clicked cell becomes a center of gravity: kin cells draw close, the rest give way.
  // every moved cell snaps to the nearest FREE lattice slot, so cells always align and never overlap
  const placed = useMemo(() => {
    if (!focusKey) return base;
    const f = base.find((b) => b.k === focusKey);
    if (!f) return base;
    const slots = [];
    for (let c = 0; c < cols; c++) for (let r = c % 2; r < rows; r += 2) slots.push([c, r]);
    const movers = base.filter((b) => b.k !== focusKey && (b.t === 'b' || t.dormantRespond));
    const rng = mulberry32(((f.x * 31 + f.y * 7) | 0) + t.seed * 101);
    const order = shuffle(movers.map((m) => m.k), rng);
    const kinSet = new Set(order.slice(0, Math.round(movers.length * t.clusterShare / 100)));
    const occupied = new Set([focusKey]);
    base.forEach((b) => { if (b.k !== focusKey && !(b.t === 'b' || t.dormantRespond)) occupied.add(b.k); });
    const taken = new Set();
    const result = new Map();
    const assign = (b, px, py) => {
      let bestS = null, bestD = Infinity;
      for (const s of slots) {
        const kk = key(s);
        if (occupied.has(kk) || taken.has(kk)) continue;
        const d = (s[0] * cx - px) ** 2 + (s[1] * cy - py) ** 2;
        if (d < bestD) { bestD = d; bestS = s; }
      }
      if (!bestS) return;
      taken.add(key(bestS));
      result.set(b.k, { x: bestS[0] * cx, y: bestS[1] * cy });
    };
    const byDist = (arr) => arr.slice().sort((a, b2) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b2.x - f.x, b2.y - f.y));
    for (const b of byDist(movers.filter((m) => kinSet.has(m.k)))) {
      const dx = b.x - f.x, dy = b.y - f.y, d = Math.hypot(dx, dy) || 1;
      const nd = Math.max(d * (1 - t.pull / 100), size * 0.87);
      assign(b, f.x + dx / d * nd, f.y + dy / d * nd);
    }
    for (const b of byDist(movers.filter((m) => !kinSet.has(m.k)))) {
      const dx = b.x - f.x, dy = b.y - f.y, d = Math.hypot(dx, dy) || 1;
      const nd = d + t.push;
      assign(b, Math.min(Math.max(f.x + dx / d * nd, 0), W - size), Math.min(Math.max(f.y + dy / d * nd, 0), H - size));
    }
    return base.map((b) => result.has(b.k) ? { ...b, kin: kinSet.has(b.k), ...result.get(b.k) } : b);
  }, [base, focusKey, cols, rows, cx, cy, t.clusterShare, t.pull, t.push, t.dormantRespond, t.seed, size, W, H]);
  // bright cells hold the community faces first; approved archive submissions
  // (from /api/experiences) claim the remaining bright cells, their attached
  // photo becoming the cell face
  const faceOf = useMemo(() => {
    const m = new Map();
    let i = 0, e = 0;
    for (const b of base) {
      if (b.t !== 'b') continue;
      if (i < FACES.length) {
        m.set(b.k, FACES[i++]);
      } else if (e < experiences.length) {
        const exp = experiences[e++];
        const name = exp.displayName || exp.title || 'Archive voice';
        m.set(b.k, { src: exp.photoUrl || null, photo: true, name, person: { name, experience: exp } });
      }
    }
    return m;
  }, [base, experiences]);
  // vines grow from the bottom and climb the cluster's outer silhouette — left and
  // right edge chains plus sprouts under the lowest cells — wrapping the formation
  // as currently shaped; they render beneath the cells, never obscuring comb contents
  const vines = useMemo(() => {
    if (!t.vines) return [];
    const rng = mulberry32(t.vineSeed * 40093 + t.seed * 7 + 5);
    const out = [];
    const rowsM = new Map();
    for (const b of base) { const arr = rowsM.get(b.y) || []; arr.push(b); rowsM.set(b.y, arr); }
    const ys = [...rowsM.keys()].sort((a, b2) => b2 - a);
    for (const side of ['L', 'R']) {
      const chain = ys.map((y) => { const arr = rowsM.get(y); return arr.reduce((m, c) => (side === 'L' ? (c.x < m.x ? c : m) : (c.x > m.x ? c : m)), arr[0]); });
      const cover = 0.55 + rng() * 0.45;
      const sgn = side === 'L' ? -1 : 1;
      for (let i = 0; i < Math.floor((chain.length - 1) * cover); i++) {
        if (rng() < 0.3) continue;
        const lo = chain[i], hi = chain[i + 1];
        // only hug near-adjacent silhouette steps — skip discontinuous jumps that would cross the interior
        if (Math.abs(hi.x - lo.x) > cx * 1.6 || (lo.y - hi.y) > cy * 4.5) continue;
        const ax = lo.x + size / 2 + sgn * size * 0.52, ay = lo.y + size * 0.75;
        const bx = hi.x + size / 2 + sgn * size * 0.52, by = hi.y + size * 0.75;
        const th = Math.atan2(by - ay, bx - ax) + (rng() - 0.5) * 0.25;
        out.push({ id: `${t.vineSeed}-${side}${i}`, x: ax, y: ay, rot: th * 180 / Math.PI + 90, L: Math.min(Math.hypot(bx - ax, by - ay) * (2.0 + rng() * 0.6), size * 3.4), delay: i * 170 + (side === 'R' ? 90 : 0) });
      }
    }
    const colsM = new Map();
    for (const b of base) { const c = b.k.split(',')[0]; if (!colsM.has(c) || b.y > colsM.get(c).y) colsM.set(c, b); }
    for (const b of shuffle([...colsM.values()], rng).slice(0, Math.max(2, Math.round(colsM.size * 0.3)))) {
      const th = -Math.PI / 2 + (rng() - 0.5) * 0.35;
      out.push({ id: `${t.vineSeed}-B${b.k}`, x: b.x + size / 2 + (rng() - 0.5) * size * 0.4, y: b.y + size * 1.02, rot: th * 180 / Math.PI + 90, L: size * (2.2 + rng() * 1.3), delay: Math.round(rng() * 200) });
    }
    return out;
  }, [base, t.vines, t.vineSeed, t.seed, size, cx, cy]);
  const toggleCell = (b) => {
    if (b.k === focusKey) {
      setFocusKey(null);
      onPersonSelect(null);
    } else {
      setFocusKey(b.k);
      onPersonSelect(faceOf.get(b.k) ? faceOf.get(b.k).person : null);
    }
  };
  return (
    <div>
      <div className="arch-clip" style={panelOpen ? { filter: 'brightness(0.83)' } : undefined}>
        <div className="arch-field" ref={fieldRef} style={{ width: W, height: H, transform: 'translate(-50%,-50%)', marginTop: 12 }} onClick={(e) => { if (e.target === e.currentTarget) { setFocusKey(null); onPersonSelect(null); } }}>
          {vines.map((v) => (
            <div key={v.id} className="vine-sprite" aria-hidden="true" style={{ left: v.x, top: v.y }}>
              <img src="/uploads/vine-group2-alpha.png" alt="" style={{ height: v.L, transform: `translateX(-34.5%) rotate(${v.rot}deg)`, animationDelay: v.delay + 'ms' }} />
            </div>
          ))}
          {placed.map((b) => (
            <div key={b.k} className="cell" style={{ left: b.x, top: b.y, width: size, zIndex: b.k === focusKey ? 3 : b.kin ? 2 : 1 }}>
              {b.t === 'b'
                ? (
                  <div className={'hexcell' + (b.k === focusKey ? ' cell-focus' : '')} tabIndex="0" role="button"
                       aria-label={faceOf.get(b.k) ? faceOf.get(b.k).name : 'Bright cell'}
                       onClick={() => toggleCell(b)}
                       onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCell(b); } }}>
                    <img src="/assets/cell-bright.png" alt="" />
                    {t.showFaces && faceOf.get(b.k) && faceOf.get(b.k).src && (
                      <img
                        className={faceOf.get(b.k).photo ? 'cell-face cell-face-photo' : 'cell-face'}
                        src={faceOf.get(b.k).src}
                        alt={faceOf.get(b.k).name}
                      />
                    )}
                  </div>
                )
                : <img src="/assets/cell-bright.png" alt="" className="cell-dormant" style={{ width: '100%' }} />}
            </div>
          ))}
        </div>
      </div>
      <p className="arch-tag">{focusKey ? 'Click the lit cell again to release the field' : 'Every experience is treated as a point of light within a shared history'}</p>
    </div>
  );
}

// ── app shell ───────────────────────────────────────────────────────────────

export default function HoneycombApp() {
  const [view, setView] = useState('gate');
  const [t, setTweak, resetTweaks] = useTweaks(TWEAK_DEFAULTS);
  const [pageId, setPageId] = useState(null);
  const [person, setPerson] = useState(null);
  const [focusKey, setFocusKey] = useState(null);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [experiences, setExperiences] = useState([]);

  // approved archive submissions join the field as additional bright cells
  useEffect(() => {
    fetch('/api/experiences')
      .then((r) => (r.ok ? r.json() : { experiences: [] }))
      .then((d) => setExperiences((d.experiences || []).filter((e) => e.privacy !== 'archive')))
      .catch(() => undefined);
  }, []);

  // restore unlocked session (30 days) on the client only
  useEffect(() => {
    try {
      const until = Number(localStorage.getItem('hc-unlocked-until') || 0);
      if (until > Date.now()) setView('archive');
    } catch { /* private mode */ }
  }, []);

  const enter = () => {
    setView('archive');
    try { localStorage.setItem('hc-unlocked-until', String(Date.now() + 30 * 24 * 3600 * 1000)); } catch { /* private mode */ }
  };

  const closePanel = useCallback(() => {
    setPageId(null);
    setPerson(null);
    setFocusKey(null);
  }, []);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') closePanel(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [closePanel]);

  const onNav = (id) => {
    if (id === 'home') { closePanel(); return; }
    setPerson(null);
    setFocusKey(null);
    setPageId(id);
  };

  const onPersonSelect = (p) => {
    setPageId(null);
    setPerson(p);
  };

  const openRecorder = () => setRecorderOpen(true);
  const page = PAGES.find((p) => p.id === pageId) || null;
  const panelOpen = Boolean(page || person);

  return (
    <div className="hc-page" style={{ background: t.ground }}>
      <img src={BACKDROPS[t.backdrop] || BACKDROPS['Archive texture']} alt="" className="hc-texture" style={{ opacity: t.textureOpacity / 100 }} />
      {t.vignette && <div className="hc-vignette"></div>}
      <div className="hc-view" style={{ opacity: view === 'gate' ? 1 : 0, pointerEvents: view === 'gate' ? 'auto' : 'none' }}>
        <Gate onEnter={enter} size={t.cellSize} />
      </div>
      <div className="hc-view" style={{ opacity: view === 'archive' ? 1 : 0, pointerEvents: view === 'archive' ? 'auto' : 'none' }}>
        {view === 'archive' && (
          <Archive
            t={t}
            panelOpen={panelOpen}
            focusKey={focusKey}
            setFocusKey={setFocusKey}
            onPersonSelect={onPersonSelect}
            experiences={experiences}
          />
        )}
      </div>
      <div className="hc-frame"></div>
      <TopBar onNav={onNav} onSubmit={openRecorder} activePage={pageId} />
      <StoryPanel page={page} person={person} onClose={closePanel} openRecorder={openRecorder} />
      {recorderOpen && <RecorderModal onClose={() => setRecorderOpen(false)} />}
      <TweaksPanel>
        <TweakSection label="Cells" />
        <TweakSlider label="Cell size" value={t.cellSize} min={80} max={170} unit="px" onChange={(v) => setTweak('cellSize', v)} />
        <TweakSlider label="Cell count" value={t.cellCount} min={1} max={100} onChange={(v) => setTweak('cellCount', v)} />
        <TweakSlider label="Gaps" value={t.gaps} min={0} max={8} onChange={(v) => setTweak('gaps', v)} />
        <TweakSlider label="Field width" value={t.fieldWidth} min={800} max={2400} step={20} unit="px" onChange={(v) => setTweak('fieldWidth', v)} />
        <TweakSlider label="Field height" value={t.fieldHeight} min={400} max={1600} step={20} unit="px" onChange={(v) => setTweak('fieldHeight', v)} />
        <TweakSlider label="Bright share" value={t.brightShare} min={10} max={90} unit="%" onChange={(v) => setTweak('brightShare', v)} />
        <TweakRadio label="Distribution" value={t.distribution} options={['even', 'clustered', 'scattered']} onChange={(v) => setTweak('distribution', v)} />
        <TweakToggle label="Show faces" value={t.showFaces} onChange={(v) => setTweak('showFaces', v)} />
        <TweakButton label="Reshuffle field" onClick={() => setTweak('seed', (t.seed || 1) + 1)} />
        <TweakSection label="Gravity" />
        <TweakSlider label="Cluster share" value={t.clusterShare} min={0} max={100} unit="%" onChange={(v) => setTweak('clusterShare', v)} />
        <TweakSlider label="Pull strength" value={t.pull} min={20} max={90} unit="%" onChange={(v) => setTweak('pull', v)} />
        <TweakSlider label="Push distance" value={t.push} min={40} max={340} unit="px" onChange={(v) => setTweak('push', v)} />
        <TweakToggle label="Dormant cells respond" value={t.dormantRespond} onChange={(v) => setTweak('dormantRespond', v)} />
        <TweakSection label="Background" />
        <TweakColor label="Ground" value={t.ground} options={['#0D0806', '#120B07', '#1A1210', '#261711']} onChange={(v) => setTweak('ground', v)} />
        <TweakSelect label="Texture image" value={t.backdrop} options={Object.keys(BACKDROPS)} onChange={(v) => setTweak('backdrop', v)} />
        <TweakSlider label="Texture" value={t.textureOpacity} min={0} max={70} unit="%" onChange={(v) => setTweak('textureOpacity', v)} />
        <TweakToggle label="Vignette" value={t.vignette} onChange={(v) => setTweak('vignette', v)} />
        <TweakToggle label="Vines" value={t.vines} onChange={(v) => setTweak('vines', v)} />
        <TweakButton label="Randomize vine growth" onClick={() => setTweak('vineSeed', (t.vineSeed || 1) + 1)} />
        <TweakSection label="Session" />
        <TweakButton label="Reset all tweaks" secondary onClick={resetTweaks} />
      </TweaksPanel>
    </div>
  );
}
