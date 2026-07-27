import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

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
  if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID) {
    return NextResponse.json({ error: "R2 is not configured" }, { status: 503 });
  }

  try {
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json({ error: "Media key is required" }, { status: 400 });
    }

    const client = getR2Client();

    // Delete the object entirely from R2
    await client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete media:", error);
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 });
  }
}
