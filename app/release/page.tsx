import type { Metadata } from "next";
import { Suspense } from "react";
import ReleaseForm from "./ReleaseForm";

// The contributor release, as a form. For the people whose faces and stories
// were loaded by hand (app/data/people.js) and for anyone recorded outside the
// site — the recorder's own checkbox covers everyone else. Not behind the
// gate: a person signing a release has usually not been given the password.
//
// Send each person a link with their key filled in, e.g. /release?key=John_B.
// Submissions arrive as the Netlify form "contributor-release".

export const metadata: Metadata = {
  title: "Contributor release — Honeycomb",
  description: "Give Project Honeycomb permission to keep and show your story, on your terms, and say how your name appears.",
  robots: { index: false, follow: false },
};

export default function ReleasePage() {
  return (
    <Suspense fallback={null}>
      <ReleaseForm />
    </Suspense>
  );
}
