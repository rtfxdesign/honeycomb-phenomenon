import { NextRequest, NextResponse } from "next/server";
import { S3Client, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

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

    if (key.startsWith("approved/")) {
      return NextResponse.json({ error: "Media is already approved" }, { status: 400 });
    }

    const bucketName = process.env.R2_BUCKET_NAME!;
    const newKey = `approved/${key}`;
    const client = getR2Client();

    // 1. Copy the object to the approved/ folder
    await client.send(
      new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: encodeURI(`${bucketName}/${key}`),
        Key: newKey,
      })
    );

    // 2. Delete the original object to keep the inbox clean
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );

    return NextResponse.json({ success: true, newKey });
  } catch (error) {
    console.error("Failed to approve media:", error);
    return NextResponse.json({ error: "Failed to approve media" }, { status: 500 });
  }
}
