import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "../../lib/auth";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Media key is required" }, { status: 400 });
  }

  if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID) {
    return NextResponse.json({ error: "R2 is not configured" }, { status: 503 });
  }

  try {
    const client = getR2Client();
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    // Generate a secure URL that expires in 1 hour
    const url = await getSignedUrl(client, command, { expiresIn: 3600 });
    
    // Redirect the browser straight to the secure video URL
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Failed to generate view URL:", error);
    return NextResponse.json({ error: "Failed to load media" }, { status: 500 });
  }
}
