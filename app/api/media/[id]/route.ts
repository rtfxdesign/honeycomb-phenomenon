import { ensureArchiveSchema, getArchiveEnv } from "../../../../db/archive";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) return new Response("Not found", { status: 404 });
    const { DB, ARCHIVE_MEDIA } = getArchiveEnv();
    await ensureArchiveSchema(DB);
    const row = await DB.prepare("SELECT media_key AS mediaKey, media_type AS mediaType FROM experiences WHERE id = ? AND privacy = 'public'").bind(numericId).first<{ mediaKey: string | null; mediaType: string | null }>();
    if (!row?.mediaKey) return new Response("Not found", { status: 404 });
    const object = await ARCHIVE_MEDIA.get(row.mediaKey);
    if (!object) return new Response("Not found", { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("content-type", row.mediaType || headers.get("content-type") || "application/octet-stream");
    headers.set("cache-control", "private, max-age=3600");
    headers.set("etag", object.httpEtag);
    return new Response(object.body, { headers });
  } catch {
    return new Response("Unable to load media", { status: 500 });
  }
}
