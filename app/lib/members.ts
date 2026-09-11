import { createHash, randomBytes } from "node:crypto";
import { ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client, BUCKET, phys, r2Configured } from "./r2";
import { safeEqual } from "./auth";

/**
 * Approved members of the archive, stored at members/{id}.json in R2.
 *
 * Each member gets one access code, which is what they type into the gate.
 * Only a hash of it is stored — a moderator who loses a code regenerates it
 * rather than looking it up, so the bucket never holds anything that would let
 * someone in.
 */

export interface Member {
  id: string;
  name: string;
  email?: string;
  note?: string;
  codeHash: string;
  createdAt: string;
  disabledAt?: string | null;
  lastSeenAt?: string | null;
}

/** What the dashboard is allowed to see: everything except the hash. */
export type PublicMember = Omit<Member, "codeHash">;

const strip = (m: Member): PublicMember => {
  const { codeHash, ...rest } = m;
  void codeHash;
  return rest;
};

const keyFor = (id: string) => `members/${id}.json`;

// Unambiguous alphabet: no O/0, I/1, so a code can be read down a phone line.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `HC-${out.slice(0, 4)}-${out.slice(4)}`;
}

export const normalizeCode = (code: string) =>
  String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

export const hashCode = (code: string) =>
  createHash("sha256").update("hc-member-v1:" + normalizeCode(code)).digest("hex");

async function readMember(objectKey: string): Promise<Member | null> {
  const client = getR2Client();
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: objectKey }));
    const body = await res.Body?.transformToString();
    return body ? (JSON.parse(body) as Member) : null;
  } catch {
    return null;
  }
}

export async function listMembers(): Promise<Member[]> {
  if (!r2Configured()) return [];
  const client = getR2Client();
  const res = await client.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: phys("members/"),
  }));
  const files = (res.Contents || []).filter((o) => o.Key?.endsWith(".json"));
  const members = await Promise.all(files.map((o) => readMember(o.Key!)));
  return members
    .filter((m): m is Member => Boolean(m && m.id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const listMembersPublic = async (): Promise<PublicMember[]> =>
  (await listMembers()).map(strip);

export async function createMember(input: { name: string; email?: string; note?: string }) {
  const code = generateCode();
  const member: Member = {
    id: `mem_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`,
    name: String(input.name).trim(),
    email: input.email ? String(input.email).trim() : undefined,
    note: input.note ? String(input.note).trim() : undefined,
    codeHash: hashCode(code),
    createdAt: new Date().toISOString(),
    disabledAt: null,
    lastSeenAt: null,
  };
  await save(member);
  // the only time the plaintext code exists — shown once to the moderator
  return { member: strip(member), code };
}

async function save(member: Member) {
  const client = getR2Client();
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: phys(keyFor(member.id)),
    Body: JSON.stringify(member, null, 2),
    ContentType: "application/json",
  }));
}

export async function updateMember(id: string, changes: Partial<Pick<Member, "name" | "email" | "note" | "disabledAt">>) {
  const existing = await readMember(phys(keyFor(id)));
  if (!existing) return null;
  const next: Member = { ...existing, ...changes };
  await save(next);
  return strip(next);
}

export async function regenerateCode(id: string) {
  const existing = await readMember(phys(keyFor(id)));
  if (!existing) return null;
  const code = generateCode();
  const next: Member = { ...existing, codeHash: hashCode(code) };
  await save(next);
  return { member: strip(next), code };
}

export async function deleteMember(id: string) {
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: phys(keyFor(id)) }));
}

/** Resolve an access code typed into the gate. Disabled members are refused. */
export async function memberForCode(code: string): Promise<Member | null> {
  if (!r2Configured()) return null;
  const normalized = normalizeCode(code);
  if (normalized.length < 6) return null;
  const target = hashCode(normalized);
  const members = await listMembers();
  for (const m of members) {
    if (m.disabledAt) continue;
    if (safeEqual(m.codeHash, target)) return m;
  }
  return null;
}

export async function touchLastSeen(member: Member) {
  try {
    await save({ ...member, lastSeenAt: new Date().toISOString() });
  } catch {
    // a failed timestamp write must never block a sign-in
  }
}
