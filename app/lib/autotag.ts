/**
 * Tag a story by reading it, not by matching words.
 *
 * The dictionary in /api/generate-tags matches phrases, which works on short
 * typed accounts and fails on long spoken ones: a ten-minute transcript says
 * "being", "witness" and "night" in passing, and each was a tag. This sends
 * the text to a language model on Workers AI — the same Cloudflare account
 * that already transcribes the recordings, so no other company sees a story —
 * with the vocabulary and what each tag means, and lets it choose. The answer
 * is constrained to the vocabulary by a JSON schema and checked again here, so
 * it can never invent a tag the comb does not cluster on.
 *
 * It suggests; a moderator still confirms. Moderator-only at the route, so a
 * visitor typing in the recorder never spends a model call.
 *
 * Env: CF_ACCOUNT_ID, CF_AI_TOKEN (the transcription pair); optional
 * CF_TAG_MODEL, default below.
 */
import { TAG_GROUPS, ALL_TAGS } from "./tags.js";

const DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const MAX_TAGS = 6;
// about 6,000 words: longer than any account so far, well inside the model
const MAX_CHARS = 36_000;

export const aiTaggingConfigured = () => Boolean(process.env.CF_ACCOUNT_ID && process.env.CF_AI_TOKEN);

const meanings = Object.values(TAG_GROUPS as Record<string, Record<string, string>>)
  .flatMap((group) => Object.entries(group))
  .map(([tag, meaning]) => `${tag}: ${meaning}`)
  .join("\n");

const SYSTEM = `You tag first-person accounts of anomalous experiences for an archive.
Choose the tags that describe what the account is about, from this list only:
${meanings}

Rules:
- Tag what happened in the experience, not words that appear in passing. "Bear witness" is not multiple-witness; "being able to" is not humanoid; "a full night's sleep" is not night.
- Choose between 1 and ${MAX_TAGS} tags. Fewer, accurate tags are better than many.
- If nothing fits, return an empty list.`;

export type AiTags = { ok: true; tags: string[]; model: string } | { ok: false; error: string };

export async function aiTags(text: string): Promise<AiTags> {
  const model = process.env.CF_TAG_MODEL || DEFAULT_MODEL;
  try {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/${model}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CF_AI_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: text.slice(0, MAX_CHARS) }],
        response_format: {
          type: "json_schema",
          json_schema: { type: "object", properties: { tags: { type: "array", items: { type: "string", enum: ALL_TAGS } } }, required: ["tags"] },
        },
        temperature: 0,
        max_tokens: 200,
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) return { ok: false, error: `Workers AI ${res.status}: ${JSON.stringify(body?.errors || body).slice(0, 200)}` };
    // The run endpoint has answered in two shapes: { response } and an
    // OpenAI-style { choices: [{ message: { content } }] }. Either may hold
    // the JSON as a string or as an object.
    const r = body.result || {};
    const raw = r.response ?? r.choices?.[0]?.message?.content;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const known = new Set(ALL_TAGS);
    const tags = [...new Set<string>((parsed?.tags || []).map((t: unknown) => String(t).trim().toLowerCase()))]
      .filter((t) => known.has(t))
      .slice(0, MAX_TAGS);
    return { ok: true, tags, model };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
