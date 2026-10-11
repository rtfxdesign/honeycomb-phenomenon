// The one address a contributor writes to about their own record. It appears
// in the recorder, on the confirmation screen and on /privacy — keep it here
// so a change of mailbox is a one-line edit.
export const REMOVAL_EMAIL = "contact@projecthoneycomb.site";
export const PRIVACY_PATH = "/privacy";
export const TERMS_PATH = "/terms";
export const ACCESSIBILITY_PATH = "/accessibility";

// Which wording a contributor agreed to. Both are stamped onto the record by
// the server at submit time, so a record can always be matched to the exact
// text that was on screen. Bump POLICY_VERSION when /privacy changes in a way
// that affects what is kept or who sees it (it mirrors REVIEWED on that page);
// bump CONSENT_VERSION when the checkbox text in the recorder changes.
export const POLICY_VERSION = "2026-09-18";
export const CONSENT_VERSION = "2026-10-11";
