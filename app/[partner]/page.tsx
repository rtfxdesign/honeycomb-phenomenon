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
  // The link a partner is sent unfurls as their own card (public/og-<slug>.png,
  // drawn by scripts/og-cards.mjs). The ?v= changes whenever the card is
  // redrawn, because messaging apps cache a card by its URL.
  const title = `Project Honeycomb × ${p.name}`;
  const image = { url: `/og-${p.slug}.png?v=3`, width: 1200, height: 630, alt: `Project Honeycomb × ${p.name}: Welcome to the Honeycomb.` };
  return {
    title: `Honeycomb × ${p.name}`,
    description: p.shareLine,
    robots: { index: false, follow: false },
    openGraph: { title, description: p.shareLine, type: "website", url: `/${p.slug}`, images: [image] },
    twitter: { card: "summary_large_image", title, description: p.shareLine, images: [image.url] },
  };
}

export default async function PartnerGate({ params }: { params: Promise<{ partner: string }> }) {
  const p = partnerFor((await params).partner);
  if (!p) notFound();
  return <HoneycombApp partner={p.slug} />;
}
