import type { Metadata } from "next";
import Link from "next/link";
import { REMOVAL_EMAIL } from "../lib/contact";
import "./privacy.css";

// The end-to-end data-handling page. Everything the recorder promises links
// here, so it loads for anyone, signed in or not. Plain language first, the
// technical detail in an appendix at the end. Where something is a commitment
// rather than a fact about the running site, it says so — a contributor
// reading this deserves the current state, not the intended one.

export const metadata: Metadata = {
  title: "How we handle your story and files — Honeycomb",
  description: "What Honeycomb collects when you share an experience, where it goes, who can see it, how long it stays, and how to have it removed.",
  robots: { index: false, follow: false },
};

const REVIEWED = "2026-09-18";
const mailto = `mailto:${REMOVAL_EMAIL}`;

export default function PrivacyPage() {
  return (
    <main className="dh">
      <header className="dh-head">
        <Link className="dh-back" href="/">← Honeycomb</Link>
        <p className="dh-eyebrow">Project Honeycomb · Data handling</p>
        <h1>How we handle your story and files</h1>
        <p className="dh-lede">
          This page says, in plain words, what happens to a story from the moment you press <em>Add to the archive</em>:
          what we keep, where it goes, who can see it, how long it stays, and how to have it taken down. A technical
          appendix at the end has the detail for anyone who wants it.
        </p>
      </header>

      <section className="dh-short" aria-labelledby="short">
        <h2 id="short">In short</h2>
        <p>
          <strong>Your submission is private by default.</strong> It goes into a review queue that only the Honeycomb team
          can see. <strong>Nothing is published until a person on that team approves it</strong>, and then only at the
          visibility level you chose. <strong>You can have it removed at any time</strong> with one email. The only companies
          that touch it are the ones that store and serve it, and the number of them is kept as small as we can make it.
        </p>
      </section>

      <section aria-labelledby="collect">
        <p className="dh-num">01</p>
        <h2 id="collect">What we collect</h2>
        <p>Only what you put into the form. Every field except the title is optional.</p>
        <ul>
          <li><strong>Your account</strong> — the words you type or dictate, and/or a video or audio recording. For a video we also keep its audio track on its own, so it can be transcribed.</li>
          <li><strong>A photo</strong>, if you attach one. It becomes the face of your cell in the comb.</li>
          <li><strong>Your name</strong>, first and last, and <strong>how much of it to show</strong>: full name, first name and last initial, or initials only. Both are kept separately so you can change how much shows later without telling us your name again. Leave both blank to stay anonymous; your cell then shows the place, or the title, instead.</li>
          <li><strong>A title, a place, a year, and tags</strong> — as you wrote them.</li>
          <li><strong>The visibility you chose</strong>: public, community only, or strictly archived.</li>
          <li><strong>The moment you submitted and confirmed</strong> the account was yours to share.</li>
          <li><strong>A submission ID</strong>, generated for you and shown once, which is how you refer to the record later.</li>
        </ul>
        <p>
          We do not ask for your email address, so we cannot write to you — and nobody who obtains the archive could either.
          Nothing about your device or connection is written into the record: no IP address, no browser details, no
          location beyond what you type.
        </p>
      </section>

      <section aria-labelledby="where">
        <p className="dh-num">02</p>
        <h2 id="where">Where it goes, step by step</h2>
        <ol className="dh-steps">
          <li>
            <strong>In your browser.</strong> While you write or record, everything stays on your device. Nothing is sent
            until you press the button.
          </li>
          <li>
            <strong>Upload.</strong> A recording or photo goes directly from your browser into a private storage bucket
            at Cloudflare, over an encrypted connection, using a one-time upload link that is valid for thirty minutes and
            for that one file only. It does not pass through any other server on the way.
          </li>
          <li>
            <strong>The pending queue.</strong> The written record — title, name and display choice, place, year, words,
            tags, visibility — is stored beside it, in a part of the bucket marked <em>pending</em>.
          </li>
          <li>
            <strong>Review.</strong> A moderator on the Honeycomb team opens the queue, reads or listens, may ask for a
            machine transcript of a recording, corrects obvious errors, and decides. Machine transcription runs inside the
            same Cloudflare account that already holds the recording, so no additional company receives the audio.
          </li>
          <li>
            <strong>Approved</strong> records move to the <em>approved</em> part of the bucket. <strong>Declined</strong> records
            are deleted at that moment, together with their files.
          </li>
          <li>
            <strong>On the site.</strong> An approved story is served under the visibility you chose. <em>Public</em>: to
            anyone who has entered the site password. <em>Community only</em>: to signed-in members. <em>Strictly
            archived</em>: never leaves the server; it is kept, and not shown to anyone but moderators. Recordings and
            photos are served through links that expire after an hour.
          </li>
        </ol>
      </section>

      <section aria-labelledby="who">
        <p className="dh-num">03</p>
        <h2 id="who">Who can see it, at each step</h2>
        <dl className="dh-who">
          <dt>You</dt>
          <dd>Your own draft, in your browser, until you submit. After that you cannot log in to see it; the submission ID is your handle on it.</dd>
          <dt>Honeycomb moderators</dt>
          <dd>The six members of the Honeycomb team — Paul, Liz, Dane, James, Eavie and Allen — and no one else. They hold the moderator password and see everything in the pending queue and the archive, at every visibility level, because they are the ones deciding.</dd>
          <dt>Site visitors</dt>
          <dd>Approved <em>public</em> stories only, after entering the site password. Visitors never see the queue, declined submissions, or anything marked community-only or strictly archived.</dd>
          <dt>Members</dt>
          <dd>People the team has given a personal access code. They see approved <em>public</em> and <em>community-only</em> stories.</dd>
          <dt>Cloudflare</dt>
          <dd>Stores the files and the records, encrypted at rest with keys Cloudflare manages, and runs machine transcription when a moderator asks for it. As the storage provider it is technically able to read what it stores. See the appendix for what that means and what we are weighing.</dd>
          <dt>Netlify</dt>
          <dd>Runs the site itself. Like any host, it sees requests in transit — including the address they come from — and keeps its own operational logs. We do not copy any of that into your record.</dd>
          <dt>Sentry</dt>
          <dd>Receives a report when the site hits an error, so it can be fixed. Reports are stripped before they leave: no story content, no form contents, no address, no cookies.</dd>
          <dt>Nobody else</dt>
          <dd>No analytics, no advertising, no social-media embeds, no fonts or scripts loaded from anyone else. Your browser talks to projecthoneycomb.site and to the storage bucket, and to nothing else.</dd>
        </dl>
      </section>

      <section aria-labelledby="howlong">
        <p className="dh-num">04</p>
        <h2 id="howlong">How long it lives</h2>
        <ul>
          <li><strong>Pending</strong>: until a moderator decides. There is no automatic expiry on the queue today; the team reviews it as submissions arrive.</li>
          <li><strong>Declined</strong>: deleted immediately, with every file that belonged to it.</li>
          <li><strong>Approved</strong>: until you ask for it to be removed, or the team removes it.</li>
          <li><strong>Removed</strong>: deleted from storage at once. We keep no backup copies of the archive, so a deletion is final — and, to be equally honest, so would be a loss. Whether to add a backup that is itself encrypted is an open decision, noted in the appendix.</li>
          <li><strong>The unlock cookie</strong> that remembers you entered the site password lasts thirty days on your device and carries nothing about you.</li>
        </ul>
      </section>

      <section aria-labelledby="remove">
        <p className="dh-num">05</p>
        <h2 id="remove">How to have it removed</h2>
        <p>
          <strong>With your submission ID.</strong> Email <a href={mailto}>{REMOVAL_EMAIL}</a> with the ID in the subject
          line — for example <code>Remove HC-2026-09-18-7K3M</code> — and your submission will be removed. Automatic
          removal on receipt is being connected; until it is live, a person on the team does it, within five business
          days, and this page will say when that changes.
        </p>
        <p>
          <strong>Without it.</strong> Email the same address with the name you submitted under. If you stayed anonymous,
          include the date, the approximate time and a short description of the account so we can find it.
        </p>
        <p>
          <strong>What “removed” means.</strong> The written record, the recording, its separate audio track, the photo,
          the transcript and the tags — all deleted, whether the submission was still pending or already approved. No
          copy remains anywhere we control.
        </p>
        <p>
          <strong>Changing rather than removing.</strong> The same email can change your visibility level, or how much of
          your name shows, without resubmitting.
        </p>
      </section>

      <section aria-labelledby="strip">
        <p className="dh-num">06</p>
        <h2 id="strip">What we strip, and what we never collect</h2>
        <p>
          <strong>Never collected:</strong> your IP address with the record, your email, analytics or tracking of any kind,
          scripts from other companies. There is no account to create and no profile to build.
        </p>
        <p>
          <strong>Hidden file metadata.</strong> Photos and recordings often carry data you cannot see — where and when
          they were taken, the device that made them. Our rule is that this never reaches the archive. Today the site
          does not read or display it; a step that strips it from every file at the moment a moderator approves it is
          being added, and this page will state when it is in place. Until then, a file you upload is stored as you sent it.
        </p>
      </section>

      <section className="dh-appendix" aria-labelledby="appendix">
        <p className="dh-num">A</p>
        <h2 id="appendix">Technical appendix</h2>
        <p className="dh-appendix-lede">For the person whose job it is to ask the harder questions.</p>

        <h3>Where things run</h3>
        <ul>
          <li><strong>Site and API</strong>: Next.js on Netlify (static assets at the edge, server code as Netlify functions, US region).</li>
          <li><strong>Storage</strong>: one private Cloudflare R2 bucket. No public read on any object. Every read of a recording or photo is a signed URL valid for one hour; every upload is a signed PUT valid for thirty minutes, bound to one object key and content type. Records are JSON objects in the same bucket under <code>submissions/</code> (pending) and <code>approved/submissions/</code>.</li>
          <li><strong>Preview environment</strong> shares the bucket under a key prefix, with its own passwords and its own fictional test data; nothing crosses.</li>
          <li><strong>Transcription</strong>: Cloudflare Workers AI (Whisper), called from the server with the recording that is already in R2. The draft is stored on the record as a machine transcript and is never served to a visitor; a moderator confirms or replaces it.</li>
        </ul>

        <h3>Who is on the list</h3>
        <ul>
          <li><strong>Netlify</strong> — hosting, build, functions. Sees request metadata (IP, user agent, URL) in transit and in its own logs, retained on Netlify’s schedule.</li>
          <li><strong>Cloudflare</strong> — R2 storage (AES-256 at rest, Cloudflare-managed keys) and Workers AI transcription. The account holder controls access keys; the storage token is scoped to this one bucket.</li>
          <li><strong>Sentry</strong> — error tracking, US ingest. Browser reports leave through <code>/monitoring</code> on our own domain, not to a Sentry address. <code>sendDefaultPii</code> is off and every event is scrubbed before sending: user, IP, cookies, headers, request bodies, query strings and URL signatures are removed. Tracing is sampled at ten percent.</li>
          <li><strong>Not present</strong>: Google Fonts (self-hosted), analytics, Arcjet (in the dependency list, not active), any database (records are objects in R2).</li>
        </ul>

        <h3>Access model</h3>
        <ul>
          <li>The site password issues a signed session cookie (HMAC-SHA256, server secret), valid thirty days, role <em>visitor</em>.</li>
          <li><strong>Members</strong> hold personal codes; only a SHA-256 hash of each code is stored, and a code can be reissued or revoked by a moderator.</li>
          <li><strong>Moderators</strong> hold a separate password and reach <code>/review</code> and every moderation endpoint; each endpoint checks the role server-side. Moderator sessions currently share the thirty-day life; a shorter life for that role is on the list.</li>
        </ul>

        <h3>Transport</h3>
        <ul>
          <li>HTTPS only, enforced by the host; <code>Strict-Transport-Security</code> for one year including subdomains.</li>
          <li><code>Referrer-Policy: no-referrer</code>; <code>X-Frame-Options: DENY</code>; camera and microphone permitted to this origin only; a Content-Security-Policy that names every origin the page may contact (this release reports violations; the next enforces).</li>
          <li>What a network observer can still see: that a device connected to projecthoneycomb.site, when, and roughly how much data moved. Not the content.</li>
        </ul>

        <h3>Deletion, backup, incidents</h3>
        <ul>
          <li>Deletion is an immediate object delete of the record and every media key it references. R2 keeps no versions and we take no snapshots, so it is final.</li>
          <li>There is no backup today. That protects the “gone means gone” promise and exposes the archive to loss; an encrypted backup under our own key is the option being weighed.</li>
          <li>Secrets live in Netlify environment variables, never in the repository. Dependencies are audited before each deploy.</li>
          <li>Anything that looks like a security problem: <a href={mailto}>{REMOVAL_EMAIL}</a>, subject “Security”.</li>
        </ul>

        <h3>Decisions still open</h3>
        <ul>
          <li>Encrypting files in the browser before upload, so the storage provider holds only ciphertext — against the cost of running transcription and moderation on hardware we operate ourselves.</li>
          <li>Where the metadata strip runs: at approval on the server (simpler; the raw file waits in the pending area until then) or in the browser before upload (better; harder).</li>
          <li>An expiry on the pending queue.</li>
        </ul>
      </section>

      <footer className="dh-foot">
        <p>Last reviewed {REVIEWED}. When this page changes in a way that affects what we keep or who can see it, the date changes with it.</p>
        <Link className="dh-back" href="/">← Back to Honeycomb</Link>
      </footer>
    </main>
  );
}
