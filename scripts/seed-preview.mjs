/**
 * Seeds the preview environment with test submissions.
 *
 * Writes into the same R2 bucket as production but under R2_PREFIX (normally
 * "preview/"), so nothing here can reach the live archive. Refuses to run
 * without a prefix for exactly that reason.
 *
 *   R2_PREFIX=preview/ node scripts/seed-preview.mjs          # add seed data
 *   R2_PREFIX=preview/ node scripts/seed-preview.mjs --wipe   # clear it first
 */
import { readFile } from "node:fs/promises";
import { STORIES, PENDING } from "./seed-stories.mjs";
import {
  S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const PREFIX = process.env.R2_PREFIX || "";
const BUCKET = process.env.R2_BUCKET_NAME;
if (!PREFIX) {
  console.error("Refusing to seed without R2_PREFIX — that would write into the live archive.");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const phys = (k) => `${PREFIX}${k}`;

async function put(logicalKey, body, contentType) {
  await client.send(new PutObjectCommand({
    Bucket: BUCKET, Key: phys(logicalKey), Body: body, ContentType: contentType,
  }));
}

async function wipe() {
  let removed = 0;
  let token;
  do {
    const res = await client.send(new ListObjectsV2Command({
      Bucket: BUCKET, Prefix: PREFIX, ContinuationToken: token,
    }));
    for (const obj of res.Contents || []) {
      await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: obj.Key }));
      removed++;
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  console.log(`wiped ${removed} objects under ${PREFIX}`);
}

// ── the test archive ────────────────────────────────────────────────────────
// Fifty invented accounts, in scripts/seed-stories.mjs.

// Procedural portraits: warm abstract plates, clearly placeholders rather than
// invented faces, so the photo path is exercised honestly.
function portraitSvg(seedIndex) {
  // amber range only — these sit among real portraits and must not fight the
  // warm palette; deliberately abstract rather than an invented face
  const hue = 26 + ((seedIndex * 13) % 14);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <radialGradient id="g" cx="50%" cy="34%" r="76%">
      <stop offset="0%" stop-color="hsl(${hue + 8},62%,46%)"/>
      <stop offset="52%" stop-color="hsl(${hue},52%,26%)"/>
      <stop offset="100%" stop-color="hsl(${hue - 8},46%,10%)"/>
    </radialGradient>
  </defs>
  <rect width="600" height="600" fill="url(#g)"/>
  <circle cx="300" cy="238" r="92" fill="rgba(255,206,132,0.20)"/>
  <path d="M300 352c102 0 166 66 180 158H120c14-92 78-158 180-158z" fill="rgba(255,206,132,0.20)"/>
</svg>`;
}

const initialsOf = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

async function seed() {
  const stamp = Date.parse("2026-08-25T12:00:00Z");
  let n = 0;

  // one real video and one real audio file so the players can be exercised
  let videoKey = null;
  try {
    const video = await readFile(new URL("../public/videos/john-berg.mp4", import.meta.url));
    videoKey = "approved/video/seed-account.mp4";
    await put(videoKey, video, "video/mp4");
    console.log("uploaded seed video");
  } catch {
    console.log("no seed video available — skipping");
  }

  for (const [i, s] of STORIES.entries()) {
    const id = `sub_${stamp + i * 1000}`;
    let photoKey;
    if (s.portrait) {
      photoKey = `approved/image/${id}-portrait.svg`;
      await put(photoKey, portraitSvg(i), "image/svg+xml");
    }
    const useVideo = videoKey && i === 0;
    const record = {
      id,
      title: s.title,
      displayName: s.name,
      location: s.location,
      experienceYear: s.year,
      experienceType: s.type,
      transcript: s.text,
      privacy: s.privacy || "public",
      recordingMode: useVideo ? "video" : "text",
      hashtags: s.tags,
      mediaKey: useVideo ? videoKey : undefined,
      photoKey,
      submittedAt: new Date(stamp + i * 1000).toISOString(),
      approvedAt: new Date(stamp + i * 1000 + 500).toISOString(),
      status: "approved",
      seed: true,
    };
    await put(`approved/submissions/${id}.json`, JSON.stringify(record, null, 2), "application/json");
    n++;
  }

  for (const [i, s] of PENDING.entries()) {
    const id = `sub_${stamp + 900000 + i * 1000}`;
    const record = {
      id,
      title: s.title,
      displayName: s.name,
      location: s.location,
      experienceYear: s.year,
      experienceType: s.type,
      transcript: s.text,
      privacy: s.privacy,
      recordingMode: "text",
      hashtags: s.tags,
      submittedAt: new Date(stamp + 900000 + i * 1000).toISOString(),
      status: "pending",
      seed: true,
    };
    await put(`submissions/${id}.json`, JSON.stringify(record, null, 2), "application/json");
    n++;
  }

  console.log(`seeded ${n} records under ${PREFIX} (${STORIES.length} approved, ${PENDING.length} pending)`);
}

if (process.argv.includes("--wipe")) await wipe();
await seed();
