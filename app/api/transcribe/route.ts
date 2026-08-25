import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, BUCKET, phys, r2Configured } from "../../lib/r2";
import { isModerator } from "../../lib/auth";
import {
  transcribeAudio,
  transcriptionConfigured,
  mediaKeyForTranscription,
  explainFailure,
} from "../../lib/transcribe";

/**
 * Machine-transcribe one submission's recording.
 *
 * Moderator-only, and deliberately explicit rather than automatic-on-submit:
 * a transcription can take longer than a serverless request is allowed to
 * live, so the person triggering it is someone who can see it fail and try
 * again, rather than a member of the public who would just see their
 * submission hang.
 *
 * The result is never published on its own. It lands in `machineTranscript`
 * with `transcriptStatus: "ready"`, and the moderator confirms or edits it
 * into `transcript` from the dashboard. A garbled name in somebody's account
 * of their own experience is not a cosmetic problem.
 */
export async function POST(request: NextRequest) {
  if (!isModerator(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!r2Configured()) {
    return NextResponse.json({ error: "R2 is not configured" }, { status: 503 });
  }
  if (!transcriptionConfigured()) {
    return NextResponse.json(
      { error: explainFailure("not-configured") },
      { status: 503 }
    );
  }

  try {
    const { submissionKey } = await request.json();

    if (
      !submissionKey ||
      !(submissionKey.startsWith("submissions/") ||
        submissionKey.startsWith("approved/submissions/"))
    ) {
      return NextResponse.json({ error: "Invalid submission key" }, { status: 400 });
    }

    const client = getR2Client();

    const existing = await client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: phys(submissionKey) })
    );
    const raw = await existing.Body?.transformToString();
    if (!raw) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    const record = JSON.parse(raw);

    const { key: audioKey, why } = mediaKeyForTranscription(record);
    if (!audioKey) {
      return NextResponse.json({ error: why }, { status: 422 });
    }

    const media = await client.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: phys(audioKey) })
    );
    const bytes = await media.Body?.transformToByteArray();
    if (!bytes) {
      return NextResponse.json({ error: "Could not read the recording" }, { status: 422 });
    }

    const result = await transcribeAudio(bytes, {
      contentType: media.ContentType || "application/octet-stream",
    });

    if (!result.ok) {
      // Record the failure on the submission so the dashboard can show why
      // without the moderator having to retry to find out.
      const failed = {
        ...record,
        transcriptStatus: "failed",
        transcriptError: explainFailure(result.reason, result.detail),
        transcriptAttemptedAt: new Date().toISOString(),
      };
      await client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: phys(submissionKey),
          Body: JSON.stringify(failed, null, 2),
          ContentType: "application/json",
        })
      );
      return NextResponse.json(
        { error: explainFailure(result.reason, result.detail) },
        { status: result.reason === "too-large" ? 413 : 502 }
      );
    }

    const updated = {
      ...record,
      // The machine output is kept separate from `transcript` so a moderator's
      // corrections never overwrite the original, and so the two can be
      // compared later if a transcript is ever disputed.
      machineTranscript: result.text,
      transcriptStatus: "ready",
      transcriptSource: "machine",
      transcriptModel: result.model,
      transcribedAt: new Date().toISOString(),
      transcriptError: undefined,
    };

    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: phys(submissionKey),
        Body: JSON.stringify(updated, null, 2),
        ContentType: "application/json",
      })
    );

    return NextResponse.json({
      success: true,
      machineTranscript: result.text,
      wordCount: result.wordCount,
      model: result.model,
    });
  } catch (error) {
    console.error("Transcription failed:", error);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
