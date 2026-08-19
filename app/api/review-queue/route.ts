import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "../../lib/auth";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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

export async function GET(request: NextRequest) {
  if (!isAuthed(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID) {
    return NextResponse.json({ error: "R2 is not configured" }, { status: 503 });
  }

  const client = getR2Client();

  try {
    // pending submissions plus published ones, so the dashboard can edit both
    const prefixes = ["submissions/", "approved/submissions/"];
    const objects: { Key?: string; LastModified?: Date }[] = [];
    for (const prefix of prefixes) {
      const listResponse = await client.send(new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
        Prefix: prefix,
      }));
      objects.push(...(listResponse.Contents || []));
    }

    // Filter to only get .json metadata files
    const jsonObjects = objects.filter(obj => obj.Key?.endsWith('.json'));

    const submissions = await Promise.all(
      jsonObjects.map(async (obj) => {
        // Read the JSON content
        const getCmd = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: obj.Key,
        });
        
        try {
          const response = await client.send(getCmd);
          const bodyStr = await response.Body?.transformToString();
          const data = bodyStr ? JSON.parse(bodyStr) : {};
          
          let mediaUrl = null;
          let mediaType = null;
          let photoUrl = null;

          // Generate presigned URLs for the associated media keys
          if (data.mediaKey) {
            const mediaCmd = new GetObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: data.mediaKey,
            });
            mediaUrl = await getSignedUrl(client, mediaCmd, { expiresIn: 3600 });
            if (data.mediaKey.includes("image/") || data.mediaKey.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
              mediaType = "image";
            } else if (data.mediaKey.includes("video/") || data.mediaKey.match(/\.(mp4|webm|mov)$/i)) {
              mediaType = "video";
            } else if (data.mediaKey.includes("audio/") || data.mediaKey.match(/\.(mp3|wav|ogg)$/i)) {
              mediaType = "audio";
            } else {
              mediaType = "unknown";
            }
          }

          if (data.photoKey) {
            const photoCmd = new GetObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: data.photoKey,
            });
            photoUrl = await getSignedUrl(client, photoCmd, { expiresIn: 3600 });
          }

          return {
            submissionKey: obj.Key,
            data,
            mediaUrl,
            mediaType,
            photoUrl,
            lastModified: obj.LastModified
          };
        } catch (err) {
          console.error(`Failed to parse submission ${obj.Key}`, err);
          return null;
        }
      })
    );

    // Filter out failed parses and sort by date descending
    const validSubmissions = submissions
      .filter((s): s is NonNullable<typeof s> & { lastModified: Date } => s !== null && s.lastModified != null)
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    return NextResponse.json({ submissions: validSubmissions });
  } catch (error) {
    console.error("Failed to list review queue:", error);
    return NextResponse.json({ error: "Failed to list submissions" }, { status: 500 });
  }
}
