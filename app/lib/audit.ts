import { randomBytes } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest } from "next/server";
import { getR2Client, BUCKET, phys, r2Configured } from "./r2";
import { getSession } from "./auth";

/**
 * Append-only record of every moderation decision: who did what to which
 * record, when. One object per event under audit/YYYY/MM/, which nothing on
 * the site deletes — a removal request deletes the story, not the fact that
 * it was approved on a date by a person.
 *
 * "Who" is the moderator's own code (id + name) when they signed in with one,
 * or the shared moderator password when they did not; the log is only as
 * good as the sign-in, which is the argument for giving each moderator a code.
 *
 * Best-effort by design: a failed audit write is logged to the console and
 * never blocks the action it describes. The action must still happen; the
 * missing line is then visible as a gap in the series.
 */
export type AuditAction =
  | "approve" | "sign" | "unsign" | "require-third" | "decline" | "delete" | "update" | "photo"
  | "member.create" | "member.update" | "member.regenerate" | "member.delete";

export interface AuditEvent {
  at: string;
  action: AuditAction;
  by: { id: string; name: string } | { shared: true };
  /** submission key or member id the action applied to */
  target: string;
  /** small, non-sensitive detail: which fields changed, where a record moved */
  detail?: Record<string, unknown>;
}

export function actor(request: NextRequest): AuditEvent["by"] {
  const s = getSession(request);
  return s?.id ? { id: s.id, name: s.name || s.id } : { shared: true };
}

export async function recordAudit(request: NextRequest, action: AuditAction, target: string, detail?: Record<string, unknown>) {
  if (!r2Configured()) return;
  const at = new Date().toISOString();
  const event: AuditEvent = { at, action, by: actor(request), target, detail };
  const key = `audit/${at.slice(0, 4)}/${at.slice(5, 7)}/${at.replace(/[:.]/g, "-")}-${randomBytes(3).toString("hex")}.json`;
  try {
    await getR2Client().send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: phys(key),
      Body: JSON.stringify(event, null, 2),
      ContentType: "application/json",
    }));
  } catch (error) {
    console.error("Audit write failed:", action, target, error);
  }
}
