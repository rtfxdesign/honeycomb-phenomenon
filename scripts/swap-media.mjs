// Put a web encode of a record's video beside the original and point the
// record at it. The original stays in the bucket; the record keeps its old key
// as originalMediaKey. Both the production and the preview copies are updated
// when both exist.
//
// Usage: node scripts/swap-media.mjs <local .mp4> <new logical key> <old logical mediaKey>
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import fs from "node:fs";

const [file, newKey, oldKey] = process.argv.slice(2);
if (!file || !newKey || !oldKey) { console.error("usage: swap-media.mjs <file> <newKey> <oldKey>"); process.exit(1); }
const env = Object.fromEntries(fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/).filter(l => l.includes("=") && !l.startsWith("#")).map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const client = new S3Client({ region: "auto", endpoint: env.R2_ENDPOINT, credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY } });
const Bucket = env.R2_BUCKET_NAME;

const exists = async (Key) => { try { await client.send(new HeadObjectCommand({ Bucket, Key })); return true; } catch { return false; } };
const size = fs.statSync(file).size;

for (const prefix of ["", "preview/"]) {
  const physNew = prefix + newKey;
  if (await exists(physNew)) { console.log("exists, not re-uploading:", physNew); }
  else {
    // one PUT, the file in memory: R2 takes up to 5 GB this way and these are ~100 MB
    await client.send(new PutObjectCommand({ Bucket, Key: physNew, Body: fs.readFileSync(file), ContentLength: size, ContentType: "video/mp4" }));
    console.log(`uploaded ${physNew} (${Math.round(size / 1048576)} MB)`);
  }
  // every record under this prefix that points at the old key
  let token; const keys = [];
  do { const r = await client.send(new ListObjectsV2Command({ Bucket, Prefix: prefix + "approved/submissions/", ContinuationToken: token })); keys.push(...(r.Contents || []).map((o) => o.Key)); token = r.NextContinuationToken; } while (token);
  for (const k of keys.filter((k) => k.endsWith(".json"))) {
    const r = await client.send(new GetObjectCommand({ Bucket, Key: k }));
    const d = JSON.parse(await r.Body.transformToString());
    if (d.mediaKey !== oldKey) continue;
    const next = { ...d, mediaKey: newKey, originalMediaKey: d.originalMediaKey || oldKey, mediaEncodedAt: new Date().toISOString() };
    await client.send(new PutObjectCommand({ Bucket, Key: k, Body: JSON.stringify(next, null, 2), ContentType: "application/json" }));
    console.log("record updated:", k, "→", newKey);
  }
}
console.log("done");
