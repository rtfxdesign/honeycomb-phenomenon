import { REMOVAL_EMAIL } from "./contact";

/**
 * Outbound email, through Resend. One message so far: the receipt that
 * carries a contributor's submission ID, so they do not have to write it down.
 *
 * Env:
 *   RESEND_API_KEY        when unset nothing is sent and every send reports
 *                         false, so the site works without an email provider
 *   HONEYCOMB_FROM_EMAIL  the sender, on a domain verified in Resend,
 *                         e.g. "Honeycomb <archive@projecthoneycomb.site>"
 *
 * Nothing about the story goes in the email beyond its title: the ID, the
 * title, and how to use the ID. The address is used once and kept where the
 * contact record keeps it (lib/contact), nowhere new.
 */
const SITE = "https://projecthoneycomb.site";

export const mailConfigured = () =>
  Boolean(process.env.RESEND_API_KEY && process.env.HONEYCOMB_FROM_EMAIL);

async function send(to: string, subject: string, text: string): Promise<boolean> {
  if (!mailConfigured()) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: process.env.HONEYCOMB_FROM_EMAIL, to, subject, text }),
  });
  if (!res.ok) {
    console.error("mail: send failed", res.status, await res.text().catch(() => ""));
    return false;
  }
  return true;
}

export function sendSubmissionReceipt(to: string, id: string, title: string): Promise<boolean> {
  const subject = `Your Honeycomb submission ID: ${id}`;
  const text = [
    `Thank you for trusting the archive with your experience${title ? ` — "${title}"` : ""}.`,
    ``,
    `Your submission ID is ${id}.`,
    ``,
    `Keep this. It is the easiest way to have your submission removed: email ${REMOVAL_EMAIL} with the subject line "Remove ${id}" and it will be taken down.`,
    ``,
    `Nothing is published automatically. A moderator reads every submission first.`,
    ``,
    `— The Honeycomb team`,
    SITE,
  ].join("\n");
  return send(to, subject, text);
}
