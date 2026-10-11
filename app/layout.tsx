import type { Metadata } from "next";
import { headers } from "next/headers";
import "./fonts.css";
import "./globals.css";

const title = "Honeycomb — Your Experience. Our Collective History.";
const description = "A safe, searchable living archive for anomalous human experiences, built one voice at a time.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title,
    description,
    // the comb mark, gold on cacao: an SVG for browsers that take one, PNGs
    // for the rest, and a square one for an iPhone home screen
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      shortcut: "/favicon-32.png",
      apple: "/apple-touch-icon.png",
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: "/",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Project Honeycomb — Enter the Honeycomb. A living archive of the unexplained, shared by invitation." }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}

// Fonts are served from this origin (app/fonts.css → /public/fonts), so a
// visitor's browser never contacts Google. No third-party request leaves the
// page at all; see /privacy.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
