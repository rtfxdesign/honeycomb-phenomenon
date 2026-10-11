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
// Runs from a scheduled task every few minutes on Allen's machine (the site's
// functions cannot run ffmpeg on files this size). Safe to run at any time:
// records already pointing at a -web.mp4, or carrying mediaEncodedAt, are
// skipped, and a lock file stops two runs overlapping.
//
// Usage: node scripts/encode-approved.mjs [--dry-run]
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";

const DRY = process.argv.includes("--dry-run");
const WORK = "E:/Project Honeycomb/media-work";
const LOG = path.join(WORK, "encode.log");
const LOCK = path.join(WORK, "encode.lock");
const FFMPEG = process.env.FFMPEG || "C:/Users/allen/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.0.1-full_build/bin/ffmpeg.exe";
const PREFIXES = ["", "preview/"];
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

const exists = async (Key) => { try { await client.send(new HeadObjectCommand({ Bucket, Key })); return true; } catch { return false; } };
async function listKeys(Prefix) {
  let token; const keys = [];
  do { const r = await client.send(new ListObjectsV2Command({ Bucket, Prefix, ContinuationToken: token })); keys.push(...(r.Contents || []).map((o) => o.Key)); token = r.NextContinuationToken; } while (token);
  return keys;
}
const webKeyFor = (mediaKey) => mediaKey.replace(VIDEO_EXT, "") + "-web.mp4";

async function download(Key, file) {
  const r = await client.send(new GetObjectCommand({ Bucket, Key }));
  await pipeline(r.Body, fs.createWriteStream(file));
}
function encode(input, output) {
  const args = ["-y", "-hide_banner", "-nostats", "-loglevel", "error", "-i", input, "-map", "0:v:0", "-map", "0:a:0?",
    "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-maxrate", "4M", "-bufsize", "8M", "-profile:v", "high", "-level", "4.1", "-pix_fmt", "yuv420p",
    "-vf", "scale='min(1920,iw)':'min(1920,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", output];
  const r = spawnSync(FFMPEG, args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg failed (${r.status}): ${(r.stderr || "").slice(0, 400)}`);
}

const encoded = new Map(); // logical web key -> local file, for this run
let work = 0;
for (const prefix of PREFIXES) {
  const keys = (await listKeys(prefix + "approved/submissions/")).filter((k) => k.endsWith(".json"));
  for (const k of keys) {
    const r = await client.send(new GetObjectCommand({ Bucket, Key: k }));
    const d = JSON.parse(await r.Body.transformToString());
    if (d.recordingMode !== "video" || !d.mediaKey || !VIDEO_EXT.test(d.mediaKey)) continue;
    if (/-web\.mp4$/i.test(d.mediaKey) || d.mediaEncodedAt) continue;
    const webKey = webKeyFor(d.mediaKey);
    const physOriginal = prefix + d.mediaKey;
    const physWeb = prefix + webKey;
    work++;
    log(`${DRY ? "[dry] " : ""}${k}: "${d.title}" -> ${webKey}`);
    if (DRY) continue;
    try {
      if (!(await exists(physWeb))) {
        let local = encoded.get(webKey);
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
      const next = { ...d, mediaKey: webKey, originalMediaKey: d.originalMediaKey || d.mediaKey, mediaEncodedAt: new Date().toISOString() };
      await client.send(new PutObjectCommand({ Bucket, Key: k, Body: JSON.stringify(next, null, 2), ContentType: "application/json" }));
      log(`  record repointed: ${k}`);
    } catch (e) {
      log(`  FAILED ${k}: ${e.message}`);
    }
  }
}
for (const f of encoded.values()) { try { fs.unlinkSync(f); } catch { /* keep going */ } }
log(work ? `done: ${work} record(s) considered` : "nothing to encode");
