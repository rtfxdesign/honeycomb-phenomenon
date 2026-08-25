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
  | { ok: true; text: string; model: string; wordCount: number }
  | { ok: false; reason: "not-configured" | "too-large" | "empty" | "failed"; detail?: string };

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
    // Shapes seen across Workers AI revisions: { result: { text } } from the
    // account REST API, and a bare { text } when proxied. Accept either rather
    // than pinning to one and breaking on the next revision.
    const text: unknown = body?.result?.text ?? body?.text;
    if (typeof text !== "string" || !text.trim()) {
      return { ok: false, reason: "failed", detail: "no text in response" };
    }

    const clean = text.trim();
    return {
      ok: true,
      text: clean,
      model,
      wordCount: Number(body?.result?.word_count ?? body?.word_count ?? clean.split(/\s+/).length),
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
