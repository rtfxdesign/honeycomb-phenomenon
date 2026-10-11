import type { Metadata } from "next";
import { Suspense } from "react";
import ListingConsentForm from "./ListingConsentForm";

// Consent to be named on the About page — advisors and team members. Not
// behind the gate. Send each person a link with their listing filled in:
//   /listing-consent?kind=advisor&name=Karin%20Austin&role=Director%2C%20Center%20for%20the%20Impossible
//   /listing-consent?kind=team&name=Liz%20Perez&role=Project%20manager
// Submissions arrive as the Netlify form "listing-consent".

export const metadata: Metadata = {
  title: "Listing consent — Honeycomb",
  description: "Confirm, correct, or decline how you are named on the Project Honeycomb site.",
  robots: { index: false, follow: false },
};

export default function ListingConsentPage() {
  return (
    <Suspense fallback={null}>
      <ListingConsentForm />
    </Suspense>
  );
}
