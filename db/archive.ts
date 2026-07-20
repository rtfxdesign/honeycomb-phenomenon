import { env } from "cloudflare:workers";

type ArchiveEnv = {
  DB: D1Database;
  ARCHIVE_MEDIA: R2Bucket;
};

export function getArchiveEnv() {
  const archiveEnv = env as unknown as ArchiveEnv;
  if (!archiveEnv.DB) throw new Error("Archive database is unavailable.");
  return archiveEnv;
}

export async function ensureArchiveSchema(db: D1Database) {
  const createTable = db.prepare(`
    CREATE TABLE IF NOT EXISTS experiences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT 'Anonymous',
      location TEXT NOT NULL DEFAULT 'Location withheld',
      experience_year TEXT NOT NULL DEFAULT '',
      experience_type TEXT NOT NULL DEFAULT 'Other',
      transcript TEXT NOT NULL DEFAULT '',
      privacy TEXT NOT NULL DEFAULT 'archive',
      recording_mode TEXT NOT NULL DEFAULT 'text',
      media_key TEXT,
      media_type TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const privacyIndex = db.prepare("CREATE INDEX IF NOT EXISTS experiences_privacy_idx ON experiences (privacy)");
  const dateIndex = db.prepare("CREATE INDEX IF NOT EXISTS experiences_created_at_idx ON experiences (created_at DESC)");
  await db.batch([createTable, privacyIndex, dateIndex]);
}
