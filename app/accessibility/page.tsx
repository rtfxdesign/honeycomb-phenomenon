import type { Metadata } from "next";
import Link from "next/link";
import { REMOVAL_EMAIL } from "../lib/contact";
import "../privacy/privacy.css";

// Accessibility statement: what works, what does not yet, and where to write.
// Kept factual — a statement that overclaims is worse than none. Update the
// "not yet" list as items ship; the date at the foot moves with it.

export const metadata: Metadata = {
  title: "Accessibility — Honeycomb",
  description: "How the Honeycomb archive works with keyboards, screen readers and reduced motion, what does not yet, and how to tell us.",
  robots: { index: false, follow: false },
};

const REVIEWED = "2026-10-11";

export default function AccessibilityPage() {
  return (
    <main className="dh">
      <header className="dh-head">
        <Link className="dh-back" href="/">← Honeycomb</Link>
        <p className="dh-eyebrow">Project Honeycomb · Accessibility</p>
        <h1>Using the archive without a mouse, or without sight of it</h1>
        <p className="dh-lede">
          The archive is a visual thing — a comb of faces, lit from behind. It is meant to work for people who cannot see
          it, cannot use a pointer, or cannot tolerate motion, and this page says how far that is true today. The aim is
          WCAG 2.1 level AA.
        </p>
      </header>

      <section aria-labelledby="works">
        <p className="dh-num">01</p>
        <h2 id="works">What works now</h2>
        <ul>
          <li><strong>Keyboard.</strong> Every cell in the comb is reachable with Tab and opens with Enter or Space. The story panel, the recorder and the gate are ordinary forms and buttons.</li>
          <li><strong>Screen readers.</strong> Each cell is announced by the contributor&rsquo;s chosen name; decorative imagery is hidden from assistive technology. Every story with a recording also carries its written transcript, shown beside the player.</li>
          <li><strong>Reduced motion.</strong> If your system asks for reduced motion, the parallax, the reveal animation and the glow transitions are turned off.</li>
          <li><strong>Phones.</strong> On a narrow screen the comb becomes a single column that scrolls like a page, with nothing off the edge.</li>
          <li><strong>Text.</strong> The site is readable at 200% zoom. Self-hosted fonts; no text is drawn as an image.</li>
        </ul>
      </section>

      <section aria-labelledby="notyet">
        <p className="dh-num">02</p>
        <h2 id="notyet">What does not work yet</h2>
        <ul>
          <li><strong>Captions.</strong> Recordings have a transcript beside them but no synchronized captions on the video itself. The machine transcript already carries word timings, so timed captions are the next step; until then the transcript is the text alternative.</li>
          <li><strong>Contrast.</strong> Some gold-on-dark elements in the comb have not yet been measured against the AA ratio; the story text and the forms have.</li>
          <li><strong>Audio description.</strong> Recordings are not audio-described. Most are a person speaking to camera, which the transcript covers; where a recording shows something else, the written account is the alternative.</li>
        </ul>
      </section>

      <section aria-labelledby="tell">
        <p className="dh-num">03</p>
        <h2 id="tell">Tell us</h2>
        <p>
          If something here does not work for you, email <a href={`mailto:${REMOVAL_EMAIL}?subject=Accessibility`}>{REMOVAL_EMAIL}</a>{" "}
          with the subject <em>Accessibility</em> and say what you were trying to do and what happened. A person reads it, and
          what you tell us goes on the list above.
        </p>
      </section>

      <footer className="dh-foot">
        <p>Last reviewed {REVIEWED}.</p>
        <Link className="dh-back" href="/">← Back to Honeycomb</Link>
      </footer>
    </main>
  );
}
