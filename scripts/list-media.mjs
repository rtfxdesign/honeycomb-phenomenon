// List media objects in the bucket with sizes (read-only).
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/Project Honeycomb/honeycomb-phenomenon/.env.local", "utf8").split(/\r?\n/).filter(l => l.includes("=") && !l.startsWith("#")).map(l => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }));
const client = new S3Client({ region: "auto", endpoint: env.R2_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY } });
const Bucket = env.R2_BUCKET || env.R2_BUCKET_NAME;
let token; const objs = [];
do { const r = await client.send(new ListObjectsV2Command({ Bucket, ContinuationToken: token })); objs.push(...(r.Contents || [])); token = r.NextContinuationToken; } while (token);
const media = objs.filter(o => /\.(mp4|mov|webm|m4v|m4a|mp3|wav|ogg|aac)$/i.test(o.Key)).sort((a, b) => b.Size - a.Size);
console.log("objects:", objs.length, "| media:", media.length);
for (const o of media) console.log(String(Math.round(o.Size / 1048576 * 10) / 10).padStart(7), "MB ", o.Key);
