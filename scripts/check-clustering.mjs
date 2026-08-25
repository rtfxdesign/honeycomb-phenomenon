/**
 * Does the seed data actually cluster?
 *
 * Clustering can only draw two voices together when they share a tag, so seed
 * data with a long tail of one-off tags produces a comb that gathers at random
 * no matter how good the scoring is. This reports whether the archive has
 * enough shared vocabulary to be worth looking at, and fails loudly if not.
 *
 *   node scripts/check-clustering.mjs
 */
import { existsSync } from 'node:fs';
import { STORIES, ALL_TAGS, TAG_VOCABULARY } from './seed-stories.mjs';

// Same scoring as app/components/HoneycombApp.jsx.
const norm = (t) => String(t).trim().toLowerCase().replace(/^#/, '');

const docs = STORIES.map((s, i) => ({
  i, name: s.name, title: s.title, tags: [...new Set((s.tags || []).map(norm))],
}));

const df = new Map();
for (const d of docs) for (const t of d.tags) df.set(t, (df.get(t) || 0) + 1);
const weight = new Map();
for (const [t, n] of df) weight.set(t, Math.log(1 + docs.length / n));

for (const d of docs) {
  let mag = 0;
  for (const t of d.tags) { const w = weight.get(t) || 0; mag += w * w; }
  d.mag = Math.sqrt(mag);
}

function score(a, b) {
  if (!a.mag || !b.mag) return 0;
  const big = new Set(b.tags);
  let dot = 0;
  for (const t of a.tags) {
    if (!big.has(t)) continue;
    const w = weight.get(t) || 0;
    dot += w * w;
  }
  return dot > 0 ? dot / (a.mag * b.mag) : 0;
}

let failures = 0;
const fail = (msg) => { failures++; console.log(`  FAIL  ${msg}`); };
const pass = (msg) => console.log(`  ok    ${msg}`);

console.log(`\nStories: ${docs.length}`);
console.log(`Distinct tags: ${df.size}`);

// 1. No singletons. A tag used once can never relate two stories.
const singles = [...df].filter(([, n]) => n === 1).map(([t]) => t);
console.log(`\nTag frequency:`);
const byFreq = [...df].sort((a, b) => b[1] - a[1]);
console.log('  ' + byFreq.map(([t, n]) => `${t}:${n}`).join('  '));
console.log('');
if (singles.length) fail(`${singles.length} tag(s) used only once: ${singles.join(', ')}`);
else pass('every tag is shared by at least two stories');

// 2. Vocabulary discipline — nothing invented outside the controlled list.
const vocab = new Set(ALL_TAGS.map(norm));
const strays = [...df.keys()].filter((t) => !vocab.has(t));
if (strays.length) fail(`tag(s) outside TAG_VOCABULARY: ${strays.join(', ')}`);
else pass('all tags come from the controlled vocabulary');

// 3. Every story can relate to something.
const isolated = docs.filter((d) => docs.every((o) => o.i === d.i || score(d, o) === 0));
if (isolated.length) fail(`${isolated.length} story/stories relate to nothing: ${isolated.map((d) => d.name).join(', ')}`);
else pass('every story has at least one relation');

// 4. Enough kin to fill a gather. At 50% cluster share the comb wants roughly
//    half the field, but the gather only reads as meaningful if a good number
//    of those have a real score.
const relCounts = docs.map((d) => docs.filter((o) => o.i !== d.i && score(d, o) > 0).length);
const minRel = Math.min(...relCounts);
const meanRel = relCounts.reduce((a, b) => a + b, 0) / relCounts.length;
console.log(`\nRelations per story: min ${minRel}, mean ${meanRel.toFixed(1)}, max ${Math.max(...relCounts)}`);
if (minRel < 3) fail(`a story with only ${minRel} relation(s) will barely gather`);
else pass('every story has at least 3 relations');

// 5. Spread. If everything relates to everything the comb just shuffles.
//
// Counting any non-zero score is the wrong measure here: two stories that
// share only "night" score about 0.28, and rarity weighting is what keeps that
// from mattering. Kin are taken from the top of the ranking, so what decides
// whether a gather reads as meaningful is how many pairs clear a real
// threshold — not how many touch at all.
const STRONG = 0.25;
const all = [];
for (let a = 0; a < docs.length; a++) for (let b = a + 1; b < docs.length; b++) all.push(score(docs[a], docs[b]));
const touching = all.filter((s) => s > 0).length / all.length;
const density = all.filter((s) => s >= STRONG).length / all.length;
console.log(`Pair density: ${(touching * 100).toFixed(1)}% share any tag, ${(density * 100).toFixed(1)}% score >= ${STRONG}`);
if (density > 0.4) fail('too many pairs are strongly related — clustering will look like noise');
else if (density < 0.03) fail('almost no pairs are strongly related — clustering will barely move');
else pass('strong-relation density is in a useful range');

// A tag on most of the archive cannot distinguish anything, however it is
// weighted. Flag it as a tagging problem rather than a scoring one.
const tooCommon = [...df].filter(([, n]) => n / docs.length > 0.5).map(([t, n]) => `${t} (${n}/${docs.length})`);
if (tooCommon.length) fail(`tag(s) on over half the archive: ${tooCommon.join(', ')}`);
else pass('no tag covers more than half the archive');

// 6. Eyeball the strongest pairs — these are what a viewer sees gather.
console.log(`\nStrongest relations:`);
const pairs = [];
for (let a = 0; a < docs.length; a++) {
  for (let b = a + 1; b < docs.length; b++) {
    const s = score(docs[a], docs[b]);
    if (s > 0) pairs.push({ s, a: docs[a], b: docs[b] });
  }
}
pairs.sort((x, y) => y.s - x.s);
for (const p of pairs.slice(0, 12)) {
  const shared = p.a.tags.filter((t) => p.b.tags.includes(t));
  console.log(`  ${p.s.toFixed(3)}  ${p.a.name} + ${p.b.name}`);
  console.log(`         ${shared.join(', ')}`);
}

// 7. What a click actually looks like: top kin for one story.
const sample = docs.find((d) => d.name === 'Marcy Ruiz') || docs[0];
console.log(`\nClicking "${sample.title}" (${sample.name}) gathers:`);
const kin = docs.filter((d) => d.i !== sample.i).map((d) => ({ d, s: score(sample, d) }))
  .sort((x, y) => y.s - x.s).slice(0, 8);
for (const k of kin) {
  const shared = sample.tags.filter((t) => k.d.tags.includes(t));
  console.log(`  ${k.s.toFixed(3)}  ${k.d.name.padEnd(22)} ${shared.join(', ') || '—'}`);
}

// 8. Transcript length — the reason for this pass in the first place.
const lens = STORIES.map((s) => s.text.length).sort((a, b) => a - b);
const words = STORIES.map((s) => s.text.trim().split(/\s+/).length);
console.log(`\nTranscripts: min ${lens[0]}, median ${lens[Math.floor(lens.length / 2)]}, max ${lens[lens.length - 1]} chars`);
console.log(`             mean ${Math.round(words.reduce((a, b) => a + b, 0) / words.length)} words`);
const shortOnes = STORIES.filter((s) => s.text.length < 500);
if (shortOnes.length) fail(`${shortOnes.length} transcript(s) under 500 chars: ${shortOnes.map((s) => s.name).join(', ')}`);
else pass('every transcript is a substantial account');

// 8b. Every referenced recording exists. The seeder skips a missing file with
//     a warning, which is right at seed time and wrong here: a renamed file
//     would quietly drop a voice's audio and nobody would notice until the
//     story panel had no player.
const audioDir = new URL('../seed-audio/', import.meta.url);
const withAudio = STORIES.filter((s) => s.audio);
const missingAudio = withAudio.filter((s) => !existsSync(new URL(s.audio, audioDir)));
console.log(`\nRecordings: ${withAudio.length} of ${STORIES.length} stories have audio`);
if (missingAudio.length) fail(`referenced audio file(s) not found: ${missingAudio.map((s) => s.audio).join(', ')}`);
else pass('every referenced recording is present');

// 9. Paragraphs, since the panel now renders them.
const flat = STORIES.filter((s) => !s.text.includes('\n\n'));
if (flat.length) fail(`${flat.length} transcript(s) have no paragraph break: ${flat.map((s) => s.name).join(', ')}`);
else pass('every transcript has paragraph breaks');

// 10. Coverage of each vocabulary group, so the comb clusters along more than
//     one axis.
console.log('');
for (const [group, tags] of Object.entries(TAG_VOCABULARY)) {
  const used = tags.filter((t) => df.has(norm(t)));
  const unused = tags.filter((t) => !df.has(norm(t)));
  if (unused.length) fail(`group "${group}" has unused tags: ${unused.join(', ')}`);
  else pass(`group "${group}" fully used (${used.length} tags)`);
}

console.log(failures ? `\n${failures} check(s) failed\n` : `\nAll checks passed\n`);
process.exit(failures ? 1 : 0);
