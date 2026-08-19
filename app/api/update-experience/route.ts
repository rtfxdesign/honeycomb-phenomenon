import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

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

// Fields the review dashboard may edit; everything else in the stored JSON
// (media keys, ids, timestamps, status) is preserved as-is.
const EDITABLE_FIELDS = [
  "title",
  "displayName",
  "location",
  "experienceYear",
  "experienceType",
  "transcript",
  "privacy",
  "recordingMode",
  "hashtags",
] as const;

export async function POST(request: NextRequest) {
  if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID) {
    return NextResponse.json({ error: "R2 is not configured" }, { status: 503 });
  }

  try {
    const { submissionKey, updates } = await request.json();

    if (!submissionKey || !(submissionKey.startsWith("submissions/") || submissionKey.startsWith("approved/submissions/"))) {
      return NextResponse.json({ error: "Invalid submission key" }, { status: 400 });
    }
    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const client = getR2Client();

    const response = await client.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: submissionKey,
    }));
    const bodyStr = await response.Body?.transformToString();
    if (!bodyStr) throw new Error("Empty submission file");
    const data = JSON.parse(bodyStr);

    for (const field of EDITABLE_FIELDS) {
      if (field in updates) {
        if (field === "hashtags") {
          data.hashtags = Array.isArray(updates.hashtags)
            ? updates.hashtags.map((t: unknown) => String(t).trim()).filter(Boolean)
            : [];
        } else {
          data[field] = String(updates[field] ?? "");
        }
      }
    }
    data.editedAt = new Date().toISOString();

    await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: submissionKey,
      Body: JSON.stringify(data, null, 2),
      ContentType: "application/json",
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to update experience:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
