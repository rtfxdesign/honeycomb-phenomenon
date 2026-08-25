import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "../../lib/auth";
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, BUCKET, phys, r2Configured } from "../../lib/r2";

export async function POST(request: NextRequest) {
  if (!isAuthed(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!r2Configured()) {
    return NextResponse.json({ error: "R2 is not configured" }, { status: 503 });
  }
  try {
    const { submissionKey } = await request.json();

    if (!submissionKey || !submissionKey.startsWith("submissions/")) {
      return NextResponse.json({ error: "Invalid submission key" }, { status: 400 });
    }

    const client = getR2Client();

    // 1. Fetch the JSON submission
    const getCmd = new GetObjectCommand({
      Bucket: BUCKET,
      Key: phys(submissionKey),
    });
    const response = await client.send(getCmd);
    const bodyStr = await response.Body?.transformToString();
    if (!bodyStr) throw new Error("Empty submission file");

    const data = JSON.parse(bodyStr);

    // Helper to move a media file to approved
    const moveMediaToApproved = async (oldKey: string) => {
      // oldKey might be "image/xyz.png"
      const parts = oldKey.split("/");
      const filename = parts.pop();
      const folder = parts.join("/"); // "image", "video", or "audio"

      const newKey = `approved/${folder}/${filename}`;

      await client.send(new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${phys(oldKey)}`,
        Key: phys(newKey),
      }));

      await client.send(new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: phys(oldKey),
      }));

      return newKey;
    };

    // 2. Move associated media files
    if (data.mediaKey && !data.mediaKey.startsWith("approved/")) {
      data.mediaKey = await moveMediaToApproved(data.mediaKey);
    }
    if (data.photoKey && !data.photoKey.startsWith("approved/")) {
      data.photoKey = await moveMediaToApproved(data.photoKey);
    }

    // 3. Update the JSON status and save it to approved/submissions/
    data.status = "approved";
    data.approvedAt = new Date().toISOString();

    const filename = submissionKey.split("/").pop();
    const newSubmissionKey = `approved/submissions/${filename}`;

    await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: phys(newSubmissionKey),
      Body: JSON.stringify(data, null, 2),
      ContentType: "application/json",
    }));

    // 4. Delete the old JSON submission
    await client.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: phys(submissionKey),
    }));

    return NextResponse.json({ success: true, newSubmissionKey });
  } catch (error) {
    console.error("Failed to approve submission:", error);
    return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
  }
}
