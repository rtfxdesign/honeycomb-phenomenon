// The approval encoder.
//
// Every approved video record whose file is not yet a streaming copy gets one:
// the original is downloaded, re-encoded (H.264 1080p, bitrate capped at 4
// Mbit/s, AAC, index at the front), uploaded beside the original as
// <name>-web.mp4, and the record is pointed at the copy with originalMediaKey
// kept. Nothing is ever deleted from the bucket. Production and preview are
// both handled; a logical key is encoded once and uploaded under each prefix
// that needs it.
//
// It also takes a still from every approved video — one representative frame
// a couple of seconds in, 640px wide, WebP, no metadata — uploaded as
// <name>-still.webp and recorded as stillKey. A cell with no photo shows the
// still instead of initials, so twelve stories from one person read as twelve
// different cells. Records that already have a still are left alone; ones
// encoded before stills existed get theirs from the -web.mp4.
//
// And it gives every video — pending as well as approved — an audio track,
// <name>-audio.mp3, recorded as audioKey. Transcription takes audio, not a
// video container; the browser recorder captures a separate audio track, but
// an uploaded file never had one, nor did recordings made before that, so
// "Transcribe recording" had nothing to work with for most videos. Pending
// submissions get only this step: the encode and the still wait for approval.
//
// Then it transcribes what the site could not wait for. A site function gets
// well under thirty seconds and Whisper takes about seven a minute of audio,
// so "Transcribe recording" on anything over about three minutes marks the
// record "queued" and this does it, writing the same draft (machineTranscript,
// status "ready") the dashboard would have. A pending video that arrived with
// no words at all ("awaiting") is drafted without being asked. It uses the
// site's own transcription code (app/lib/transcribe.ts), so the cleanup and
// the warnings are the same.
//
// Runs from a scheduled task every few minutes on Allen's machine (the site's
// functions cannot run ffmpeg on files this size). Safe to run at any time:
// records already pointing at a -web.mp4, or carrying mediaEncodedAt, are not
// re-encoded, and a lock file stops two runs overlapping. A record is read
// again just before it is written, and only this script's fields are added,
// so a moderator's edit made while a file was encoding is kept.
//
// Usage: node scripts/encode-approved.mjs [--dry-run] [--no-stills] [--no-audio] [--only=<prefix>]
//   --no-stills       make no stills
//   --no-audio        make no audio tracks and transcribe nothing
//   --only=preview/   one prefix only; --only= (empty) is production alone
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { transcribeAudio, transcriptionConfigured, mediaKeyForTranscription, explainFailure } from "../app/lib/transcribe.ts";

const DRY = process.argv.includes("--dry-run");
// media-work sits beside the repo clone unless MEDIA_WORK says otherwise
const WORK = process.env.MEDIA_WORK || fileURLToPath(new URL("../../media-work", import.meta.url));
const LOG = path.join(WORK, "encode.log");
const LOCK = path.join(WORK, "encode.lock");
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const STILLS = !process.argv.includes("--no-stills");
const AUDIO = !process.argv.includes("--no-audio");
const ONLY = process.argv.find((a) => a.startsWith("--only="));
const PREFIXES = ONLY !== undefined ? [ONLY.slice("--only=".length)] : ["", "preview/"];
const VIDEO_EXT = /\.(mov|mp4|m4v|webm|mkv|avi|3gp)$/i;

fs.mkdirSync(path.join(WORK, "originals"), { recursive: true });
fs.mkdirSync(path.join(WORK, "web"), { recursive: true });
const log = (...a) => { const line = `${new Date().toISOString()} ${a.join(" ")}`; console.log(line); fs.appendFileSync(LOG, line + "\n"); };

// one run at a time; a lock older than two hours is treated as stale
if (fs.existsSync(LOCK)) {
  const age = Date.now() - fs.statSync(LOCK).mtimeMs;
  if (age < 2 * 3600 * 1000) { console.log("another run holds the lock; leaving"); process.exit(0); }
}
fs.writeFileSync(LOCK, String(process.pid));
process.on("exit", () => { try { fs.unlinkSync(LOCK); } catch { /* gone */ } });

const env = Object.fromEntries(fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const client = new S3Client({ region: "auto", endpoint: env.R2_ENDPOINT, credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY } });
const Bucket = env.R2_BUCKET_NAME;
// the transcription code reads its Cloudflare credentials from process.env
for (const k of ["CF_ACCOUNT_ID", "CF_AI_TOKEN", "CF_AI_MODEL"]) if (env[k] && !process.env[k]) process.env[k] = env[k];

const exists = async (Key) => { try { await client.send(new HeadObjectCommand({ Bucket, Key })); return true; } catch { return false; } };
async function listKeys(Prefix) {
  let token; const keys = [];
  do { const r = await client.send(new ListObjectsV2Command({ Bucket, Prefix, ContinuationToken: token })); keys.push(...(r.Contents || []).map((o) => o.Key)); token = r.NextContinuationToken; } while (token);
  return keys;
}
async function readRecord(Key) {
  try { return JSON.parse(await (await client.send(new GetObjectCommand({ Bucket, Key }))).Body.transformToString()); } catch { return null; }
}
const webKeyFor = (mediaKey) => mediaKey.replace(VIDEO_EXT, "") + "-web.mp4";
// from either the original or its -web.mp4 copy, the same name
const stemOf = (mediaKey) => mediaKey.replace(/-web\.mp4$/i, "").replace(VIDEO_EXT, "");
const stillKeyFor = (mediaKey) => stemOf(mediaKey) + "-still.webp";
const audioKeyFor = (mediaKey) => stemOf(mediaKey) + "-audio.mp3";

async function download(Key, file) {
  const r = await client.send(new GetObjectCommand({ Bucket, Key }));
  await pipeline(r.Body, fs.createWriteStream(file));
}
function encode(input, output) {
  // -map_metadata -1: the web copy carries none of the source's tags — no
  // device model, no GPS, no creation time — which is what /privacy promises
  // for anything that reaches the archive.
  const args = ["-y", "-hide_banner", "-nostats", "-loglevel", "error", "-i", input, "-map_metadata", "-1", "-map", "0:v:0", "-map", "0:a:0?",
    "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-maxrate", "4M", "-bufsize", "8M", "-profile:v", "high", "-level", "4.1", "-pix_fmt", "yuv420p",
    "-vf", "scale='min(1920,iw)':'min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", output];
  const r = spawnSync(FFMPEG, args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg failed (${r.status}): ${(r.stderr || "").slice(0, 400)}`);
}
function grabStill(input, output) {
  // thumbnail=60 picks the most typical of 60 frames, which skips a blink or
  // a frame of motion blur. Two seconds in misses the fumble of pressing
  // record; a clip shorter than that is taken from the start.
  let err = "";
  for (const seek of ["2", "0"]) {
    const args = ["-y", "-hide_banner", "-nostats", "-loglevel", "error", "-ss", seek, "-i", input, "-map_metadata", "-1",
      "-vf", "thumbnail=60,scale='min(640,iw)':-2", "-frames:v", "1", "-c:v", "libwebp", "-quality", "80", output];
    const r = spawnSync(FFMPEG, args, { encoding: "utf8" });
    if (r.status === 0 && fs.existsSync(output) && fs.statSync(output).size > 0) return;
    err = r.stderr || "";
  }
  throw new Error(`ffmpeg could not take a still: ${err.slice(0, 400)}`);
}
function extractAudio(input, output) {
  // Mono, 16 kHz, MP3 at 48 kbit/s: what Whisper works at anyway, and about
  // 0.36 MB a minute, so even an hour-long account stays under the 25 MB the
  // transcription step accepts. No metadata, as with everything else.
  const args = ["-y", "-hide_banner", "-nostats", "-loglevel", "error", "-i", input, "-vn", "-map_metadata", "-1",
    "-ac", "1", "-ar", "16000", "-c:a", "libmp3lame", "-b:a", "48k", output];
  const r = spawnSync(FFMPEG, args, { encoding: "utf8" });
  if (r.status !== 0 || !fs.existsSync(output) || fs.statSync(output).size === 0) {
    throw new Error(`ffmpeg could not extract audio (${r.status}): ${(r.stderr || "the video may have no sound").slice(0, 400)}`);
  }
}

const encoded = new Map(); // logical web key -> local file, for this run
const stills = new Map(); // logical still key -> local file, for this run
const audios = new Map(); // logical audio key -> local file, for this run
let work = 0;
for (const prefix of PREFIXES) {
  for (const [folder, approved] of [["approved/submissions/", true], ["submissions/", false]]) {
    if (!approved && !AUDIO) continue;
    const keys = (await listKeys(prefix + folder)).filter((k) => k.endsWith(".json"));
    for (const k of keys) {
      const d = await readRecord(k);
      if (!d || !d.mediaKey) continue;
      const isVideo = d.recordingMode === "video" && VIDEO_EXT.test(d.mediaKey);
      const needsWeb = isVideo && approved && !(/-web\.mp4$/i.test(d.mediaKey) || d.mediaEncodedAt);
      const needsStill = isVideo && approved && STILLS && !d.stillKey;
      const needsAudio = isVideo && AUDIO && !d.audioKey;
      // what the dashboard queued, or a pending video that came with no words
      const needsTranscript = AUDIO && transcriptionConfigured() && d.recordingMode !== "text" &&
        (d.transcriptStatus === "queued" || (!approved && isVideo && !d.machineTranscript && d.transcriptStatus === "awaiting"));
      if (!needsWeb && !needsStill && !needsAudio && !needsTranscript) continue;
      const webKey = needsWeb ? webKeyFor(d.mediaKey) : d.mediaKey;
      const stillKey = stillKeyFor(d.mediaKey);
      const audioKey = audioKeyFor(d.mediaKey);
      const physOriginal = prefix + d.mediaKey;
      const physWeb = prefix + webKey;
      const physStill = prefix + stillKey;
      const physAudio = prefix + audioKey;
      work++;
      log(`${DRY ? "[dry] " : ""}${k}: "${d.title}"${needsWeb ? ` -> ${webKey}` : ""}${needsStill ? ` + ${stillKey}` : ""}${needsAudio ? ` + ${audioKey}` : ""}${needsTranscript ? " + transcript" : ""}`);
      if (DRY) continue;
      const fields = {}; // only what this script adds to the record
      let local = encoded.get(webKey); // the streaming copy on disk, when this run made it
      let fetched = null; // a video downloaded only for a still or an audio track
      // the video to take a still or the audio from: the streaming copy where
      // there is one (smaller to fetch), else the original
      const source = async (why) => {
        if (local) return local;
        if (fetched) return fetched;
        const src = (await exists(physWeb)) ? physWeb : physOriginal;
        if (!(await exists(src))) throw new Error(`video missing: ${src}`);
        fetched = path.join(WORK, "originals", path.basename(src));
        log(`  downloading ${src} for ${why}`);
        await download(src, fetched);
        return fetched;
      };
      try {
        if (needsWeb) {
          if (!(await exists(physWeb))) {
            if (!local) {
              if (!(await exists(physOriginal))) { log(`  original missing: ${physOriginal}; skipped`); continue; }
              const orig = path.join(WORK, "originals", path.basename(d.mediaKey));
              const out = path.join(WORK, "web", path.basename(webKey));
              log(`  downloading ${physOriginal}`);
              await download(physOriginal, orig);
              log(`  encoding (${Math.round(fs.statSync(orig).size / 1048576)} MB in)`);
              encode(orig, out);
              log(`  encoded (${Math.round(fs.statSync(out).size / 1048576)} MB out)`);
              fs.unlinkSync(orig);
              local = out; encoded.set(webKey, out);
            }
            const size = fs.statSync(local).size;
            await client.send(new PutObjectCommand({ Bucket, Key: physWeb, Body: fs.readFileSync(local), ContentLength: size, ContentType: "video/mp4" }));
            log(`  uploaded ${physWeb}`);
          }
          Object.assign(fields, { mediaKey: webKey, originalMediaKey: d.originalMediaKey || d.mediaKey, mediaEncodedAt: new Date().toISOString() });
        }
        if (needsStill) {
          if (!(await exists(physStill))) {
            let still = stills.get(stillKey);
            if (!still) {
              still = path.join(WORK, "web", path.basename(stillKey));
              grabStill(await source("a still"), still);
              stills.set(stillKey, still);
            }
            await client.send(new PutObjectCommand({ Bucket, Key: physStill, Body: fs.readFileSync(still), ContentType: "image/webp" }));
            log(`  uploaded ${physStill} (${Math.round(fs.statSync(still).size / 1024)} KB)`);
          }
          Object.assign(fields, { stillKey, stillMadeAt: new Date().toISOString() });
        }
        if (needsAudio) {
          if (!(await exists(physAudio))) {
            let audio = audios.get(audioKey);
            if (!audio) {
              audio = path.join(WORK, "web", path.basename(audioKey));
              extractAudio(await source("its audio"), audio);
              audios.set(audioKey, audio);
            }
            await client.send(new PutObjectCommand({ Bucket, Key: physAudio, Body: fs.readFileSync(audio), ContentType: "audio/mpeg" }));
            log(`  uploaded ${physAudio} (${Math.round(fs.statSync(audio).size / 1024)} KB)`);
          }
          Object.assign(fields, { audioKey, audioExtractedAt: new Date().toISOString() });
        }
        const transcript = {}; // kept apart: dropped if a moderator decided meanwhile
        if (needsTranscript) {
          const key = fields.audioKey || mediaKeyForTranscription(d).key;
          if (!key) throw new Error("no audio to transcribe");
          const obj = await client.send(new GetObjectCommand({ Bucket, Key: prefix + key }));
          const bytes = await obj.Body.transformToByteArray();
          log(`  transcribing ${key} (${(bytes.byteLength / 1048576).toFixed(1)} MB)`);
          const result = await transcribeAudio(bytes, { contentType: obj.ContentType || "application/octet-stream" });
          if (result.ok) {
            Object.assign(transcript, {
              machineTranscript: result.text, transcriptStatus: "ready", transcriptSource: "machine", transcriptModel: result.model,
              transcribedAt: new Date().toISOString(), transcriptError: undefined, transcriptWarnings: result.warnings.length ? result.warnings : undefined,
            });
            log(`  transcribed: ${result.wordCount} words`);
          } else {
            Object.assign(transcript, { transcriptStatus: "failed", transcriptError: explainFailure(result.reason, result.detail), transcriptAttemptedAt: new Date().toISOString() });
            log(`  transcription failed: ${result.reason} ${result.detail || ""}`);
          }
        }
        // Read the record again and add only our fields: a moderator may have
        // edited it, or approved or deleted it, while the file was encoding.
        const fresh = await readRecord(k);
        if (!fresh) { log(`  record gone (approved or deleted meanwhile): ${k}; not rewritten`); continue; }
        const stillWanted = fresh.transcriptStatus === "queued" || fresh.transcriptStatus === "awaiting";
        if (needsTranscript && !stillWanted) log("  transcript not written: the moderator settled it meanwhile");
        const next = { ...fresh, ...fields, ...(stillWanted ? transcript : {}) };
        await client.send(new PutObjectCommand({ Bucket, Key: k, Body: JSON.stringify(next, null, 2), ContentType: "application/json" }));
        log(`  record updated: ${k}`);
      } catch (e) {
        log(`  FAILED ${k}: ${e.message}`);
      } finally {
        if (fetched) { try { fs.unlinkSync(fetched); } catch { /* gone */ } }
      }
    }
  }
}
for (const f of [...encoded.values(), ...stills.values(), ...audios.values()]) { try { fs.unlinkSync(f); } catch { /* keep going */ } }
log(work ? `done: ${work} record(s) considered` : "nothing to do");
