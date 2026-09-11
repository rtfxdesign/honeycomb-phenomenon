import { NextRequest, NextResponse } from "next/server";
import { isModerator } from "../../lib/auth";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getR2Client, BUCKET, phys, toLogical, r2Configured } from "../../lib/r2";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isModerator(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!r2Configured()) {
    return NextResponse.json({ error: "R2 is not configured" }, { status: 503 });
  }

  try {
    const client = getR2Client();
    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: phys(""),
    });

    const response = await client.send(command);

    // Sort by LastModified descending (newest first)
    const files = (response.Contents || [])
      .map((item) => ({
        key: item.Key ? toLogical(item.Key) : item.Key,
        size: item.Size,
        lastModified: item.LastModified,
      }))
      .sort((a, b) => {
        const dateA = a.lastModified ? new Date(a.lastModified).getTime() : 0;
        const dateB = b.lastModified ? new Date(b.lastModified).getTime() : 0;
        return dateB - dateA;
      });

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Failed to list media:", error);
    return NextResponse.json({ error: "Failed to list media" }, { status: 500 });
  }
}
