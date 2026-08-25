// Tag relatedness: the scoring behind "kin cells draw close".
// Mirrors the implementation in app/components/HoneycombApp.jsx. Kept as a
// plain port because that file is a client component and cannot be imported
// into a bare node test run.

import { test } from 'node:test';
import assert from 'node:assert/strict';

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

const face = (hashtags) => ({ person: { experience: { hashtags } } });

test('identical tag sets score 1', () => {
  const idx = buildTagWeights(new Map([
    ['a', face(['orb', 'night'])],
    ['b', face(['orb', 'night'])],
    ['c', face(['missing-time'])],
  ]));
  assert.ok(Math.abs(relatedness('a', 'b', idx) - 1) < 1e-12);
});

test('no shared tags scores 0', () => {
  const idx = buildTagWeights(new Map([
    ['a', face(['orb'])],
    ['b', face(['missing-time'])],
  ]));
  assert.equal(relatedness('a', 'b', idx), 0);
});

test('a story with no tags is related to nothing', () => {
  const idx = buildTagWeights(new Map([
    ['a', face(['orb'])],
    ['b', face([])],
    ['c', { name: 'community face' }],
  ]));
  assert.equal(relatedness('a', 'b', idx), 0);
  assert.equal(relatedness('a', 'c', idx), 0);
  assert.equal(relatedness('b', 'c', idx), 0);
});

test('a rare shared tag beats a common one', () => {
  // "night" is on every story, so it says nothing. "orb" is on two, so it says
  // a great deal. The pair sharing only "orb" must outrank the pair sharing
  // only "night".
  const idx = buildTagWeights(new Map([
    ['a', face(['orb', 'night'])],
    ['b', face(['orb', 'night'])],
    ['c', face(['night', 'lights'])],
    ['d', face(['night', 'lights'])],
    ['e', face(['night', 'craft'])],
    ['f', face(['night', 'silence'])],
  ]));
  const rare = relatedness('a', 'b', idx);   // shares orb + night
  const common = relatedness('e', 'f', idx); // shares night only
  assert.ok(rare > common, `expected rare(${rare}) > common(${common})`);
});

test('score is symmetric and bounded 0..1', () => {
  const idx = buildTagWeights(new Map([
    ['a', face(['orb', 'night', 'craft'])],
    ['b', face(['orb', 'lights'])],
    ['c', face(['craft'])],
  ]));
  for (const [x, y] of [['a', 'b'], ['a', 'c'], ['b', 'c']]) {
    const s = relatedness(x, y, idx);
    assert.equal(s, relatedness(y, x, idx), `${x}/${y} not symmetric`);
    assert.ok(s >= 0 && s <= 1 + 1e-12, `${x}/${y} out of range: ${s}`);
  }
});

test('tags are normalised for case, whitespace and a leading hash', () => {
  const idx = buildTagWeights(new Map([
    ['a', face(['#Orb', '  NIGHT  '])],
    ['b', face(['orb', 'night'])],
  ]));
  assert.ok(Math.abs(relatedness('a', 'b', idx) - 1) < 1e-12);
});

test('duplicate tags on one story do not inflate its score', () => {
  const idx = buildTagWeights(new Map([
    ['a', face(['orb', 'orb', '#ORB'])],
    ['b', face(['orb'])],
  ]));
  assert.ok(Math.abs(relatedness('a', 'b', idx) - 1) < 1e-12);
});

test('an empty field produces no scores and does not throw', () => {
  const idx = buildTagWeights(new Map());
  assert.equal(relatedness('a', 'b', idx), 0);
});
