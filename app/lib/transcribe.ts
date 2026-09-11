/**
 * Machine transcription via Cloudflare Workers AI.
 *
 * Why Workers AI rather than a dedicated speech vendor: the recordings are
 * already in Cloudflare R2. Transcribing them in the same account means no new
 * data processor receives a community member's testimony — which matters here,
 * because some of these records are marked "strictly archived" and their
 * authors asked that they never be published.
 *
 * The REST endpoint is used rather than a Workers binding so the existing
 * Netlify deployment can call it directly, with no Worker to deploy or
 * maintain.
 *
 * Required env:
 *   CF_ACCOUNT_ID          Cloudflare account id
 *   CF_AI_TOKEN            API token with Workers AI read/run permission.
 *                          NOT the R2 token — that one is scoped to the bucket.
 * Optional env:
 *   CF_AI_MODEL            default "@cf/openai/whisper"
 *   TRANSCRIBE_MAX_BYTES   default 25 MB
 */

export const DEFAULT_MODEL = "@cf/openai/whisper";

// Netlify's function budget is the real constraint, not Workers AI. A long
// recording will outlast the request before it outgrows any model limit, so we
// refuse oversized files up front with a status the dashboard can explain
// rather than letting the request die at the edge with a generic 502.
export const MAX_BYTES = Number(process.env.TRANSCRIBE_MAX_BYTES || 25 * 1024 * 1024);

export type TranscriptionResult =
  | { ok: true; text: string; model: string; wordCount: number; warnings: string[] }
  | { ok: false; reason: "not-configured" | "too-large" | "empty" | "failed"; detail?: string };

type TimedWord = { word?: string; start?: number; end?: number };

/**
 * Rebuild the transcript from the word timeline, dropping repeated spans.
 *
 * Whisper sometimes loops: it emits the same passage twice, with *identical*
 * timestamps, because its decoding windows overlap. Seen on the first real
 * recording we tested — a 25-word span appeared twice, both stamped
 * 21.52s-23.82s, so the audio said it once and the model said it twice.
 *
 * Text heuristics for this are guesswork; the timeline is not. Any word that
 * starts earlier than where we have already reached is a step backwards in
 * time, which no genuine speech does, so it is a repeat and gets dropped.
 */
export function textFromWords(words: TimedWord[]): { text: string; removed: number } {
  const kept: string[] = [];
  let furthest = -Infinity;
  let removed = 0;
  // Once a jump backwards proves we are inside a repeat, stay in it until the
  // timeline moves past where we had already reached. Without this the last
  // word of a repeated span survives, because its timestamp is exactly the
  // boundary rather than behind it.
  let insideRepeat = false;

  // A tenth of a second of slack throughout: word boundaries are not exact and
  // we only want to catch a real jump backwards, not ordinary jitter.
  const SLACK = 0.1;

  for (const w of words) {
    const word = typeof w?.word === "string" ? w.word : "";
    const start = Number(w?.start);

    // No usable timestamp — keep it rather than risk dropping real speech.
    if (!Number.isFinite(start)) {
      if (word) kept.push(word);
      continue;
    }

    if (start < furthest - SLACK) {
      insideRepeat = true;
      removed++;
      continue;
    }

    if (insideRepeat) {
      if (start <= furthest + SLACK) {
        removed++;
        continue;
      }
      insideRepeat = false;
    }

    furthest = Math.max(furthest, start);
    if (word) kept.push(word);
  }

  // Some responses carry their own spacing on each token (" the"), others hand
  // back bare words ("the"). Joining the second kind with "" produces one long
  // run-on string, so decide from the data rather than assuming.
  const carriesOwnSpacing = kept.some((w) => /^\s/.test(w));
  const joined = carriesOwnSpacing ? kept.join("") : kept.join(" ");

  const text = joined
    .replace(/\s+/g, " ")
    // Re-close punctuation that the join pushed away from its word.
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();

  return { text, removed };
}

export const transcriptionConfigured = () =>
  Boolean(process.env.CF_ACCOUNT_ID && process.env.CF_AI_TOKEN);

/**
 * Transcribe a media buffer. Returns a result object rather than throwing:
 * every failure here is a thing the moderator needs told plainly in the
 * dashboard, not a 500.
 */
export async function transcribeAudio(
  bytes: Uint8Array,
  opts: { model?: string; contentType?: string } = {}
): Promise<TranscriptionResult> {
  if (!transcriptionConfigured()) return { ok: false, reason: "not-configured" };
  if (!bytes || bytes.byteLength === 0) return { ok: false, reason: "empty" };
  if (bytes.byteLength > MAX_BYTES) {
    return {
      ok: false,
      reason: "too-large",
      detail: `${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB exceeds the ${(MAX_BYTES / 1024 / 1024).toFixed(0)} MB limit`,
    };
  }

  const model = opts.model || process.env.CF_AI_MODEL || DEFAULT_MODEL;
  const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/${model}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CF_AI_TOKEN}`,
        "Content-Type": opts.contentType || "application/octet-stream",
      },
      // Whisper on Workers AI takes the raw audio bytes as the request body.
      body: bytes as unknown as BodyInit,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, reason: "failed", detail: `${res.status} ${detail.slice(0, 300)}` };
    }

    const body = await res.json();
    // Verified against the account REST API: the response is
    // { errors, messages, success, result: { text, vtt, words, word_count } }.
    // The bare { text } form is still accepted because it has been seen when
    // the call is proxied, and pinning to one shape would break on the next
    // revision for no gain.
    const text: unknown = body?.result?.text ?? body?.text;
    if (typeof text !== "string" || !text.trim()) {
      return { ok: false, reason: "failed", detail: "no text in response" };
    }

    const warnings: string[] = [];
    let clean = text.trim();

    // Prefer the word timeline when it is there — it is the only reliable way
    // to catch the model repeating itself.
    const words: unknown = body?.result?.words ?? body?.words;
    if (Array.isArray(words) && words.length) {
      const rebuilt = textFromWords(words as TimedWord[]);
      if (rebuilt.text) {
        if (rebuilt.removed > 0) {
          warnings.push(
            `Removed ${rebuilt.removed} repeated word${rebuilt.removed === 1 ? "" : "s"} where the transcription looped. Worth checking this one against the recording.`
          );
        }
        clean = rebuilt.text;
      }
    }

    return {
      ok: true,
      text: clean,
      model,
      wordCount: clean.split(/\s+/).filter(Boolean).length,
      warnings,
    };
  } catch (err) {
    return { ok: false, reason: "failed", detail: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Whisper wants audio. A video/webm container is not audio, so a video
 * submission is transcribed from the audio track the recorder captures
 * alongside it (audioKey) rather than from the video itself. This picks the
 * right object and says so when there is nothing to work with.
 */
export function mediaKeyForTranscription(record: {
  audioKey?: string;
  mediaKey?: string;
  recordingMode?: string;
}): { key: string | null; why?: string } {
  if (record.audioKey) return { key: record.audioKey };
  if (record.recordingMode === "audio" && record.mediaKey) return { key: record.mediaKey };
  if (record.recordingMode === "video") {
    return {
      key: null,
      why: "This video has no separate audio track. Recordings made before audio capture was added cannot be transcribed automatically.",
    };
  }
  return { key: null, why: "This submission has no audio to transcribe." };
}

/** Human-readable explanation for a failure, for the review dashboard. */
export function explainFailure(reason: string, detail?: string): string {
  switch (reason) {
    case "not-configured":
      return "Transcription is not configured on this deployment (CF_ACCOUNT_ID / CF_AI_TOKEN).";
    case "too-large":
      return `Recording is too large to transcribe in one pass. ${detail || ""}`.trim();
    case "empty":
      return "The recording appears to be empty.";
    default:
      return `Transcription failed. ${detail || ""}`.trim();
  }
}
