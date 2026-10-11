// Which records point at which media files (read-only). Usage: node scripts/find-media-records.mjs [substring]
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter(l => l.includes("=") && !l.startsWith("#")).map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const client = new S3Client({ region: "auto", endpoint: env.R2_ENDPOINT, credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY } });
const Bucket = env.R2_BUCKET_NAME; const needle = (process.argv[2] || "").toLowerCase();
let token; const keys = [];
do { const r = await client.send(new ListObjectsV2Command({ Bucket, ContinuationToken: token })); keys.push(...(r.Contents || []).map(o => o.Key)); token = r.NextContinuationToken; } while (token);
for (const k of keys.filter(k => k.endsWith(".json") && !k.includes("/members/") && !k.startsWith("members/") && !k.includes("people/"))) {
  const r = await client.send(new GetObjectCommand({ Bucket, Key: k }));
  const d = JSON.parse(await r.Body.transformToString());
  if (!d.mediaKey) continue;
  if (needle && !d.mediaKey.toLowerCase().includes(needle)) continue;
  console.log(k, "| id", d.id, "| title", JSON.stringify(d.title), "| mode", d.recordingMode, "| mediaKey", d.mediaKey, "| privacy", d.privacy);
}
