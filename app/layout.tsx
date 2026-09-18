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
    icons: {
      icon: "/current-honeycomb-mark.jpg",
      shortcut: "/current-honeycomb-mark.jpg",
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: "/",
      images: [{ url: "/og.png", width: 1536, height: 1024, alt: "Honeycomb — Your experience. Our collective history." }],
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
