import { NextRequest, NextResponse } from "next/server";
import { isModerator } from "../../lib/auth";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, BUCKET, phys, r2Configured } from "../../lib/r2";
import { formatDisplayName, NAME_DISPLAY_LEVELS } from "../../lib/name";

// Fields the review dashboard may edit; everything else in the stored JSON
// (media keys, ids, timestamps, status) is preserved as-is.
const EDITABLE_FIELDS = [
  "title",
  // The name is kept as parts plus a display level, so how much of it shows
  // can be changed later without asking the contributor again. displayName
  // is re-derived from them below whenever any of the three change.
  "firstName",
  "lastName",
  "nameDisplay",
  "displayName",
  "location",
  "experienceYear",
  "experienceType",
  "transcript",
  "privacy",
  "recordingMode",
  "hashtags",
  // Confirming a machine draft is an edit like any other: the moderator moves
  // the text into `transcript` and marks it confirmed. `machineTranscript`
  // itself stays read-only — it is the record of what the machine actually
  // heard, and overwriting it would destroy the only way to check a disputed
  // transcript later.
  "transcriptStatus",
  "transcriptSource",
] as const;

export async function POST(request: NextRequest) {
  if (!isModerator(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!r2Configured()) {
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
      Bucket: BUCKET,
      Key: phys(submissionKey),
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
    if (data.nameDisplay && !NAME_DISPLAY_LEVELS.includes(data.nameDisplay)) data.nameDisplay = "full";
    const nameTouched = ["firstName", "lastName", "nameDisplay"].some((f) => f in updates);
    if (nameTouched && (data.firstName || data.lastName)) {
      data.displayName = formatDisplayName(data.firstName, data.lastName, data.nameDisplay);
    }
    data.editedAt = new Date().toISOString();

    await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: phys(submissionKey),
      Body: JSON.stringify(data, null, 2),
      ContentType: "application/json",
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to update experience:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
