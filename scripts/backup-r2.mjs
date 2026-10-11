// Encrypted backup of the archive bucket, run by hand from the machine that
// holds .env.local. One tar.gz of every object (records, media, members,
// audit), encrypted with a passphrase that lives nowhere near the bucket,
// written to a folder of your choosing — a drive you control, not cloud sync.
//
//   node scripts/backup-r2.mjs <output-folder>            full backup
//   node scripts/backup-r2.mjs <output-folder> --dry-run  list what would go
//
// Passphrase: HONEYCOMB_BACKUP_PASSPHRASE in the environment, or you are
// asked for it. Lose it and the backup is noise, which is the point.
//
// Why this exists: /privacy promises "removed means gone", and a backup is
// a copy that a removal does not reach. So a backup here is (a) encrypted
// under a key the storage provider never sees, (b) listed in the deletion
// checklist, so a removal request means the newest backup is rotated out
// after the retention window, and (c) kept short: DEFAULT_KEEP backups, then
// the oldest is deleted. Document the window on /privacy once this is run.
//
// Restore: decrypt with
//   openssl enc -d -aes-256-cbc -pbkdf2 -in <file>.tar.gz.enc -out <file>.tar.gz
// then untar; each object lands at its original key.

import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";

const [outDir, ...flags] = process.argv.slice(2);
const DRY = flags.includes("--dry-run");
const DEFAULT_KEEP = Number(process.env.HONEYCOMB_BACKUP_KEEP || 3);
if (!outDir) { console.error("usage: node scripts/backup-r2.mjs <output-folder> [--dry-run]"); process.exit(2); }

// .env.local beside this script's repo, whatever the drive letter or OS.
const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const envFile = path.join(repo, ".env.local");
const env = fs.existsSync(envFile)
  ? Object.fromEntries(fs.readFileSync(envFile, "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]; }))
  : {};
const get = (k) => process.env[k] || env[k];
const Bucket = get("R2_BUCKET") || get("R2_BUCKET_NAME");
const client = new S3Client({
  region: "auto",
  endpoint: get("R2_ENDPOINT") || `https://${get("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: get("R2_ACCESS_KEY_ID"), secretAccessKey: get("R2_SECRET_ACCESS_KEY") },
});
if (!Bucket || !get("R2_ACCESS_KEY_ID")) { console.error("R2 credentials not found (.env.local or environment)"); process.exit(2); }

async function listAll() {
  const keys = [];
  let ContinuationToken;
  do {
    const res = await client.send(new ListObjectsV2Command({ Bucket, ContinuationToken }));
    for (const o of res.Contents || []) keys.push({ key: o.Key, size: o.Size || 0 });
    ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (ContinuationToken);
  return keys;
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const objects = await listAll();
const total = objects.reduce((n, o) => n + o.size, 0);
console.log(`${objects.length} objects, ${(total / 1e6).toFixed(1)} MB in ${Bucket}`);
if (DRY) { for (const o of objects) console.log(`  ${o.key}  ${o.size}`); process.exit(0); }

let passphrase = process.env.HONEYCOMB_BACKUP_PASSPHRASE;
if (!passphrase) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  passphrase = await rl.question("Backup passphrase: ");
  rl.close();
}
if (!passphrase || passphrase.length < 12) { console.error("Refusing a passphrase under 12 characters."); process.exit(2); }

const work = fs.mkdtempSync(path.join(os.tmpdir(), "hc-backup-"));
const stage = path.join(work, stamp);
for (const o of objects) {
  const dest = path.join(stage, ...o.key.split("/"));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await client.send(new GetObjectCommand({ Bucket, Key: o.key }));
  fs.writeFileSync(dest, Buffer.from(await res.Body.transformToByteArray()));
}
fs.writeFileSync(path.join(stage, "MANIFEST.json"), JSON.stringify({ bucket: Bucket, at: stamp, objects }, null, 2));

fs.mkdirSync(outDir, { recursive: true });
const tarball = path.join(work, `${stamp}.tar.gz`);
const tar = spawnSync("tar", ["-czf", tarball, "-C", work, stamp], { encoding: "utf8" });
if (tar.status !== 0) { console.error("tar failed:", tar.stderr); process.exit(1); }
const outFile = path.join(outDir, `honeycomb-r2-${stamp}.tar.gz.enc`);
const enc = spawnSync("openssl", ["enc", "-aes-256-cbc", "-pbkdf2", "-salt", "-in", tarball, "-out", outFile, "-pass", "env:HC_BACKUP_PASS"],
  { encoding: "utf8", env: { ...process.env, HC_BACKUP_PASS: passphrase } });
if (enc.status !== 0) { console.error("openssl failed:", enc.stderr); process.exit(1); }
fs.rmSync(work, { recursive: true, force: true });
console.log(`wrote ${outFile} (${(fs.statSync(outFile).size / 1e6).toFixed(1)} MB)`);

// rotation: keep the newest DEFAULT_KEEP, delete the rest
const existing = fs.readdirSync(outDir).filter((f) => /^honeycomb-r2-.*\.tar\.gz\.enc$/.test(f)).sort();
for (const old of existing.slice(0, Math.max(0, existing.length - DEFAULT_KEEP))) {
  fs.rmSync(path.join(outDir, old));
  console.log(`rotated out ${old}`);
}
