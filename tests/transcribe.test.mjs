// Transcription client behaviour, with fetch stubbed so this runs without a
// Cloudflare account. What is being checked is the part that matters when a
// submission goes wrong: that every failure comes back as a result the
// dashboard can explain, rather than an exception.
//
// Mirrors app/lib/transcribe.ts. The route is TypeScript inside the Next
// build, so the logic is ported here rather than imported.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_MODEL = '@cf/openai/whisper';

const transcriptionConfigured = () =>
  Boolean(process.env.CF_ACCOUNT_ID && process.env.CF_AI_TOKEN);

async function transcribeAudio(bytes, opts = {}) {
  if (!transcriptionConfigured()) return { ok: false, reason: 'not-configured' };
  if (!bytes || bytes.byteLength === 0) return { ok: false, reason: 'empty' };
  if (bytes.byteLength > MAX_BYTES) {
    return { ok: false, reason: 'too-large', detail: `${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB exceeds the 25 MB limit` };
  }
  const model = opts.model || process.env.CF_AI_MODEL || DEFAULT_MODEL;
  const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/${model}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.CF_AI_TOKEN}`,
        'Content-Type': opts.contentType || 'application/octet-stream',
      },
      body: bytes,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, reason: 'failed', detail: `${res.status} ${detail.slice(0, 300)}` };
    }
    const body = await res.json();
    const text = body?.result?.text ?? body?.text;
    if (typeof text !== 'string' || !text.trim()) {
      return { ok: false, reason: 'failed', detail: 'no text in response' };
    }
    const clean = text.trim();
    return {
      ok: true,
      text: clean,
      model,
      wordCount: Number(body?.result?.word_count ?? body?.word_count ?? clean.split(/\s+/).length),
    };
  } catch (err) {
    return { ok: false, reason: 'failed', detail: err instanceof Error ? err.message : String(err) };
  }
}


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

function mediaKeyForTranscription(record) {
  if (record.audioKey) return { key: record.audioKey };
  if (record.recordingMode === 'audio' && record.mediaKey) return { key: record.mediaKey };
  if (record.recordingMode === 'video') {
    return { key: null, why: 'This video has no separate audio track. Recordings made before audio capture was added cannot be transcribed automatically.' };
  }
  return { key: null, why: 'This submission has no audio to transcribe.' };
}

const realFetch = globalThis.fetch;
const stub = (impl) => { globalThis.fetch = impl; };

beforeEach(() => {
  process.env.CF_ACCOUNT_ID = 'acct_test';
  process.env.CF_AI_TOKEN = 'token_test';
  delete process.env.CF_AI_MODEL;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.CF_ACCOUNT_ID;
  delete process.env.CF_AI_TOKEN;
});

const bytes = (n = 128) => new Uint8Array(n).fill(7);

test('returns the transcript from the account REST shape', async () => {
  stub(async () => new Response(JSON.stringify({ result: { text: '  It held still over the treeline.  ', word_count: 6 } }), { status: 200 }));
  const r = await transcribeAudio(bytes());
  assert.equal(r.ok, true);
  assert.equal(r.text, 'It held still over the treeline.');
  assert.equal(r.wordCount, 6);
  assert.equal(r.model, DEFAULT_MODEL);
});

test('accepts the bare shape too, rather than pinning to one revision', async () => {
  stub(async () => new Response(JSON.stringify({ text: 'No sound at all.' }), { status: 200 }));
  const r = await transcribeAudio(bytes());
  assert.equal(r.ok, true);
  assert.equal(r.text, 'No sound at all.');
});

test('missing credentials is a reported reason, not a crash', async () => {
  delete process.env.CF_AI_TOKEN;
  const r = await transcribeAudio(bytes());
  assert.deepEqual(r, { ok: false, reason: 'not-configured' });
});

test('an empty recording is refused before any network call', async () => {
  let called = false;
  stub(async () => { called = true; return new Response('{}', { status: 200 }); });
  const r = await transcribeAudio(new Uint8Array(0));
  assert.equal(r.reason, 'empty');
  assert.equal(called, false, 'should not call the API for an empty file');
});

test('an oversized recording is refused before any network call', async () => {
  let called = false;
  stub(async () => { called = true; return new Response('{}', { status: 200 }); });
  const r = await transcribeAudio(new Uint8Array(MAX_BYTES + 1));
  assert.equal(r.reason, 'too-large');
  assert.match(r.detail, /exceeds/);
  assert.equal(called, false, 'should not upload a file it will refuse');
});

test('an API error is captured with its status', async () => {
  stub(async () => new Response('quota exceeded', { status: 429 }));
  const r = await transcribeAudio(bytes());
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'failed');
  assert.match(r.detail, /429/);
});

test('a network throw becomes a result, not an exception', async () => {
  stub(async () => { throw new Error('socket hang up'); });
  const r = await transcribeAudio(bytes());
  assert.equal(r.ok, false);
  assert.match(r.detail, /socket hang up/);
});

test('a response with no text is a failure, not an empty transcript', async () => {
  stub(async () => new Response(JSON.stringify({ result: { text: '   ' } }), { status: 200 }));
  const r = await transcribeAudio(bytes());
  assert.equal(r.ok, false);
  assert.match(r.detail, /no text/);
});

test('the model is overridable by env', async () => {
  process.env.CF_AI_MODEL = '@cf/openai/whisper-large-v3-turbo';
  let seen = '';
  stub(async (url) => { seen = url; return new Response(JSON.stringify({ text: 'ok' }), { status: 200 }); });
  const r = await transcribeAudio(bytes());
  assert.equal(r.model, '@cf/openai/whisper-large-v3-turbo');
  assert.match(seen, /whisper-large-v3-turbo$/);
});

test('picks the separate audio track for a video submission', () => {
  assert.deepEqual(
    mediaKeyForTranscription({ recordingMode: 'video', mediaKey: 'video/a.webm', audioKey: 'audio/a.webm' }),
    { key: 'audio/a.webm' }
  );
});

test('uses the recording itself for an audio submission', () => {
  assert.deepEqual(
    mediaKeyForTranscription({ recordingMode: 'audio', mediaKey: 'audio/b.webm' }),
    { key: 'audio/b.webm' }
  );
});

test('a video with no audio track explains itself rather than failing silently', () => {
  const r = mediaKeyForTranscription({ recordingMode: 'video', mediaKey: 'video/old.mp4' });
  assert.equal(r.key, null);
  assert.match(r.why, /no separate audio track/);
});

test('a text submission has nothing to transcribe', () => {
  const r = mediaKeyForTranscription({ recordingMode: 'text' });
  assert.equal(r.key, null);
  assert.match(r.why, /no audio/);
});

// ── repetition guard ──────────────────────────────────────────────────────
// Whisper looped on the first real recording we tested: a 25-word span came
// back twice, both stamped 21.52s-23.82s. These lock in the timeline-based fix.

const timed = (pairs) => pairs.map(([word, start]) => ({ word, start, end: start + 0.3 }));

test('drops a span the model repeated at the same timestamps', () => {
  const words = timed([
    ['it', 1.0], ['held', 1.3], ['still', 1.6],
    ['we', 2.0], ['were', 2.3], ['paralyzed', 2.6],
    // the loop: same words, same timestamps, emitted again
    ['we', 2.0], ['were', 2.3], ['paralyzed', 2.6],
    ['then', 3.0], ['it', 3.3], ['moved', 3.6],
  ]);
  const { text, removed } = textFromWords(words);
  assert.equal(removed, 3);
  assert.equal(text, 'it held still we were paralyzed then it moved');
});

test('leaves a clean timeline completely alone', () => {
  const words = timed([['the', 0.1], ['frogs', 0.4], ['stopped', 0.7]]);
  const { text, removed } = textFromWords(words);
  assert.equal(removed, 0);
  assert.equal(text, 'the frogs stopped');
});

test('a word genuinely repeated later in the recording is kept', () => {
  // Same word, different moment — that is speech, not a loop.
  const words = timed([['silence', 1.0], ['then', 2.0], ['silence', 9.0]]);
  const { text, removed } = textFromWords(words);
  assert.equal(removed, 0);
  assert.equal(text, 'silence then silence');
});

test('small timestamp jitter is not mistaken for a loop', () => {
  const words = [
    { word: 'a', start: 1.00, end: 1.2 },
    { word: 'b', start: 0.95, end: 1.3 },
    { word: 'c', start: 1.40, end: 1.6 },
  ];
  const { removed } = textFromWords(words);
  assert.equal(removed, 0, '50ms of jitter should be tolerated');
});

test('joins bare tokens with spaces and keeps punctuation closed up', () => {
  const { text } = textFromWords(timed([['the', 1], ['whole', 2], ['time.', 3]]));
  assert.equal(text, 'the whole time.');
});

test('respects tokens that carry their own leading spaces', () => {
  const words = [
    { word: 'It', start: 1 }, { word: ' held', start: 2 }, { word: ' still.', start: 3 },
  ];
  const { text } = textFromWords(words);
  assert.equal(text, 'It held still.');
});

test('words without timestamps are kept rather than risked', () => {
  const words = [{ word: 'kept' }, { word: 'also', start: 1 }, { word: 'kept' }];
  const { text, removed } = textFromWords(words);
  assert.equal(removed, 0);
  assert.match(text, /kept also kept/);
});
