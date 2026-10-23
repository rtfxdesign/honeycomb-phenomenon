import type { AuditEvent } from "./audit";

/**
 * Two moderators sign a story before it publishes; a reviewer can ask for a
 * third. "Approved" is not a status anybody sets — it is what happens when
 * the signatures reach the number needed.
 *
 * A signature is a moderator's own code (id + name). The shared moderator
 * password can sign too, but only once per story, because two signatures
 * from a password nobody can tell apart are one signature.
 *
 * NEXT_PUBLIC_SIGNATURES_NEEDED lowers the bar on a preview site so a single
 * person can exercise the whole flow; production leaves it at two. It is
 * public so the dashboard can say "1 of 2" without asking the server.
 */
export interface Approval {
  /** member id, or "shared" for the shared moderator password */
  id: string;
  name: string;
  at: string;
}

export const SIGNATURES_NEEDED = Math.max(1, Number(process.env.NEXT_PUBLIC_SIGNATURES_NEEDED || 2));

export const signerId = (by: AuditEvent["by"]) => ("id" in by ? by.id : "shared");
export const signerName = (by: AuditEvent["by"]) => ("id" in by ? by.name : "Moderator (shared password)");

export const signaturesNeeded = (record: { requiresThird?: boolean }) =>
  record.requiresThird ? SIGNATURES_NEEDED + 1 : SIGNATURES_NEEDED;

export const hasEnough = (record: { approvals?: Approval[]; requiresThird?: boolean }) =>
  (record.approvals?.length ?? 0) >= signaturesNeeded(record);
