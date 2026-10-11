import type { Metadata } from "next";
import Link from "next/link";
import { REMOVAL_EMAIL, PRIVACY_PATH, ACCESSIBILITY_PATH } from "../lib/contact";
import "../privacy/privacy.css";

// Terms of use for visitors and members — the people who watch, not the
// people who contribute (contributors are covered by the recorder's consent
// and by /privacy). Short on purpose: it exists so that a member who takes a
// contributor's recording and posts it elsewhere has broken a stated rule,
// and so that a copyright complaint has an address and a procedure.
//
// Legal review pending: the wording below is a draft for counsel, kept in
// plain language. Names of the operating entity go in where "Honeycomb"
// stands once that entity exists.

export const metadata: Metadata = {
  title: "Terms of use — Honeycomb",
  description: "What you agree to when you enter the Honeycomb archive: respect for contributors, no redistribution of their recordings, and how to report a problem.",
  robots: { index: false, follow: false },
};

const EFFECTIVE = "2026-10-11";
const mailto = `mailto:${REMOVAL_EMAIL}`;

export default function TermsPage() {
  return (
    <main className="dh">
      <header className="dh-head">
        <Link className="dh-back" href="/">← Honeycomb</Link>
        <p className="dh-eyebrow">Project Honeycomb · Terms of use</p>
        <h1>What you agree to when you enter</h1>
        <p className="dh-lede">
          The archive holds people&rsquo;s own accounts of their experiences, told in their own voices and often with
          their own faces. Entering the site means agreeing to treat those accounts the way their contributors were
          promised they would be treated. How a contributor&rsquo;s story is handled is on its own page:{" "}
          <Link href={PRIVACY_PATH}>how we handle your story and files</Link>.
        </p>
      </header>

      <section className="dh-short" aria-labelledby="short">
        <h2 id="short">In short</h2>
        <p>
          <strong>Watch, listen, read. Don&rsquo;t copy, repost or scrape.</strong> Don&rsquo;t contact or identify a
          contributor beyond what they chose to show. Keep your password or access code to yourself. What you find here is
          personal testimony, not verified fact, and it is offered as such.
        </p>
      </section>

      <section aria-labelledby="who">
        <p className="dh-num">01</p>
        <h2 id="who">Who these terms are for</h2>
        <p>
          Anyone who enters the site with the site password (a <strong>visitor</strong>) or with a personal access code
          (a <strong>member</strong>). Members of the Honeycomb team who moderate the archive are bound by these terms too,
          and by the moderation guideline on top of them.
        </p>
      </section>

      <section aria-labelledby="use">
        <p className="dh-num">02</p>
        <h2 id="use">What you may do</h2>
        <ul>
          <li>Read, watch and listen to the stories shown to you at your level of access.</li>
          <li>Download a recording where the site offers a download button. That button appears only on stories the contributor chose to make public, and only for your own viewing.</li>
          <li>Tell people the archive exists, and share the site address.</li>
        </ul>
      </section>

      <section aria-labelledby="not">
        <p className="dh-num">03</p>
        <h2 id="not">What you may not do</h2>
        <ul>
          <li><strong>Redistribute a contributor&rsquo;s recording, photo, transcript or name</strong> — no reposting, re-uploading, excerpting into a video, or sharing to a group — anywhere outside this site. A contributor can withdraw their story from here at any time; a copy you made somewhere else cannot be withdrawn, and that is the promise you would be breaking.</li>
          <li>Record your screen, scrape, crawl or bulk-download any part of the archive, or use any of it to train a machine-learning model.</li>
          <li>Attempt to identify a contributor who chose to show less than their full name, or to contact a contributor through any means other than this site.</li>
          <li>Harass, ridicule or threaten a contributor, on this site or elsewhere, because of what they shared here.</li>
          <li>Share the site password or your access code, or try to reach records at a level of access you were not given.</li>
          <li>Submit anything to the archive that is not your own account to give, or that you do not have the right to share.</li>
        </ul>
        <p>
          A member who breaks these terms has their access code revoked. Where the law gives a contributor a claim
          against someone who misused their likeness or their words, these terms are intended to support that claim.
        </p>
      </section>

      <section aria-labelledby="nature">
        <p className="dh-num">04</p>
        <h2 id="nature">What the archive is, and is not</h2>
        <p>
          Every story here is one person&rsquo;s account, in their words. Honeycomb does not verify, endorse or
          interpret it, and the fact that a story appears here says nothing about anyone named in it. The site is
          offered as it is; it may be unavailable at times, and content may be removed at a contributor&rsquo;s
          request without notice.
        </p>
      </section>

      <section aria-labelledby="copyright">
        <p className="dh-num">05</p>
        <h2 id="copyright">Copyright, and how to report a problem</h2>
        <p>
          Contributors keep the copyright in their own recordings and words; they have given Honeycomb a non-exclusive
          permission to keep and show them, which they can withdraw. The site&rsquo;s own design, text and code belong to
          Honeycomb and its makers.
        </p>
        <p>
          <strong>If you believe something in the archive infringes your copyright</strong>, email{" "}
          <a href={mailto}>{REMOVAL_EMAIL}</a> with the subject <em>Copyright</em> and include: what the work is and
          that you own it; where on the site the material appears (a story title or submission ID); your name, address
          and a way to reach you; a statement, made in good faith, that the use is not authorized; a statement, under
          penalty of perjury, that the notice is accurate; and your physical or electronic signature. We act on complete
          notices promptly and tell the contributor what was removed and why. A contributor who believes the removal was
          a mistake can send a counter-notice to the same address.
        </p>
        <p>
          <strong>If you believe a story defames you or wrongly identifies you</strong>, write to the same address with
          the subject <em>Identification</em>. A moderator reads every such message.
        </p>
      </section>

      <section aria-labelledby="changes">
        <p className="dh-num">06</p>
        <h2 id="changes">Changes, and the law that applies</h2>
        <p>
          These terms may change; the date below changes with them, and continuing to use the site after a change means
          accepting it. They are governed by the laws of the State of Maryland, United States. Accessibility of the
          site is described on its <Link href={ACCESSIBILITY_PATH}>own page</Link>.
        </p>
      </section>

      <footer className="dh-foot">
        <p>Effective {EFFECTIVE}.</p>
        <Link className="dh-back" href="/">← Back to Honeycomb</Link>
      </footer>
    </main>
  );
}
