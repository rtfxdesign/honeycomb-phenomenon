import { NextRequest, NextResponse } from "next/server";
import { isModerator } from "../../lib/auth";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, BUCKET, phys, r2Configured } from "../../lib/r2";

export async function POST(request: NextRequest) {
  if (!isModerator(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!r2Configured()) {
    return NextResponse.json({ error: "R2 is not configured" }, { status: 503 });
  }
  try {
    const { submissionKey } = await request.json();

    if (!submissionKey || !(submissionKey.startsWith("submissions/") || submissionKey.startsWith("approved/submissions/"))) {
      return NextResponse.json({ error: "Invalid submission key" }, { status: 400 });
    }

    const client = getR2Client();

    // 1. Fetch the JSON submission to find its media keys
    const getCmd = new GetObjectCommand({
      Bucket: BUCKET,
      Key: phys(submissionKey),
    });

    try {
      const response = await client.send(getCmd);
      const bodyStr = await response.Body?.transformToString();
      if (bodyStr) {
        const data = JSON.parse(bodyStr);

        // 2. Delete every object the record points at. "Removed" has to mean
        // the recording, its audio track and the photo, not just the JSON —
        // the audio track was previously left behind.
        const keys = new Set([data.mediaKey, data.audioKey, data.photoKey].filter(Boolean));
        for (const k of keys) {
          await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: phys(k) }));
        }
      }
    } catch (err) {
      console.warn("Could not fetch submission for media deletion, attempting to delete JSON anyway.", err);
    }

    // 3. Delete the JSON submission itself
    await client.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: phys(submissionKey),
    }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete submission:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
