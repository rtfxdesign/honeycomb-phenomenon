/**
 * Does the auto-tagger agree with the vocabulary the comb clusters on?
 *
 * The seed stories are hand-tagged, so they double as an answer key: run the
 * suggester over each transcript and see how often it agrees. This is not
 * asking for perfection — a suggester that proposes and a moderator who edits
 * is the intended workflow — but it should not invent tags outside the
 * vocabulary, and it should find a fair share of what a human chose.
 *
 *   node scripts/check-autotag.mjs
 */
import { readFileSync } from 'node:fs';
import { STORIES, ALL_TAGS } from './seed-stories.mjs';

// Pull the dictionary out of the route without booting Next.
const src = readFileSync(new URL('../app/api/generate-tags/route.ts', import.meta.url), 'utf8');
const body = src.slice(src.indexOf('const tagDictionary'), src.indexOf('/** The tags this endpoint'));
const dict = {};
for (const m of body.matchAll(/^\s*"?([a-z-]+)"?:\s*\[(.+?)\],\s*$/gm)) {
  const [, tag, patterns] = m;
  dict[tag] = patterns.split(/,\s*(?=\/)/).map((p) => {
    const lastSlash = p.lastIndexOf('/');
    return new RegExp(p.slice(1, lastSlash), p.slice(lastSlash + 1).trim());
  });
}

const suggest = (text) => {
  const out = new Set();
  for (const [tag, patterns] of Object.entries(dict)) {
    if (patterns.some((p) => p.test(text))) out.add(tag);
  }
  return [...out].slice(0, 8);
};

let failures = 0;
const fail = (m) => { failures++; console.log(`  FAIL  ${m}`); };
const pass = (m) => console.log(`  ok    ${m}`);

console.log(`\nDictionary tags: ${Object.keys(dict).length}`);
console.log(`Vocabulary tags: ${ALL_TAGS.length}`);

// 1. The suggester must never invent a tag the comb does not know.
const vocab = new Set(ALL_TAGS);
const strays = Object.keys(dict).filter((t) => !vocab.has(t));
if (strays.length) fail(`dictionary tags outside the vocabulary: ${strays.join(', ')}`);
else pass('every dictionary tag is in the clustering vocabulary');

// 2. And it should cover most of the vocabulary, or whole axes go unsuggested.
const missing = ALL_TAGS.filter((t) => !dict[t]);
if (missing.length) fail(`vocabulary tags the suggester can never propose: ${missing.join(', ')}`);
else pass('the suggester can propose every vocabulary tag');

// 3. Agreement with the hand-tagged answer key.
let hits = 0, expected = 0, proposed = 0;
const misses = new Map();
for (const s of STORIES) {
  const got = new Set(suggest(`${s.title}\n${s.text}`));
  const want = new Set(s.tags);
  proposed += got.size;
  expected += want.size;
  for (const t of want) {
    if (got.has(t)) hits++;
    else misses.set(t, (misses.get(t) || 0) + 1);
  }
}
const recall = hits / expected;
console.log(`\nAgreement with hand-tagging: ${hits}/${expected} (${(recall * 100).toFixed(0)}% recall)`);
console.log(`Suggested ${(proposed / STORIES.length).toFixed(1)} tags per story, humans chose ${(expected / STORIES.length).toFixed(1)}`);
if (recall < 0.4) fail('the suggester finds too little of what a human would tag');
else pass('the suggester finds a useful share of the human tags');

const worst = [...misses].sort((a, b) => b[1] - a[1]).slice(0, 8);
if (worst.length) {
  console.log('\nMost-missed tags (patterns worth a look):');
  for (const [t, n] of worst) console.log(`  ${String(n).padStart(3)}  ${t}`);
}

console.log(failures ? `\n${failures} check(s) failed\n` : `\nAll checks passed\n`);
process.exit(failures ? 1 : 0);
