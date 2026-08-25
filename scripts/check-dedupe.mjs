/**
 * Checks the repetition guard against a real word timeline.
 *
 *   node scripts/check-dedupe.mjs <words.json>
 *
 * Whisper looped on the very first recording we put through it, emitting a
 * 25-word span twice with identical timestamps. This runs the same rebuild
 * app/lib/transcribe.ts does and reports what it dropped, so the guard can be
 * checked against real output rather than a fixture someone invented.
 */
import { readFileSync } from 'node:fs';

// Mirrors textFromWords in app/lib/transcribe.ts.
function textFromWords(words) {
  const kept = [];
  let furthest = -Infinity;
  let removed = 0;
  let insideRepeat = false;
  const SLACK = 0.1;
  for (const w of words) {
    const word = typeof w?.word === 'string' ? w.word : '';
    const start = Number(w?.start);
    if (!Number.isFinite(start)) { if (word) kept.push(word); continue; }
    if (start < furthest - SLACK) { insideRepeat = true; removed++; continue; }
    if (insideRepeat) {
      if (start <= furthest + SLACK) { removed++; continue; }
      insideRepeat = false;
    }
    furthest = Math.max(furthest, start);
    if (word) kept.push(word);
  }
  const carriesOwnSpacing = kept.some((w) => /^\s/.test(w));
  const joined = carriesOwnSpacing ? kept.join('') : kept.join(' ');
  const text = joined.replace(/\s+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim();
  return { text, removed };
}

const path = process.argv[2];
if (!path) { console.error('usage: node scripts/check-dedupe.mjs <words.json>'); process.exit(2); }

const words = JSON.parse(readFileSync(path, 'utf8'));
const rawParts = words.map((w) => (typeof w?.word === 'string' ? w.word : ''));
const rawSpaced = rawParts.some((w) => /^\s/.test(w)) ? rawParts.join('') : rawParts.join(' ');
const raw = rawSpaced.replace(/\s+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim();
const { text, removed } = textFromWords(words);

console.log(`\nwords in timeline : ${words.length}`);
console.log(`dropped as repeats: ${removed}`);
console.log(`raw word count    : ${raw.split(/\s+/).filter(Boolean).length}`);
console.log(`cleaned word count: ${text.split(/\s+/).filter(Boolean).length}`);

// Any span of 6+ words appearing twice is the signature of a loop.
const dup = (s) => {
  const w = s.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').split(/\s+/).filter(Boolean);
  const seen = new Map();
  for (let i = 0; i + 6 <= w.length; i++) {
    const gram = w.slice(i, i + 6).join(' ');
    if (seen.has(gram)) return gram;
    seen.set(gram, i);
  }
  return null;
};

const before = dup(raw);
const after = dup(text);
console.log(`\nrepeated 6-word span before: ${before ? `"${before}"` : 'none'}`);
console.log(`repeated 6-word span after : ${after ? `"${after}"` : 'none'}`);

let bad = 0;
if (!before) console.log('\n  note  this sample had no repetition, so it only proves the guard is harmless');
else if (after) { console.log('\n  FAIL  the repetition survived the guard'); bad = 1; }
else console.log('\n  ok    the repetition was removed');

if (removed > 0 && text.length < raw.length * 0.5) {
  console.log('  FAIL  the guard removed more than half the transcript — too aggressive');
  bad = 1;
}

console.log('');
process.exit(bad);
