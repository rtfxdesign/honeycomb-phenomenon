// The submission ID a contributor is shown once and can quote to have their
// record removed: HC-2026-09-18-7K3M. Date first so the archive can find it
// by hand, then four characters from an alphabet with no 0/O/1/I, short
// enough to type from a phone. It is also the storage key of the record.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const SUBMISSION_ID_RE = /^HC-\d{4}-\d{2}-\d{2}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;

function randomBytes(n) {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
}

export function generateSubmissionId(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const tail = Array.from(randomBytes(4), (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `HC-${y}-${m}-${d}-${tail}`;
}

/** Accepts what a person might type: lower case, spaces, a missing "HC-". */
export function normaliseSubmissionId(input) {
  const s = String(input ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const withPrefix = `HC-${s.replace(/^HC-?/, "")}`;
  return SUBMISSION_ID_RE.test(withPrefix) ? withPrefix : null;
}
