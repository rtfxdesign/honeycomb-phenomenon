import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
    const data = await request.json();

    if (!data.title || !data.transcript) {
      return NextResponse.json({ error: "Title and transcript are required" }, { status: 400 });
    }

    const timestamp = Date.now();
    const submissionId = `sub_${timestamp}`;
    const key = `submissions/${submissionId}.json`;
    
    // Add server-side metadata
    const payload = {
      ...data,
      id: submissionId,
      submittedAt: new Date().toISOString(),
      status: "pending"
    };

    const client = getR2Client();

    await client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: JSON.stringify(payload, null, 2),
        ContentType: "application/json",
      })
    );

    return NextResponse.json({ success: true, id: submissionId });
  } catch (error) {
    console.error("Failed to submit experience:", error);
    return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
  }
}
