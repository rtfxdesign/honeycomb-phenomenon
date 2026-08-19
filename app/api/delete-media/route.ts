import { NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

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
  try {
    const { submissionKey } = await request.json();

    if (!submissionKey || !(submissionKey.startsWith("submissions/") || submissionKey.startsWith("approved/submissions/"))) {
      return NextResponse.json({ error: "Invalid submission key" }, { status: 400 });
    }

    const client = getR2Client();

    // 1. Fetch the JSON submission to find its media keys
    const getCmd = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: submissionKey,
    });
    
    try {
      const response = await client.send(getCmd);
      const bodyStr = await response.Body?.transformToString();
      if (bodyStr) {
        const data = JSON.parse(bodyStr);
        
        // 2. Delete associated media files
        if (data.mediaKey) {
          await client.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: data.mediaKey,
          }));
        }
        if (data.photoKey) {
          await client.send(new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: data.photoKey,
          }));
        }
      }
    } catch (err) {
      console.warn("Could not fetch submission for media deletion, attempting to delete JSON anyway.", err);
    }

    // 3. Delete the JSON submission itself
    await client.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: submissionKey,
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete submission:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
