// The submission ID a contributor is shown once and can quote to have their
// record removed: HC-7K3MQ2. Six characters from an alphabet with no 0/O/1/I
// — about a billion combinations, short enough to read out over the phone.
// It is also the storage key of the record.
//
// Until October 2026 the ID carried the date as well (HC-2026-09-18-7K3M).
// Those records keep their IDs, and anything that reads an ID accepts both.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TAIL_LONG = /^HC-\d{4}-\d{2}-\d{2}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;
const TAIL_SHORT = /^HC-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
export const SUBMISSION_ID_RE = /^HC-(?:\d{4}-\d{2}-\d{2}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}|[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6})$/;

function randomBytes(n) {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
}

export function generateSubmissionId() {
  const tail = Array.from(randomBytes(6), (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `HC-${tail}`;
}

/** Accepts what a person might type: lower case, spaces, a missing "HC-". */
export function normaliseSubmissionId(input) {
  const s = String(input ?? "").trim().toUpperCase().replace(/\s+/g, "");
  const withPrefix = `HC-${s.replace(/^HC-?/, "")}`;
  return TAIL_LONG.test(withPrefix) || TAIL_SHORT.test(withPrefix) ? withPrefix : null;
}
