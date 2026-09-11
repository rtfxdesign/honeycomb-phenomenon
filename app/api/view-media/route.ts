import { NextRequest, NextResponse } from "next/server";
import { isModerator } from "../../lib/auth";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, BUCKET, phys, r2Configured } from "../../lib/r2";

export async function GET(request: NextRequest) {
  if (!isModerator(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const searchParams = request.nextUrl.searchParams;
  const key = searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Media key is required" }, { status: 400 });
  }

  if (!r2Configured()) {
    return NextResponse.json({ error: "R2 is not configured" }, { status: 503 });
  }

  try {
    const client = getR2Client();
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: phys(key),
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
