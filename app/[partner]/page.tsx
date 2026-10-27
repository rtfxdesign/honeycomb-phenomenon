import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HoneycombApp from "../components/HoneycombApp";
import { PARTNER_SLUGS, partnerFor } from "../lib/partners.js";

// A partner's own entrance: /rice, /john-mack. The same archive behind a gate
// branded for them, taking their password (lib/partners.js). Any other slug is
// a 404, and the site's own pages (/about, /review, ...) are matched first.

export const dynamicParams = false;

export function generateStaticParams() {
  return PARTNER_SLUGS.map((partner) => ({ partner }));
}

export async function generateMetadata({ params }: { params: Promise<{ partner: string }> }): Promise<Metadata> {
  const p = partnerFor((await params).partner);
  if (!p) return {};
  return {
    title: `Honeycomb × ${p.name}`,
    robots: { index: false, follow: false },
  };
}

export default async function PartnerGate({ params }: { params: Promise<{ partner: string }> }) {
  const p = partnerFor((await params).partner);
  if (!p) notFound();
  return <HoneycombApp partner={p.slug} />;
}
