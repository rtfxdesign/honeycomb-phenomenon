import { NextRequest, NextResponse } from "next/server";
import { ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { isModerator } from "../../lib/auth";
import { getR2Client, BUCKET, phys, r2Configured } from "../../lib/r2";
import { PEOPLE } from "../../data/people";

export const dynamic = "force-dynamic";

interface PersonRecord {
  key: string;
  name: string;
  about: string[];
  video: string | null;
}

const staticPeople: PersonRecord[] = PEOPLE.map((p: PersonRecord) => ({
  key: p.key,
  name: p.name,
  about: p.about,
  video: p.video || null,
}));

const validKeys = new Set(staticPeople.map((p) => p.key));

// The community faces ship with defaults in app/data/people.js; edits from the
// review dashboard are stored as overrides at people/{key}.json in R2 and win
// over the defaults field-by-field.
export async function GET() {
  if (!r2Configured()) {
    return NextResponse.json({ people: staticPeople });
  }

  const client = getR2Client();
  try {
    const listResponse = await client.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: phys("people/"),
    }));
    const overrides = new Map<string, Partial<PersonRecord>>();
    await Promise.all(
      (listResponse.Contents || [])
        .filter((obj) => obj.Key?.endsWith(".json"))
        .map(async (obj) => {
          try {
            const response = await client.send(new GetObjectCommand({
              Bucket: BUCKET,
              Key: obj.Key,
            }));
            const bodyStr = await response.Body?.transformToString();
            if (!bodyStr) return;
            const data = JSON.parse(bodyStr);
            if (data.key && validKeys.has(data.key)) overrides.set(data.key, data);
          } catch (err) {
            console.error(`Failed to parse person override ${obj.Key}`, err);
          }
        })
    );
    const people = staticPeople.map((p) => {
      const o = overrides.get(p.key);
      if (!o) return p;
      return {
        key: p.key,
        name: typeof o.name === "string" && o.name.trim() ? o.name : p.name,
        about: Array.isArray(o.about) && o.about.length ? o.about.map(String) : p.about,
        video: typeof o.video === "string" && o.video.trim() ? o.video : (o.video === null ? null : p.video),
      };
    });
    return NextResponse.json({ people });
  } catch (error) {
    console.error("Failed to list people overrides:", error);
    return NextResponse.json({ people: staticPeople });
  }
}

export async function POST(request: NextRequest) {
  if (!isModerator(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!r2Configured()) {
    return NextResponse.json({ error: "R2 is not configured" }, { status: 503 });
  }

  try {
    const { key, name, about, video } = await request.json();

    if (!key || !validKeys.has(key)) {
      return NextResponse.json({ error: "Unknown person key" }, { status: 400 });
    }

    const record = {
      key,
      name: String(name ?? "").trim(),
      about: Array.isArray(about) ? about.map((p: unknown) => String(p).trim()).filter(Boolean) : [],
      video: typeof video === "string" && video.trim() ? video.trim() : null,
      editedAt: new Date().toISOString(),
    };

    const client = getR2Client();
    await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: phys(`people/${key}.json`),
      Body: JSON.stringify(record, null, 2),
      ContentType: "application/json",
    }));

    return NextResponse.json({ success: true, person: record });
  } catch (error) {
    console.error("Failed to update person:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
