import { NextRequest, NextResponse } from "next/server";
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
  if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID) {
    return NextResponse.json({ experiences: [] });
  }

  const client = getR2Client();

  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: "approved/submissions/",
    });

    const listResponse = await client.send(listCommand);
    const objects = listResponse.Contents || [];

    // Filter to only get .json metadata files
    const jsonObjects = objects.filter(obj => obj.Key?.endsWith('.json'));

    const submissions = await Promise.all(
      jsonObjects.map(async (obj) => {
        const getCmd = new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: obj.Key,
        });
        
        try {
          const response = await client.send(getCmd);
          const bodyStr = await response.Body?.transformToString();
          const data = bodyStr ? JSON.parse(bodyStr) : {};
          
          let mediaUrl = null;
          let photoUrl = null;

          if (data.mediaKey) {
            const mediaCmd = new GetObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: data.mediaKey,
            });
            mediaUrl = await getSignedUrl(client, mediaCmd, { expiresIn: 3600 });
          }

          if (data.photoKey) {
            const photoCmd = new GetObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME,
              Key: data.photoKey,
            });
            photoUrl = await getSignedUrl(client, photoCmd, { expiresIn: 3600 });
          }

          return {
            ...data,
            mediaUrl,
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

    return NextResponse.json({ experiences: validSubmissions });
  } catch (error) {
    console.error("Failed to list approved experiences:", error);
    return NextResponse.json({ experiences: [] });
  }
}

export async function POST() {
  return Response.json({ error: "Submissions are handled by the private moderation queue." }, { status: 405 });
}
