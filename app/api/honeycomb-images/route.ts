import { NextResponse } from "next/server";
import { ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client, BUCKET, phys, toLogical, r2Configured } from "../../lib/r2";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!r2Configured()) {
    return NextResponse.json({ images: [] });
  }

  try {
    const client = getR2Client();

    // Only fetch images that have been moved to the approved/ folder
    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: phys("approved/image/"),
    });

    const response = await client.send(command);

    if (!response.Contents || response.Contents.length === 0) {
      return NextResponse.json({ images: [] });
    }

    // Sort by newest first and grab up to 10 images
    const recentImages = response.Contents
      .sort((a, b) => {
        const dateA = a.LastModified ? new Date(a.LastModified).getTime() : 0;
        const dateB = b.LastModified ? new Date(b.LastModified).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 10);

    // Generate secure GET URLs for the frontend to render
    const images = await Promise.all(
      recentImages.map(async (item) => {
        if (!item.Key) return null;
        const getCmd = new GetObjectCommand({
          Bucket: BUCKET,
          Key: item.Key,
        });
        // Generate a URL that expires in 1 hour
        const url = await getSignedUrl(client, getCmd, { expiresIn: 3600 });
        return { key: toLogical(item.Key), url };
      })
    );

    return NextResponse.json({ images: images.filter(Boolean) });
  } catch (error) {
    console.error("Failed to fetch honeycomb images:", error);
    return NextResponse.json({ images: [] });
  }
}
