import { ensureArchiveSchema, getArchiveEnv } from "../../../db/archive";

const allowedPrivacy = new Set(["public", "community", "archive"]);
const allowedModes = new Set(["video", "audio", "text"]);

function clean(value: FormDataEntryValue | null, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function GET(request: Request) {
  try {
    const { DB } = getArchiveEnv();
    await ensureArchiveSchema(DB);
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 30, 1), 60);
    const query = (url.searchParams.get("q") || "").trim().slice(0, 120);
    const like = `%${query}%`;
    const statement = query
      ? DB.prepare(`
          SELECT id, title, display_name AS displayName, location,
            experience_year AS experienceYear, experience_type AS experienceType,
            transcript, privacy, recording_mode AS recordingMode, media_key AS mediaKey,
            media_type AS mediaType, created_at AS createdAt
          FROM experiences
          WHERE privacy = 'public'
            AND (title LIKE ? OR location LIKE ? OR experience_year LIKE ? OR experience_type LIKE ? OR transcript LIKE ?)
          ORDER BY created_at DESC LIMIT ?
        `).bind(like, like, like, like, like, limit)
      : DB.prepare(`
          SELECT id, title, display_name AS displayName, location,
            experience_year AS experienceYear, experience_type AS experienceType,
            transcript, privacy, recording_mode AS recordingMode, media_key AS mediaKey,
            media_type AS mediaType, created_at AS createdAt
          FROM experiences
          WHERE privacy = 'public'
          ORDER BY created_at DESC LIMIT ?
        `).bind(limit);
    const result = await statement.all();
    return Response.json({ experiences: result.results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to read the archive." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const title = clean(form.get("title"), 160);
    const transcript = clean(form.get("transcript"), 24000);
    const location = clean(form.get("location"), 140) || "Location withheld";
    const experienceYear = clean(form.get("experienceYear"), 12);
    const experienceType = clean(form.get("experienceType"), 40) || "Other";
    const requestedPrivacy = clean(form.get("privacy"), 20);
    const privacy = allowedPrivacy.has(requestedPrivacy) ? requestedPrivacy : "archive";
    const requestedMode = clean(form.get("recordingMode"), 20);
    const recordingMode = allowedModes.has(requestedMode) ? requestedMode : "text";
    const media = form.get("media");

    if (!title || !transcript) return Response.json({ error: "A title and experience are required." }, { status: 400 });
    if (media instanceof File && media.size > 150 * 1024 * 1024) return Response.json({ error: "Please keep recordings under 150 MB." }, { status: 413 });

    const { DB, ARCHIVE_MEDIA } = getArchiveEnv();
    await ensureArchiveSchema(DB);
    let mediaKey: string | null = null;
    let mediaType: string | null = null;

    if (media instanceof File && media.size > 0) {
      if (!ARCHIVE_MEDIA) throw new Error("Archive media storage is unavailable.");
      mediaKey = `experiences/${crypto.randomUUID()}`;
      mediaType = media.type || "application/octet-stream";
      await ARCHIVE_MEDIA.put(mediaKey, await media.arrayBuffer(), {
        httpMetadata: { contentType: mediaType },
        customMetadata: { privacy, recordingMode },
      });
    }

    const result = await DB.prepare(`
      INSERT INTO experiences
        (title, display_name, location, experience_year, experience_type, transcript, privacy, recording_mode, media_key, media_type)
      VALUES (?, 'Anonymous', ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(title, location, experienceYear, experienceType, transcript, privacy, recordingMode, mediaKey, mediaType).run();

    const id = Number(result.meta.last_row_id);
    return Response.json({
      experience: { id, title, displayName: "Anonymous", location, experienceYear, experienceType, transcript, privacy, recordingMode, mediaUrl: mediaKey ? `/api/media/${id}` : null },
    }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to save the experience." }, { status: 500 });
  }
}
