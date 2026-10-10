import { NextRequest, NextResponse } from "next/server";
import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, BUCKET, phys, r2Configured } from "../../lib/r2";
import { formatDisplayName, NAME_DISPLAY_LEVELS } from "../../lib/name";
import { generateSubmissionId } from "../../lib/submission-id";

const PRIVACY_LEVELS = ["public", "community", "archive"];
const RECORDING_MODES = ["video", "audio", "text"];
// Logical media keys the recorder can legitimately hand back: the folders
// /api/get-upload-url writes to, nothing else.
const MEDIA_KEY_RE = /^(video|audio|image|text|misc)\/[A-Za-z0-9._-]+$/;

const str = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const mediaKey = (v: unknown) => (typeof v === "string" && MEDIA_KEY_RE.test(v) ? v : undefined);

export async function POST(request: NextRequest) {
  if (!r2Configured()) {
    return NextResponse.json({ error: "R2 is not configured" }, { status: 503 });
  }

  try {
    const data = await request.json();

    // A recording is itself an account. Requiring typed text alongside it made
    // people transcribe themselves before they could submit, which is exactly
    // the work machine transcription exists to remove — so a submission needs
    // a title and then either words or a recording.
    const title = str(data.title, 200);
    const transcript = str(data.transcript, 100_000);
    const hasWords = transcript.length > 0;
    const media = mediaKey(data.mediaKey);
    const audio = mediaKey(data.audioKey);
    const hasRecording = Boolean(media || audio);

    if (!title || (!hasWords && !hasRecording)) {
      return NextResponse.json(
        { error: "A title and either a transcript or a recording are required" },
        { status: 400 }
      );
    }
    if (data.consent !== true) {
      return NextResponse.json(
        { error: "Please confirm the account is yours to share before submitting" },
        { status: 400 }
      );
    }

    const firstName = str(data.firstName, 80);
    const lastName = str(data.lastName, 80);
    const nameDisplay = NAME_DISPLAY_LEVELS.includes(data.nameDisplay) ? data.nameDisplay : "full";
    const privacy = PRIVACY_LEVELS.includes(data.privacy) ? data.privacy : "public";
    const recordingMode = RECORDING_MODES.includes(data.recordingMode) ? data.recordingMode : "text";
    const hashtags = Array.isArray(data.hashtags)
      ? data.hashtags.map((t: unknown) => str(t, 40).replace(/^#/, "")).filter(Boolean).slice(0, 30)
      : [];

    const client = getR2Client();

    // The ID is the storage key, so it must be unused. Four characters from a
    // 32-letter alphabet leaves about a million per day; a clash is unlikely
    // but would overwrite someone's record, so check before writing.
    let submissionId = generateSubmissionId();
    let key = `submissions/${submissionId}.json`;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: phys(key) }));
        submissionId = generateSubmissionId();
        key = `submissions/${submissionId}.json`;
      } catch {
        break; // not found: the key is free
      }
    }

    const now = new Date().toISOString();

    // Everything stored is listed here. Nothing about the request itself — no
    // address, no user agent, no headers — is written into the record, so what
    // the archive keeps about a submission is exactly what /privacy says.
    const payload = {
      id: submissionId,
      title,
      firstName,
      lastName,
      nameDisplay,
      displayName: formatDisplayName(firstName, lastName, nameDisplay),
      location: str(data.location, 120),
      experienceYear: str(data.experienceYear, 12),
      experienceType: str(data.experienceType, 40) || "Other",
      transcript,
      privacy,
      recordingMode,
      mediaKey: media,
      audioKey: audio,
      photoKey: mediaKey(data.photoKey),
      hashtags,
      consentAt: now,
      // optional: willing to have the story or photo used in Honeycomb's advertising
      adsOk: data.adsOk === true,
      submittedAt: now,
      status: "pending",
      // Where the words came from, and whether a machine still owes us any.
      // The review queue uses this to show which submissions are waiting on a
      // transcript rather than on a decision.
      transcriptSource: hasWords ? (str(data.transcriptSource, 20) || "typed") : undefined,
      transcriptStatus: hasWords ? "confirmed" : hasRecording ? "awaiting" : "none",
    };

    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: phys(key),
        Body: JSON.stringify(payload, null, 2),
        ContentType: "application/json",
      })
    );

    return NextResponse.json({ success: true, id: submissionId });
  } catch (error) {
    console.error("Failed to submit experience:", error);
    return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
  }
}
