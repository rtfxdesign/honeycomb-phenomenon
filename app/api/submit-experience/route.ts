import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, BUCKET, phys, r2Configured } from "../../lib/r2";

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
    const hasWords = typeof data.transcript === "string" && data.transcript.trim().length > 0;
    const hasRecording = Boolean(data.mediaKey || data.audioKey);

    if (!data.title || (!hasWords && !hasRecording)) {
      return NextResponse.json(
        { error: "A title and either a transcript or a recording are required" },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const submissionId = `sub_${timestamp}`;
    const key = `submissions/${submissionId}.json`;

    // Add server-side metadata
    const payload = {
      ...data,
      id: submissionId,
      submittedAt: new Date().toISOString(),
      status: "pending",
      // Where the words came from, and whether a machine still owes us any.
      // The review queue uses this to show which submissions are waiting on a
      // transcript rather than on a decision.
      transcriptSource: hasWords ? (data.transcriptSource || "typed") : undefined,
      transcriptStatus: hasWords ? "confirmed" : hasRecording ? "awaiting" : "none",
    };

    const client = getR2Client();

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
