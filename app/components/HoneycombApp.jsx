'use client';

// Honeycomb site — interactive archive field from the Claude Design project
// (gravity clustering, tweakable field) merged with the topbar,
// slideout navigation, story panel, and recorder flow from the
// projecthoneycomb.site deploy. Submissions go through this repo's backend
// (R2 presigned upload + /api/submit-experience).

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { HoneycombMark, Input, Button } from './ds';
import {
  useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakToggle,
  TweakRadio, TweakSelect, TweakColor, TweakButton,
} from './Tweaks';
import { PEOPLE } from '../data/people';
import { PAGES } from '../data/pages';
import RecorderModal from './RecorderModal';
import { useCombReveal } from './CombReveal';
import { cellLabel, initialsOf } from '../lib/name';

const TWEAK_DEFAULTS = {
  // the settings the review settled on, 2026-09-18, revised by Allen 2026-09-29
  cellSize: 150,
  cellCount: 50,
  brightShare: 70,
  distribution: 'clustered',
  seed: 1,
  gaps: 8,
  fieldWidth: 1600,
  fieldHeight: 1000,
  clusterShare: 76,
  clusterBy: 'tags',
  pull: 72,
  push: 251,
  dormantRespond: false,
  dormantLook: 'gold',  // 'gold' leaf interiors, or 'wax' for the cracked comb
  cellBorder: 'gold',   // the frame round a bright cell: 'gold' | 'wax' | 'line' | 'none'
  faceInset: 9,         // % of the cell's width the face stays in from the edge (9 = the gold frame's inner edge)
  showFaces: true,
  // the pointer as a lamp over the comb
  mouseLight: true,
  lightReach: 430,      // % of a cell's width — how far the pool carries
  lightStrength: 63,    // %
  lightAfterglow: 1180, // ms for a cell to let go of the light
  cellCenter: 0,        // % of the middle given over to the ground behind
  faceGlaze: 72,        // % — the film over a portrait for the light to catch
  cellOpacity: 70,
  dormantBright: 45,
  ground: '#000000',
  backdrop: 'None',
  textureOpacity: 0,
  warmth: 28,
  faceGrade: 'bright',
  vignette: true,
  topbarTucks: false,
  // the V5 reveal: a pulse traces each cell as the comb forms
  combReveal: true,
};

/**
 * The pointer as a light source over the comb.
 *
 * Each cell gets two custom properties and nothing else:
 *   --lit  0..1, how much of the light is falling on it
 *   --lx   -1..1, which side the light is coming from
 *
 * React is deliberately not involved. Re-rendering fifty cells on every
 * pointermove would be absurd for what is a lighting change, so this walks the
 * DOM nodes once per layout and then only writes two variables per cell per
 * frame. The afterglow is a CSS transition on opacity rather than anything
 * animated here — the light stops moving, the glow fades on its own.
 *
 * Positions come from the layout the field was given, not from
 * getBoundingClientRect, which would force layout every frame. While cells are
 * travelling to new places their real position lags the value used here, and
 * the light sweeps across their interiors as they settle. That is the intended
 * behaviour rather than an artefact of the shortcut.
 */
function useFieldLight(fieldRef, { enabled, reach, cells }) {
  useEffect(() => {
    const field = fieldRef.current;
    if (!field || !enabled) return undefined;

    // No pointer, no light. Touch devices would otherwise get a light stuck
    // wherever the last tap landed.
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!fine.matches) return undefined;

    let nodes = [];
    const collect = () => {
      nodes = Array.from(field.querySelectorAll('.cell[data-cx]')).map((el) => ({
        el,
        cx: Number(el.dataset.cx),
        cy: Number(el.dataset.cy),
        half: Number(el.dataset.half) || 0,
      }));
    };
    collect();

    let raf = 0;
    let px = -1e6;
    let py = -1e6;
    let dirty = false;

    const paint = () => {
      raf = 0;
      dirty = false;
      for (const n of nodes) {
        const dx = px - (n.cx + n.half);
        const dy = py - (n.cy + n.half);
        const d = Math.hypot(dx, dy);
        // Smooth falloff rather than a hard edge: squared so the centre of the
        // pool is clearly brighter than its rim, the way a lamp behaves.
        const t = Math.max(0, 1 - d / reach);
        const lit = t * t;
        n.el.style.setProperty('--lit', lit.toFixed(3));
        // Which way the highlight leans. Only meaningful while lit, so it is
        // clamped to the cell's own width.
        n.el.style.setProperty('--lx', Math.max(-1, Math.min(1, dx / (n.half * 2 || 1))).toFixed(3));
      }
    };

    const schedule = () => {
      if (dirty) return;
      dirty = true;
      raf = requestAnimationFrame(paint);
    };

    const onMove = (e) => {
      const box = field.getBoundingClientRect();
      px = e.clientX - box.left;
      py = e.clientY - box.top;
      schedule();
    };

    const onLeave = () => {
      px = -1e6;
      py = -1e6;
      schedule();
    };

    field.addEventListener('pointermove', onMove, { passive: true });
    field.addEventListener('pointerleave', onLeave, { passive: true });

    return () => {
      field.removeEventListener('pointermove', onMove);
      field.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
      for (const n of nodes) {
        n.el.style.removeProperty('--lit');
        n.el.style.removeProperty('--lx');
      }
    };
    // `cells` changes whenever the field is rebuilt or rearranged, which is
    // exactly when the node list and their positions need collecting again.
  }, [fieldRef, enabled, reach, cells]);
}

// A backdrop is a still, or nothing at all — 'None' leaves the ground colour
// on its own. (Video loops were tried and dropped: they cost the browser.)
const BACKDROPS = {
  'None': null,
  'Archive texture': '/assets/archive-background.webp',
  'Bees at work': '/uploads/bees.jpg',
  'Honey cells': '/uploads/honey-cells.jpg',
  'Wax structure': '/uploads/wax-structure.jpg',
  'Golden dunes': '/uploads/golden-dunes.jpg',
  'Comb, backlit': '/uploads/comb-backlit.webp',
  'Wax cells': '/uploads/wax-cells.webp',
  'Honey frame': '/uploads/honey-frame.webp',
  'Honey, dripping': '/uploads/honey-dripping.webp',
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

// Everything a cell can be found by. Community faces search their name and
// panel text; archive submissions search their whole record.
function haystack(face) {
  const p = face.person || {};
  const e = p.experience;
  const parts = [face.name, p.name];
  if (e) {
    parts.push(e.title, e.location, e.experienceYear, e.experienceType, e.transcript, e.displayName, ...(e.hashtags || []));
  } else if (Array.isArray(p.about)) {
    parts.push(...p.about);
  }
  return parts.filter(Boolean).join(' ').toLowerCase();
}

// ── relatedness ───────────────────────────────────────────────────────────
// What the comb means by "kin". Two voices are related when they share tags,
// and a tag shared by only two stories says far more than one carried by
// twenty — so each tag is weighted by how rare it is across the whole archive
// (the usual inverse-document-frequency idea), and the pair is scored by
// cosine similarity over those weights. The result is 0..1: 0 for nothing in
// common, 1 for an identical tag set.
function tagsOf(face) {
  const e = face && face.person && face.person.experience;
  if (!e || !Array.isArray(e.hashtags)) return [];
  const seen = new Set();
  for (const raw of e.hashtags) {
    const t = String(raw).trim().toLowerCase().replace(/^#/, '');
    if (t) seen.add(t);
  }
  return [...seen];
}

// Weight every tag once per field, not once per comparison.
function buildTagWeights(faceOf) {
  const df = new Map();
  let docs = 0;
  for (const face of faceOf.values()) {
    const tags = tagsOf(face);
    if (!tags.length) continue;
    docs++;
    for (const t of tags) df.set(t, (df.get(t) || 0) + 1);
  }
  const weight = new Map();
  for (const [t, n] of df) weight.set(t, Math.log(1 + docs / n));
  // Pre-compute each cell's tag vector and its magnitude, so scoring a pair is
  // one pass over the smaller tag list.
  const vec = new Map();
  for (const [k, face] of faceOf) {
    const tags = tagsOf(face);
    if (!tags.length) continue;
    let mag = 0;
    for (const t of tags) { const w = weight.get(t) || 0; mag += w * w; }
    if (mag > 0) vec.set(k, { tags: new Set(tags), mag: Math.sqrt(mag) });
  }
  return { weight, vec };
}

function relatedness(aKey, bKey, { weight, vec }) {
  const a = vec.get(aKey), b = vec.get(bKey);
  if (!a || !b) return 0;
  const [small, large] = a.tags.size <= b.tags.size ? [a, b] : [b, a];
  let dot = 0;
  for (const t of small.tags) {
    if (!large.tags.has(t)) continue;
    const w = weight.get(t) || 0;
    dot += w * w;
  }
  return dot > 0 ? dot / (a.mag * b.mag) : 0;
}

// Search rearranges the field itself: matches gather into the middle, everything
// else gives way outward. Same lattice-snapping rule as the click gravity, so
// cells stay aligned and never overlap.
function gatherMatches(base, matchKeys, cols, rows, cx, cy, size, W, H, push) {
  const centerX = (W - size) / 2, centerY = (H - size) / 2;
  const distToCenter = (x, y) => Math.hypot(x - centerX, y - centerY);
  const slots = [];
  for (let c = 0; c < cols; c++) {
    for (let r = c % 2; r < rows; r += 2) {
      slots.push({ s: [c, r], x: c * cx, y: r * cy });
    }
  }
  slots.sort((a, b) => distToCenter(a.x, a.y) - distToCenter(b.x, b.y));
  const taken = new Set();
  const result = new Map();

  const matched = base.filter((b) => matchKeys.has(b.k))
    .sort((a, b) => distToCenter(a.x, a.y) - distToCenter(b.x, b.y));
  let si = 0;
  for (const b of matched) {
    while (si < slots.length && taken.has(key(slots[si].s))) si++;
    if (si >= slots.length) break;
    const slot = slots[si++];
    taken.add(key(slot.s));
    result.set(b.k, { x: slot.x, y: slot.y });
  }

  // the rest move outward, farthest first so they don't trap each other
  const others = base.filter((b) => !matchKeys.has(b.k))
    .sort((a, b) => distToCenter(b.x, b.y) - distToCenter(a.x, a.y));
  for (const b of others) {
    const dx = b.x - centerX, dy = b.y - centerY;
    const d = Math.hypot(dx, dy) || 1;
    const tx = centerX + (dx / d) * (d + push), ty = centerY + (dy / d) * (d + push);
    let best = null, bestD = Infinity;
    for (const slot of slots) {
      if (taken.has(key(slot.s))) continue;
      const dd = (slot.x - tx) ** 2 + (slot.y - ty) ** 2;
      if (dd < bestD) { bestD = dd; best = slot; }
    }
    if (best) {
      taken.add(key(best.s));
      result.set(b.k, { x: best.x, y: best.y });
    }
  }
  return base.map((b) => ({
    ...b,
    match: matchKeys.has(b.k),
    ...(result.get(b.k) || {}),
  }));
}

function Cells({ list, size }) {
  const cx = size * 0.751, cy = size * 0.428;
  return list.map(([c, r, t]) => (
    <div key={c + ',' + r} className="cell" style={{ left: c * cx, top: r * cy, width: size }}>
      <img src="/assets/cell-bright.png" alt="" className={t === 'b' ? 'cell-bright' : 'cell-dormant'} style={{ width: '100%' }} />
    </div>
  ));
}

// ── the comb mark, as a magnifier ───────────────────────────────────────────
// The sixteen cells of the watermark, drawn one by one so they can move. On
// hover they leave their places and gather onto the rim of a single thick
// hexagon at the centre of the mark — the lens — and a handle draws out from
// its lower edge. The comb becomes the glass rather than being covered by one.

const COMB_CELLS = [
  [115, 250], [115, 400], [250, 325], [250, 475],
  [385, 100], [385, 250], [385, 400],
  [520, 175], [520, 325],
  [655, 100], [655, 250], [655, 400],
  [790, 175], [790, 325], [790, 475],
  [925, 250],
];
const LENS = { x: 520, y: 290, r: 150 };
const hexPoints = (cx, cy, r) => {
  const h = r * 0.8333; // the watermark's cells are 180 wide by 150 tall
  return `${cx + r},${cy} ${cx + r / 2},${cy + h} ${cx - r / 2},${cy + h} ${cx - r},${cy} ${cx - r / 2},${cy - h} ${cx + r / 2},${cy - h}`;
};
const COMB_TARGETS = COMB_CELLS.map(([cx, cy]) => {
  // each cell heads for the point on the lens rim that lies in its own
  // direction from the centre, so the ring is made of the cells arriving
  const a = Math.atan2((cy - LENS.y) * 1.6, cx - LENS.x); // the mark is wide; stretch y so the ring fills evenly
  const dist = Math.hypot(cx - LENS.x, cy - LENS.y);
  return {
    dx: LENS.x + Math.cos(a) * LENS.r - cx,
    dy: LENS.y + Math.sin(a) * LENS.r * 0.87 - cy,
    delay: Math.round((dist / 480) * 110),
  };
});

function CombMark() {
  const hp = LENS.r * 0.87;
  return (
    <svg className="comb-mark" viewBox="0 0 1040 575" aria-hidden="true" focusable="false">
      <g className="cm-cells" fill="none" stroke="#E3A444" strokeWidth="11" strokeLinejoin="round">
        {COMB_CELLS.map(([cx, cy], i) => (
          <polygon
            key={i} className="cm-cell" points={hexPoints(cx, cy, 90)}
            style={{ '--dx': `${COMB_TARGETS[i].dx.toFixed(1)}px`, '--dy': `${COMB_TARGETS[i].dy.toFixed(1)}px`, '--d': `${COMB_TARGETS[i].delay}ms` }}
          />
        ))}
      </g>
      <g className="cm-glass" fill="none" stroke="#F2BF49" strokeLinejoin="round" strokeLinecap="round">
        <polygon className="cm-lens" points={`${LENS.x + LENS.r},${LENS.y} ${LENS.x + LENS.r / 2},${LENS.y + hp} ${LENS.x - LENS.r / 2},${LENS.y + hp} ${LENS.x - LENS.r},${LENS.y} ${LENS.x - LENS.r / 2},${LENS.y - hp} ${LENS.x + LENS.r / 2},${LENS.y - hp}`} />
        <line className="cm-handle" x1={LENS.x + LENS.r / 2 + 8} y1={LENS.y + hp + 6} x2={LENS.x + LENS.r / 2 + 150} y2={LENS.y + hp + 128} pathLength="1" />
      </g>
    </svg>
  );
}

// Portrait grades for the Tweaks "Portrait grade" control. Applied to every
// face in the comb through --face-grade (see .hexcell .cell-face in
// globals.css). "clean" lowers saturation and turns the hue a few degrees
// off amber; "bright" goes further and lifts the portrait itself slightly.
const FACE_GRADES = {
  colorized: 'saturate(1)',
  clean: 'saturate(0.86) hue-rotate(-7deg) contrast(1.04)',
  bright: 'saturate(0.8) hue-rotate(-10deg) contrast(1.05) brightness(1.07)',
};

// ── topbar (from the projecthoneycomb.site deploy) ──────────────────────────

function TopBar({ onNav, onSubmit, activePage, query, onQuery, matchCount, autohide, keepVisible, session, onSignOut }) {
  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [tucked, setTucked] = useState(false);
  // On a desktop the field is open from the start (CSS, .site-search), so
  // search is on screen at every scroll position without a click; the state
  // here only widens it on focus. On a phone it opens into a strip under the
  // header, so there it stays behind the magnifier until wanted.
  const searchRef = useRef(null);
  const go = (id) => { setNavOpen(false); setSearchOpen(false); onNav(id); };

  // On a phone the menu and the search both open into the same strip under the
  // header, so having both open put one on top of the other. They are now
  // mutually exclusive: opening either closes the other.
  const openSearch = (open) => {
    setSearchOpen(open);
    if (open) {
      setNavOpen(false);
      setTimeout(() => searchRef.current?.focus(), 60);
    }
  };
  const openNav = (open) => {
    setNavOpen(open);
    if (open) setSearchOpen(false);
  };
  useEffect(() => {
    if (!navOpen) return;
    const close = (e) => { if (!e.target.closest('.site-header')) openNav(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [navOpen]);
  useEffect(() => {
    const focus = () => { openSearch(true); };
    window.addEventListener('hc-focus-search', focus);
    return () => window.removeEventListener('hc-focus-search', focus);
  }, []);
  // desktop only: the bar tucks up out of the way and returns when the pointer
  // comes near the top of the screen
  useEffect(() => {
    if (!autohide || window.innerWidth < 881) { setTucked(false); return; }
    const settle = setTimeout(() => setTucked(true), 2600);
    const onMove = (e) => setTucked(e.clientY > 130);
    window.addEventListener('mousemove', onMove);
    return () => { clearTimeout(settle); window.removeEventListener('mousemove', onMove); };
  }, [autohide]);
  const hidden = tucked && !navOpen && !keepVisible && !query;
  return (
    <>
      {hidden && <div className="topbar-peek" aria-hidden="true" />}
      <header className={`site-header${hidden ? ' site-header--tucked' : ''}${searchFocused || query ? ' site-header--searching' : ''}`}>
      {/* The wordmark on the left is the home link, which is why HOME is no
          longer a nav item. The comb sits in the middle of the bar on its own
          and is the way into search — it is the main thing the site does, so
          it gets the most recognisable mark, centred, and it gathers itself
          into a magnifying glass every few seconds so nobody has to hover to
          find that out. */}
      <button className="brand-word" type="button" aria-label="Honeycomb home" onClick={() => go('home')}>
        HONEYCOMB
      </button>
      <div className={`brand${searchFocused || query ? ' brand--searching' : ''}`}>
        <button
          className="search-orb" type="button"
          aria-label="Search the archive" aria-expanded={searchOpen || Boolean(query)}
          onClick={() => { if (searchOpen || query) searchRef.current?.focus(); else openSearch(true); }}
        >
          <CombMark />
        </button>
      </div>
      <div className={`site-search${searchOpen || query ? ' is-open' : ''}${searchFocused ? ' is-focused' : ''}`}>
        <button
          className="search-toggle" type="button" aria-label="Search the archive"
          onClick={() => { if (query) { onQuery(''); openSearch(false); } else openSearch(!searchOpen); }}
        >
          <span aria-hidden="true">{searchOpen || query ? '×' : '⌕'}</span>
        </button>
        <input
          ref={searchRef} className="search-input" type="search" value={query}
          onChange={(e) => onQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
          placeholder="Search place, year, tag, or words"
          aria-label="Search the archive"
        />
        {query && (
          <>
            <span className="search-count">{matchCount}</span>
            <button className="search-clear" type="button" aria-label="Clear search" onClick={() => { onQuery(''); searchRef.current?.focus(); }}>×</button>
          </>
        )}
      </div>
      <button
        className="menu-button" type="button"
        aria-expanded={navOpen} aria-controls="primary-navigation"
        onClick={() => openNav(!navOpen)}
      >
        <span aria-hidden="true" /> MENU
      </button>
      <nav id="primary-navigation" className={navOpen ? 'nav-open' : ''} aria-label="Primary navigation">
        {/* no HOME here on purpose — the wordmark is the home link */}
        {PAGES.map((p) => (p.href
          ? <a key={p.id} href={p.href}>{p.id.toUpperCase()}</a>
          : (
          <button
            key={p.id} type="button"
            onClick={() => go(p.id)}
            style={activePage === p.id ? { color: 'var(--gold)' } : undefined}
          >
            {p.id.toUpperCase()}
          </button>
          )))}
        {session && session.role && session.role !== 'visitor' && (
          <button
            className="member-chip" type="button"
            title={session.role === 'moderator' ? 'Signed in as moderator — click to sign out' : 'Signed in — click to sign out'}
            onClick={() => { if (confirm('Sign out of the archive on this device?')) onSignOut(); }}
          >
            <i aria-hidden="true" />
            {session.role === 'moderator' ? 'MODERATOR' : (session.name || 'MEMBER').toUpperCase()}
          </button>
        )}
        <button className="share-button" type="button" aria-label="Share your experience"
                onClick={() => { setNavOpen(false); onSubmit(); }}>
          SUBMIT
        </button>
      </nav>
      </header>
    </>
  );
}

// ── story panel slideout (from the projecthoneycomb.site deploy) ────────────

function StoryPanel({ page, person, onClose, openRecorder, focusSearch }) {
  const open = Boolean(page || person);
  const asideRef = useRef(null);
  // A down-arrow at the foot of the copy while there is more of it below the
  // fold, gone once the reader reaches the end. Driven by the scroll metrics
  // of .panel-copy and set on its parent, where the arrow is drawn (CSS
  // .story-content::after). The native scrollbar stays; this is in addition.
  useEffect(() => {
    const el = asideRef.current?.querySelector('.panel-copy');
    const host = el?.parentElement;
    if (!el || !host) return undefined;
    const update = () => { host.dataset.more = el.scrollHeight - el.scrollTop - el.clientHeight > 12 ? 'true' : 'false'; };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    for (const child of el.children) ro.observe(child);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); delete host.dataset.more; };
  }, [page, person]);
  return (
    <aside
      ref={asideRef}
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
            <div className="panel-copy">{page.body({ openRecorder, focusSearch })}</div>
          </div>
          <PanelFooter />
        </>
      )}
      {person && person.experience && (
        <>
          <div className="story-content">
            <p className="record-label">
              FROM THE ARCHIVE{person.experience.displayName ? ` · ${String(person.experience.displayName).toUpperCase()}` : ''}
              {person.experience.privacy === 'community' && <span className="community-badge">COMMUNITY ONLY</span>}
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
              {person.experience.transcript && (
                <div className="story-summary">
                  {/* Dictated accounts run long and arrive with paragraph
                      breaks in them. Rendering the whole transcript as one
                      block turned a five-minute testimony into a wall. */}
                  {String(person.experience.transcript).split(/\n\s*\n/).map((para, i) => (
                    <p key={i}>{para.trim()}</p>
                  ))}
                </div>
              )}
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
  const [checking, setChecking] = useState(false);
  const [wrong, setWrong] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setChecking(true);
    setWrong(false);
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        onEnter(data);
      } else setWrong(true);
    } catch {
      setWrong(true);
    } finally {
      setChecking(false);
    }
  };
  return (
    <div>
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 14 * size * 0.751 + size, height: 6 * size * 0.428 + size, opacity: 0.5, zIndex: 2 }}>
        <Cells list={GATE_CELLS} size={size} />
      </div>
      <div className="gate-center">
        <p className="gate-eyebrow">Private archive</p>
        <h1 className="gate-title">Enter the <em>Honeycomb.</em></h1>
        <p className="gate-body">This living archive is shared by invitation. Enter the password, or your member access code, to continue.</p>
        <form className="gate-form" onSubmit={submit}>
          <Input label="Password or access code" type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder=""
                 hint={wrong ? 'That password or code was not recognized.' : undefined} invalid={wrong} autoFocus />
          <Button type="submit" disabled={checking}>{checking ? 'Checking…' : 'Enter'}</Button>
        </form>
        <p className="gate-note"><span>✦</span> The session stays unlocked for 30 days on this device.</p>
      </div>
    </div>
  );
}

// ── archive field (design project, + person panel wiring + touch panning) ───

function Archive({ t, panelOpen, focusKey, setFocusKey, onPersonSelect, experiences, faces, query, onMatchCount, ready }) {
  const [vp, setVp] = useState(() => (typeof window === 'undefined' ? [1280, 800] : [window.innerWidth, window.innerHeight]));
  useEffect(() => {
    const onR = () => setVp([window.innerWidth, window.innerHeight]);
    onR();
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  // On a phone the comb is not a canvas to pan around: it is a column as wide
  // as the screen and as tall as the archive needs, scrolled like a page. A
  // wide field on a narrow screen left most of the voices off the edge with
  // nothing to say they were there.
  const phone = vp[0] < 881;
  const phoneCols = vp[0] < 400 ? 3 : vp[0] < 700 ? 4 : 5;
  const size = phone
    ? Math.min(t.cellSize, Math.floor((vp[0] - 36) / ((phoneCols - 1) * 0.751 + 1)))
    : t.cellSize;
  const cx = size * 0.751, cy = size * 0.428;
  // the comb grows to hold every voice: enough cells that each community face
  // and each approved story gets its own, whatever the cell-count slider says
  const voices = faces.length + experiences.length;
  const cellCount = Math.max(t.cellCount, Math.ceil(voices / Math.max(0.1, t.brightShare / 100)));
  const cols = phone ? phoneCols : Math.max(3, Math.floor((t.fieldWidth - size) / cx) + 1);
  // the lattice holds about cols*rows/2 cells; on a phone give it just enough
  // rows for every cell plus the gaps, with a little slack so it can breathe
  const rows = phone
    ? Math.max(6, Math.ceil(((cellCount + (t.gaps || 0)) * 2 / cols) * 1.03) + 1)
    : Math.max(3, Math.floor((t.fieldHeight - size * 0.866) / cy) + 1);
  const W = (cols - 1) * cx + size, H = (rows - 1) * cy + size;
  // The field is a real scrolling area. It used to be a canvas moved by a
  // transform — panned by the mouse near an edge, dragged on touch — and
  // nobody in the reviews found either, because nothing said the comb went
  // on past the frame. Now the frame scrolls: the wheel and the trackpad
  // work, touch drags work, and there is a thin scrollbar on each axis that
  // says how much more there is. The edge-of-screen drift is kept as a
  // convenience on top; it just moves the scroll position now.
  const clipRef = useRef(null);
  const fieldRef = useRef(null);
  // with the story panel open the field is allowed to slide further than the
  // scroll range, so the cell you clicked can clear the panel even on a small
  // field. That extra is a transform on top of the scroll, and it eases back.
  const panelWidth = Math.min(vp[0] * 0.44, 704);
  const clipH = vp[1] - 30;
  // start in the middle of the comb on a desktop; at the top on a phone
  useEffect(() => {
    const clip = clipRef.current;
    if (!clip) return;
    const el = fieldRef.current;
    if (phone) { clip.scrollTop = 0; clip.scrollLeft = 0; return; }
    // centre on the comb itself, not on the scroll range — anything hanging past
    // the field's edge add a little range beyond it
    clip.scrollLeft = Math.max(0, (el ? el.offsetLeft : 0) + (W - clip.clientWidth) / 2);
    clip.scrollTop = Math.max(0, (el ? el.offsetTop : 0) + (H - clip.clientHeight) / 2);
  }, [W, H, phone]);
  // desktop: the pointer near an edge of the screen drifts the scroll that way
  useEffect(() => {
    if (phone) return undefined;
    const mouse = { x: -1, y: -1, on: false };
    const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = !(e.target.closest && e.target.closest('.twk-panel,.twk-tab,.site-header,.story-panel,.modal-backdrop')); };
    const onLeave = () => { mouse.on = false; };
    let raf;
    const ZONE = 90;
    const step = () => {
      const clip = clipRef.current;
      if (clip && mouse.on && !panelOpen) {
        const vw = window.innerWidth, vh = window.innerHeight;
        let dx = 0, dy = 0;
        if (mouse.y >= 0 && mouse.y < ZONE) dy = -(1 - mouse.y / ZONE) * 14;
        else if (mouse.y > vh - ZONE) dy = (1 - (vh - mouse.y) / ZONE) * 14;
        if (mouse.x >= 0 && mouse.x < ZONE) dx = -(1 - mouse.x / ZONE) * 14;
        else if (mouse.x > vw - ZONE) dx = (1 - (vw - mouse.x) / ZONE) * 14;
        if (dx || dy) { clip.scrollLeft += dx; clip.scrollTop += dy; }
      }
      raf = requestAnimationFrame(step);
    };
    window.addEventListener('mousemove', onMove);
    document.documentElement.addEventListener('mouseleave', onLeave);
    raf = requestAnimationFrame(step);
    return () => { window.removeEventListener('mousemove', onMove); document.documentElement.removeEventListener('mouseleave', onLeave); cancelAnimationFrame(raf); };
  }, [panelOpen, phone]);
  const field = useMemo(
    () => genField(cols, rows, cellCount, t.distribution, t.brightShare, t.gaps, mulberry32(t.seed * 7919 + 13)),
    [cols, rows, cellCount, t.distribution, t.brightShare, t.gaps, t.seed]
  );
  const base = useMemo(() => field.map(([c, r, ty]) => ({ k: c + ',' + r, t: ty, x: c * cx, y: r * cy })), [field, cx, cy]);
  useEffect(() => { setFocusKey(null); }, [field, setFocusKey]);
  // bright cells hold the community faces first; approved archive submissions
  // (from /api/experiences) claim the remaining bright cells, their attached
  // photo becoming the cell face
  const faceOf = useMemo(() => {
    const m = new Map();
    let i = 0, e = 0;
    for (const b of base) {
      if (b.t !== 'b') continue;
      if (i < faces.length) {
        m.set(b.k, faces[i++]);
      } else if (e < experiences.length) {
        const exp = experiences[e++];
        // name as the contributor chose to show it, else place, else title
        const name = cellLabel(exp) || 'Archive voice';
        // a story with no photo still needs to be findable in the comb, so the
        // cell carries its initials instead of a portrait
        const initials = initialsOf(name) || '?';
        m.set(b.k, { src: exp.photoUrl || null, photo: true, initials, name, person: { name, experience: exp } });
      }
    }
    return m;
  }, [base, experiences, faces]);
  // tag weights for the whole field, recomputed only when the voices change
  const tagIndex = useMemo(() => buildTagWeights(faceOf), [faceOf]);
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
    const shuffled = shuffle(movers.map((m) => m.k), rng);
    const kinCount = Math.round(movers.length * t.clusterShare / 100);
    // Kin by shared tags: rank every other voice by how much it has in common
    // with this one. Ties — and they are common, since most pairs share
    // nothing — fall back to the shuffled order, so a field with no tags yet
    // behaves exactly as it did before and never looks broken.
    const tie = new Map(shuffled.map((k, i) => [k, i]));
    const score = new Map();
    if (t.clusterBy === 'tags') {
      for (const m of movers) score.set(m.k, relatedness(focusKey, m.k, tagIndex));
    }
    const ranked = movers.map((m) => m.k).sort((a, b2) => {
      const d = (score.get(b2) || 0) - (score.get(a) || 0);
      return d !== 0 ? d : tie.get(a) - tie.get(b2);
    });
    const kinSet = new Set(ranked.slice(0, kinCount));
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
    // How strong the strongest relation is, so pull can be read relative to it
    // rather than against an absolute the archive may never reach.
    const maxScore = ranked.length ? (score.get(ranked[0]) || 0) : 0;
    const scoring = t.clusterBy === 'tags' && maxScore > 0;
    // A cell that shares a rare tag comes all the way in; a weak relation only
    // drifts closer. With no tag signal every kin cell pulls the full amount,
    // which is the behaviour that shipped.
    const pullFactor = (k) => scoring ? 0.55 + 0.45 * ((score.get(k) || 0) / maxScore) : 1;
    // Strongest relation gets first claim on the nearest free slot; without
    // scoring, nearest-first as before.
    const kin = movers.filter((m) => kinSet.has(m.k));
    const kinOrder = scoring
      ? kin.slice().sort((a, b2) => (score.get(b2.k) || 0) - (score.get(a.k) || 0))
      : byDist(kin);
    for (const b of kinOrder) {
      const dx = b.x - f.x, dy = b.y - f.y, d = Math.hypot(dx, dy) || 1;
      const nd = Math.max(d * (1 - (t.pull / 100) * pullFactor(b.k)), size * 0.87);
      assign(b, f.x + dx / d * nd, f.y + dy / d * nd);
    }
    for (const b of byDist(movers.filter((m) => !kinSet.has(m.k)))) {
      const dx = b.x - f.x, dy = b.y - f.y, d = Math.hypot(dx, dy) || 1;
      const nd = d + t.push;
      assign(b, Math.min(Math.max(f.x + dx / d * nd, 0), W - size), Math.min(Math.max(f.y + dy / d * nd, 0), H - size));
    }
    return base.map((b) => result.has(b.k) ? { ...b, kin: kinSet.has(b.k), ...result.get(b.k) } : b);
  }, [base, focusKey, cols, rows, cx, cy, t.clusterShare, t.clusterBy, t.pull, t.push, t.dormantRespond, t.seed, size, W, H, tagIndex]);
  // ── search ────────────────────────────────────────────────────────────────
  const q = (query || '').trim().toLowerCase();
  const matchKeys = useMemo(() => {
    if (!q) return null;
    const set = new Set();
    for (const [k, face] of faceOf) {
      if (haystack(face).includes(q)) set.add(k);
    }
    return set;
  }, [faceOf, q]);
  useEffect(() => {
    if (onMatchCount) onMatchCount(matchKeys ? matchKeys.size : 0);
  }, [matchKeys, onMatchCount]);
  // a live search takes over the field arrangement; otherwise the clicked-cell
  // gravity does
  const arranged = useMemo(() => {
    if (matchKeys) return gatherMatches(base, matchKeys, cols, rows, cx, cy, size, W, H, t.push);
    return placed;
  }, [matchKeys, placed, base, cols, rows, cx, cy, size, W, H, t.push]);
  // the pointer as a lamp over the comb
  useFieldLight(fieldRef, {
    enabled: t.mouseLight !== false,
    // Reach scales with the cells, so the pool covers a similar number of them
    // whatever size they are set to.
    reach: size * ((t.lightReach ?? 260) / 100),
    cells: arranged,
  });
  // the comb draws itself in once the stories are here, then keeps a quiet pulse
  const revealCanvasRef = useRef(null);
  const { revealing } = useCombReveal({
    fieldRef, canvasRef: revealCanvasRef, base, cells: arranged, faceOf,
    size, W, H, enabled: t.combReveal !== false, ready, run: t.revealRun || 0,
  });
  // with the panel open, slide the field so the cell you clicked clears it
  useEffect(() => {
    const el = fieldRef.current, clip = clipRef.current;
    if (!el || !clip) return undefined;
    if (!panelOpen || !focusKey || phone) {
      // the extra shove eases back to nothing when the panel closes
      el.style.transform = '';
      return undefined;
    }
    const b = arranged.find((x) => x.k === focusKey);
    if (!b) return undefined;
    // where the cell should land on screen: centred in the room beside the panel
    const targetScreenX = panelWidth + (vp[0] - panelWidth) / 2;
    const targetScreenY = vp[1] / 2;
    const cellCenterX = b.x + size / 2, cellCenterY = b.y + size * 0.43;
    const clipBox = clip.getBoundingClientRect();
    // the field's offset inside the scroll area (its centring margins)
    const offX = el.offsetLeft, offY = el.offsetTop;
    // scroll as far toward the target as the scroll range allows...
    const wantLeft = offX + cellCenterX - (targetScreenX - clipBox.left);
    const wantTop = offY + cellCenterY - (targetScreenY - clipBox.top);
    const maxLeft = Math.max(0, clip.scrollWidth - clip.clientWidth);
    const maxTop = Math.max(0, clip.scrollHeight - clip.clientHeight);
    const left = Math.max(0, Math.min(maxLeft, wantLeft));
    const top = Math.max(0, Math.min(maxTop, wantTop));
    clip.scrollTo({ left, top, behavior: 'smooth' });
    // ...and the rest of the way is a transform, so a cell near the left edge
    // of a small field still clears the panel
    const shove = left - wantLeft;
    el.style.transform = shove ? `translateX(${Math.round(shove)}px)` : '';
    return undefined;
  }, [panelOpen, focusKey, arranged, vp, panelWidth, size, phone]);
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
    <div className={(panelOpen ? 'arch arch--panel' : 'arch') + (t.dormantLook === 'wax' ? '' : ' arch--gold') + ' arch--border-' + (t.cellBorder || 'gold')}>
      {/* no dimming of the field while the panel is open: it muted the very
          cells that were gathering toward the one you clicked */}
      <div className="arch-clip arch-clip--scroll" ref={clipRef}>
        <div className={'arch-field arch-field--flow' + (revealing ? ' arch-field--reveal' : '')} ref={fieldRef}
             style={{
               width: W, height: H,
               // phone: below the header, then the column. desktop: centred in
               // the frame when it fits, and scrollable from the middle when
               // it does not
               // the bar is fixed over the top 74px of the frame, so the comb's
               // first row starts below it, and stays reachable by scrolling up
               margin: phone
                 ? '84px auto 60px'
                 : `${Math.max(90, Math.round((clipH - H) / 2))}px auto ${Math.max(24, Math.round((clipH - H) / 2))}px`,
               '--glow-fade': `${t.lightAfterglow ?? 520}ms`,
               '--glow-strength': (t.lightStrength ?? 70) / 100,
               '--cell-center': (t.cellCenter ?? 14) / 100,
               '--face-inset': `${t.faceInset ?? 9}%`,
               '--glaze': (t.faceGlaze ?? 50) / 100,
             }}
             onClick={(e) => { if (e.target === e.currentTarget) { setFocusKey(null); onPersonSelect(null); } }}>
          <canvas ref={revealCanvasRef} className="comb-reveal" aria-hidden="true" />
          {arranged.map((b) => {
            const face = faceOf.get(b.k);
            const dimmed = matchKeys && !b.match;
            return (
            <div key={b.k} className={'cell' + (dimmed ? ' cell-unmatched' : '')}
                 data-k={b.k} data-cx={b.x} data-cy={b.y} data-half={size / 2}
                 style={{ left: b.x, top: b.y, width: size, '--cell-w': `${size}px`, zIndex: b.k === focusKey ? 3 : b.match ? 2 : b.kin ? 2 : 1 }}>
              {b.t === 'b'
                ? (
                  <div className={'hexcell' + (b.k === focusKey ? ' cell-focus' : '') + (b.match ? ' cell-match' : '')} tabIndex="0" role="button"
                       aria-label={face ? face.name : 'Bright cell'}
                       onClick={() => toggleCell(b)}
                       onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCell(b); } }}>
                    <img src={t.cellBorder === 'wax' ? '/assets/cell-bright.png' : '/assets/cell-gold.png'} alt="" />
                    <span className="cell-line" aria-hidden="true" />
                    {face && face.src && (
                      <img
                        className={face.photo ? 'cell-face cell-face-photo' : 'cell-face'}
                        src={face.src}
                        alt={face.name}
                      />
                    )}
                    {face && !face.src && face.initials && (
                      <span className="cell-initials" aria-hidden="true">{face.initials}</span>
                    )}
                    {/* a thin film over the whole cell for the light to catch —
                        wax frame and portrait alike, so a face reads as sitting
                        under the comb rather than printed on top of it */}
                    <span className="cell-glaze" aria-hidden="true" />
                  </div>
                )
                : (
                  // wrapped so a dormant cell has somewhere to hang the light
                  // pool; bare wax takes the light more fully than a portrait
                  <div className="cell-dormant-wrap" aria-hidden="true">
                    <img src={t.dormantLook === 'wax' ? '/assets/cell-bright.png' : '/assets/cell-gold.png'} alt="" className="cell-dormant" style={{ width: '100%' }} />
                  </div>
                )}
            </div>
            );
          })}
        </div>
      </div>
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
  // the reveal waits for the stories, so the comb is drawn once at its full size
  const [storiesSettled, setStoriesSettled] = useState(false);
  const [people, setPeople] = useState(PEOPLE);
  const [query, setQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [session, setSession] = useState({ role: null, name: null });

  useEffect(() => {
    fetch('/api/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setSession({ role: d.role, name: d.name }); })
      .catch(() => undefined);
  }, []);

  const signOut = useCallback(async () => {
    await fetch('/api/session', { method: 'DELETE' }).catch(() => undefined);
    try { localStorage.removeItem('hc-unlocked-until'); } catch { /* private mode */ }
    window.location.reload();
  }, []);

  // approved archive submissions join the field as additional bright cells
  useEffect(() => {
    fetch('/api/experiences')
      .then((r) => (r.ok ? r.json() : { experiences: [] }))
      .then((d) => setExperiences((d.experiences || []).filter((e) => e.privacy !== 'archive')))
      .catch(() => undefined)
      .finally(() => setStoriesSettled(true));
    // a slow archive never keeps the comb hidden for long
    const fallback = setTimeout(() => setStoriesSettled(true), 2500);
    return () => clearTimeout(fallback);
  }, []);

  // community-face info (name, about, video) is editable from /review;
  // the API merges those edits over the built-in defaults
  useEffect(() => {
    fetch('/api/people')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && Array.isArray(d.people) && d.people.length) setPeople(d.people); })
      .catch(() => undefined);
  }, []);

  const faces = useMemo(
    () => people.map((p) => ({ src: '/uploads/' + p.key + '.webp', name: p.name, person: p })),
    [people]
  );

  // restore unlocked session (30 days) on the client only
  useEffect(() => {
    try {
      const until = Number(localStorage.getItem('hc-unlocked-until') || 0);
      if (until > Date.now()) setView('archive');
    } catch { /* private mode */ }
  }, []);

  const enter = (data) => {
    setView('archive');
    if (data && data.role) setSession({ role: data.role, name: data.name ?? null });
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
    if (id === 'home') { closePanel(); setQuery(''); return; }
    setPerson(null);
    setFocusKey(null);
    setPageId(id);
  };

  // searching and reading a story fight for the same field, so starting a
  // search closes whatever panel is open
  const onQuery = useCallback((value) => {
    setQuery(value);
    if (value) { setPageId(null); setPerson(null); setFocusKey(null); }
  }, []);

  // "Search the archive" inside the Explore panel hands focus to the topbar field
  const focusSearch = useCallback(() => {
    closePanel();
    window.dispatchEvent(new CustomEvent('hc-focus-search'));
  }, [closePanel]);

  const onPersonSelect = (p) => {
    setPageId(null);
    setPerson(p);
  };

  const openRecorder = () => setRecorderOpen(true);
  const page = PAGES.find((p) => p.id === pageId) || null;
  const panelOpen = Boolean(page || person);

  return (
    <div className="hc-page" style={{
      background: t.ground,
      '--cell-opacity': (t.cellOpacity ?? 90) / 100,
      '--dormant-brightness': (t.dormantBright ?? 72) / 100,
      '--face-opacity': t.showFaces ? 1 : 0,
      // Portrait treatment only (E2). The colourised portraits read brown
      // under the warm field; these pull the sepia out without touching the
      // cell light or texture. Identity filter for the current look.
      '--face-grade': FACE_GRADES[t.faceGrade] || FACE_GRADES.colorized,
    }}>
      {(t.backdrop in BACKDROPS ? BACKDROPS[t.backdrop] : BACKDROPS['Archive texture']) && (
        <img src={t.backdrop in BACKDROPS ? BACKDROPS[t.backdrop] : BACKDROPS['Archive texture']} alt="" className="hc-texture" style={{ opacity: t.textureOpacity / 100 }} />
      )}
      {t.vignette && <div className="hc-vignette"></div>}
      {(t.warmth ?? 0) > 0 && <div className="hc-warm" style={{ opacity: (t.warmth ?? 0) / 100 }} aria-hidden="true"></div>}
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
            ready={storiesSettled}
            faces={faces}
            query={query}
            onMatchCount={setMatchCount}
          />
        )}
      </div>
      <div className="hc-frame"></div>
      <TopBar
        onNav={onNav} onSubmit={openRecorder} activePage={pageId}
        query={query} onQuery={onQuery} matchCount={matchCount}
        autohide={t.topbarTucks === true} keepVisible={panelOpen || recorderOpen}
        session={session} onSignOut={signOut}
      />
      <StoryPanel page={page} person={person} onClose={closePanel} openRecorder={openRecorder} focusSearch={focusSearch} />
      {recorderOpen && <RecorderModal onClose={() => setRecorderOpen(false)} />}
      <TweaksPanel>
        <TweakSection label="Cells" />
        <TweakSlider label="Cell size" value={t.cellSize} min={80} max={170} unit="px" onChange={(v) => setTweak('cellSize', v)} />
        <TweakSlider label="Cell count" value={t.cellCount} min={1} max={100} onChange={(v) => setTweak('cellCount', v)} />
        <TweakSlider label="Gaps" value={t.gaps} min={0} max={30} onChange={(v) => setTweak('gaps', v)} />
        <TweakSlider label="Field width" value={t.fieldWidth} min={800} max={2400} step={20} unit="px" onChange={(v) => setTweak('fieldWidth', v)} />
        <TweakSlider label="Field height" value={t.fieldHeight} min={400} max={1600} step={20} unit="px" onChange={(v) => setTweak('fieldHeight', v)} />
        <TweakSlider label="Bright share" value={t.brightShare} min={10} max={90} unit="%" onChange={(v) => setTweak('brightShare', v)} />
        <TweakRadio label="Distribution" value={t.distribution === 'scattered' ? 'even' : t.distribution} options={['even', 'clustered']} onChange={(v) => setTweak('distribution', v)} />
        <TweakToggle label="Faces always visible" value={t.showFaces} onChange={(v) => setTweak('showFaces', v)} />
        <TweakSlider label="Cell opacity" value={t.cellOpacity ?? 90} min={40} max={100} unit="%" onChange={(v) => setTweak('cellOpacity', v)} />
        <TweakSlider label="Dormant brightness" value={t.dormantBright ?? 72} min={30} max={100} unit="%" onChange={(v) => setTweak('dormantBright', v)} />
        <TweakRadio label="Dormant cells" value={t.dormantLook || 'gold'} options={[{ value: 'gold', label: 'Gold leaf' }, { value: 'wax', label: 'Wax' }]} onChange={(v) => setTweak('dormantLook', v)} />
        <TweakSlider label="Cell centre" value={t.cellCenter ?? 14} min={0} max={45} unit="%" onChange={(v) => setTweak('cellCenter', v)} />
        <TweakRadio label="Cell border" value={t.cellBorder || 'gold'}
                    options={[{ value: 'gold', label: 'Gold leaf' }, { value: 'wax', label: 'Wax' }, { value: 'line', label: 'Line' }, { value: 'none', label: 'None' }]}
                    onChange={(v) => setTweak('cellBorder', v)} />
        <TweakSlider label="Face inset" value={t.faceInset ?? 9} min={0} max={20} step={0.5} unit="%" onChange={(v) => setTweak('faceInset', v)} />
        <TweakToggle label="Mouse light" value={t.mouseLight !== false} onChange={(v) => setTweak('mouseLight', v)} />
        <TweakSlider label="Light reach" value={t.lightReach ?? 260} min={100} max={600} step={10} unit="%" onChange={(v) => setTweak('lightReach', v)} />
        <TweakSlider label="Light strength" value={t.lightStrength ?? 70} min={0} max={100} unit="%" onChange={(v) => setTweak('lightStrength', v)} />
        <TweakSlider label="Face glaze" value={t.faceGlaze ?? 50} min={0} max={100} unit="%" onChange={(v) => setTweak('faceGlaze', v)} />
        <TweakSlider label="Afterglow" value={t.lightAfterglow ?? 520} min={0} max={1600} step={20} unit="ms" onChange={(v) => setTweak('lightAfterglow', v)} />
        <TweakButton label="Reshuffle field" onClick={() => setTweak('seed', (t.seed || 1) + 1)} />
        <TweakSection label="Gravity" />
        <TweakRadio label="Kinship" value={t.clusterBy} options={[{ value: 'tags', label: 'Shared tags' }, { value: 'random', label: 'Random' }]} onChange={(v) => setTweak('clusterBy', v)} />
        <TweakSlider label="Cluster share" value={t.clusterShare} min={0} max={100} unit="%" onChange={(v) => setTweak('clusterShare', v)} />
        <TweakSlider label="Pull strength" value={t.pull} min={20} max={90} unit="%" onChange={(v) => setTweak('pull', v)} />
        <TweakSlider label="Push distance" value={t.push} min={40} max={340} unit="px" onChange={(v) => setTweak('push', v)} />
        <TweakToggle label="Dormant cells respond" value={t.dormantRespond} onChange={(v) => setTweak('dormantRespond', v)} />
        <TweakSection label="Background" />
        <TweakColor label="Ground" value={t.ground} options={['#000000', '#0B0A09', '#121110', '#171412', '#1C1814', '#0D0806', '#1A1210', '#241711', '#2E1C12']} onChange={(v) => setTweak('ground', v)} />
        <TweakSelect label="Texture image" value={t.backdrop} options={Object.keys(BACKDROPS)} onChange={(v) => setTweak('backdrop', v)} />
        <TweakSlider label="Texture" value={t.textureOpacity} min={0} max={70} unit="%" onChange={(v) => setTweak('textureOpacity', v)} />
        <TweakSlider label="Warmth" value={t.warmth ?? 0} min={0} max={100} unit="%" onChange={(v) => setTweak('warmth', v)} />
        <TweakRadio label="Portrait grade" value={t.faceGrade || 'colorized'}
                    options={[{ value: 'colorized', label: 'As is' }, { value: 'clean', label: 'Cleaner' }, { value: 'bright', label: 'Brighter' }]}
                    onChange={(v) => setTweak('faceGrade', v)} />
        <TweakToggle label="Vignette" value={t.vignette} onChange={(v) => setTweak('vignette', v)} />
        <TweakToggle label="Topbar hides until hover" value={t.topbarTucks === true} onChange={(v) => setTweak('topbarTucks', v)} />
        <TweakSection label="Reveal" />
        <TweakToggle label="Comb draws itself in" value={t.combReveal !== false} onChange={(v) => setTweak('combReveal', v)} />
        <TweakButton label="Replay the reveal" onClick={() => setTweak('revealRun', (t.revealRun || 0) + 1)} />
        <TweakSection label="Session" />
        <TweakButton label="Reset all tweaks" secondary onClick={resetTweaks} />
      </TweaksPanel>
    </div>
  );
}
