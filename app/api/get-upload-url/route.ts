import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, BUCKET, phys, r2Configured } from "../../lib/r2";

/**
 * Generates a presigned URL for direct-to-R2 video uploads.
 *
 * The frontend uploads large media files directly to Cloudflare R2,
 * bypassing Netlify's 8 MB form payload limit entirely.
 *
 * Required env vars: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET_NAME
 */
export async function POST(request: NextRequest) {
  // Guard: if R2 isn't configured, return a clear error
  if (!r2Configured()) {
    return NextResponse.json(
      { error: "Media uploads are not yet configured. Submissions without media still work via the standard form." },
      { status: 503 }
    );
  }

  try {
    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "filename and contentType are required" },
        { status: 400 }
      );
    }

    // Determine folder based on content type
    let folder = "misc";
    if (contentType.startsWith("video/")) folder = "video";
    else if (contentType.startsWith("audio/")) folder = "audio";
    else if (contentType.startsWith("text/")) folder = "text";
    else if (contentType.startsWith("image/")) folder = "image";

    // Sanitize filename and create a unique key
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `${folder}/${Date.now()}-${sanitized}`;

    const client = getR2Client();
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: phys(key),
      ContentType: contentType,
    });

    // Generate a URL that expires in 30 minutes (plenty for large uploads)
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 1800 });

    // The caller stores the logical key; the prefix stays server-side.
    return NextResponse.json({ uploadUrl, key });
  } catch (error) {
    console.error("Failed to generate upload URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
