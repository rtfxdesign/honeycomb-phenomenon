import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { isModerator } from "../../lib/auth";
import { getR2Client, BUCKET, phys, r2Configured } from "../../lib/r2";
import { recordAudit } from "../../lib/audit";

/**
 * Set, replace or remove a record's cell photo from the review dashboard.
 *
 * A contributor who sends a video and no photo gets a still as their cell's
 * face; this lets a moderator do better: a frame they chose from the video,
 * or a photo from elsewhere. The image arrives the way a contributor's does
 * (uploaded by the browser to image/… with a presigned URL), is re-encoded
 * here — every hidden tag dropped, longest side 1200px, WebP — and written
 * where the record's other files live (approved/ once the story is live).
 *
 * The photo it replaces is not deleted: its key moves to photoHistory, so a
 * contributor's own photo can be put back by hand, and the delete route
 * removes it with the rest when the story goes.
 */
const UPLOAD_KEY_RE = /^image\/[A-Za-z0-9._-]+$/;
const SUBMISSION_KEY_RE = /^(approved\/)?submissions\/[A-Za-z0-9._-]+\.json$/;

export async function POST(request: NextRequest) {
  if (!isModerator(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!r2Configured()) return NextResponse.json({ error: "R2 is not configured" }, { status: 503 });

  try {
    const { submissionKey, imageKey, source, frameAt, remove } = await request.json();
    if (typeof submissionKey !== "string" || !SUBMISSION_KEY_RE.test(submissionKey)) {
      return NextResponse.json({ error: "Invalid submission key" }, { status: 400 });
    }
    const client = getR2Client();
    const res = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: phys(submissionKey) }));
    const raw = await res.Body?.transformToString();
    if (!raw) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    const data = JSON.parse(raw);
    const history: string[] = Array.isArray(data.photoHistory) ? data.photoHistory : [];

    if (remove === true) {
      if (!data.photoKey) return NextResponse.json({ error: "There is no photo to remove" }, { status: 400 });
      const next = { ...data, photoKey: undefined, photoSource: undefined, photoFrameAt: undefined, photoHistory: [...history, data.photoKey], photoChangedAt: new Date().toISOString() };
      await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: phys(submissionKey), Body: JSON.stringify(next, null, 2), ContentType: "application/json" }));
      await recordAudit(request, "photo", submissionKey, { removed: data.photoKey });
      return NextResponse.json({ success: true, data: next, photoUrl: null });
    }

    if (typeof imageKey !== "string" || !UPLOAD_KEY_RE.test(imageKey)) {
      return NextResponse.json({ error: "Invalid image key" }, { status: 400 });
    }
    if (source !== "frame" && source !== "upload") {
      return NextResponse.json({ error: "source must be frame or upload" }, { status: 400 });
    }

    const src = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: phys(imageKey) }));
    const input = Buffer.from(await src.Body!.transformToByteArray());
    // rotate() applies the EXIF orientation before the tags are dropped, so a
    // phone photo does not turn sideways once its orientation tag is gone
    const out = await sharp(input).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer();
    const approved = submissionKey.startsWith("approved/");
    const photoKey = `${approved ? "approved/" : ""}image/${Date.now()}-${source}.webp`;
    await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: phys(photoKey), Body: out, ContentType: "image/webp" }));
    // the raw upload has served its purpose
    await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: phys(imageKey) })).catch(() => {});

    const next = {
      ...data,
      photoKey,
      photoSource: source === "frame" ? "moderator-frame" : "moderator-upload",
      photoFrameAt: source === "frame" && typeof frameAt === "number" ? frameAt : undefined,
      photoHistory: data.photoKey ? [...history, data.photoKey] : history.length ? history : undefined,
      photoChangedAt: new Date().toISOString(),
    };
    await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: phys(submissionKey), Body: JSON.stringify(next, null, 2), ContentType: "application/json" }));
    await recordAudit(request, "photo", submissionKey, { source, photoKey, replaced: data.photoKey });

    const photoUrl = await getSignedUrl(client, new GetObjectCommand({ Bucket: BUCKET, Key: phys(photoKey) }), { expiresIn: 3600 });
    return NextResponse.json({ success: true, data: next, photoUrl });
  } catch (error) {
    console.error("Failed to set photo:", error);
    return NextResponse.json({ error: "Failed to set the photo" }, { status: 500 });
  }
}
