import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import arcjet, { shield, detectBot, fixedWindow } from "@arcjet/next";

/**
 * Generates a presigned URL for direct-to-R2 video uploads.
 *
 * The frontend uploads large media files directly to Cloudflare R2,
 * bypassing Netlify's 8 MB form payload limit entirely.
 *
 * Required env vars: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET_NAME, ARCJET_KEY
 */

const aj = arcjet({
  key: process.env.ARCJET_KEY || "", // Use dummy key if not set yet so build doesn't fail
  rules: [
    shield({ mode: "LIVE" }),           // WAF protection
    detectBot({ mode: "LIVE", allow: [] }), // Block bots
    fixedWindow({                        // Rate limit: 10 uploads per hour
      mode: "LIVE",
      window: "1h",
      max: 10,
    }),
  ],
});

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function POST(request: NextRequest) {
  // Arcjet protection
  if (process.env.ARCJET_KEY) {
    const decision = await aj.protect(request);
    if (decision.isDenied()) {
      return NextResponse.json({ error: "Request blocked by security policy" }, { status: 403 });
    }
  }

  // Guard: if R2 isn't configured, return a clear error
  if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID) {
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

    // Sanitize filename and create a unique key
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `uploads/${Date.now()}-${sanitized}`;

    const client = getR2Client();
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    // Generate a URL that expires in 30 minutes (plenty for large uploads)
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 1800 });

    return NextResponse.json({ uploadUrl, key });
  } catch (error) {
    console.error("Failed to generate upload URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
