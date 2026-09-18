import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// Transport posture for a site whose visitors may assume they are watched.
// Set here as well as in netlify.toml: the toml block only reaches static
// files, while pages and API routes are served by the Next runtime, which
// applies these. What a network observer can still see is that
// projecthoneycomb.site was visited and roughly how much moved; not the
// content. See /privacy.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Never tell another site where a visitor came from.
  { key: "Referrer-Policy", value: "no-referrer" },
  // HTTPS only, remembered by the browser for a year, subdomains included.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // The recorder needs the camera and microphone; nothing else is granted.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Every origin the page may talk to, named. Report-only for this release so
  // a missed origin shows in the console rather than breaking an upload; it
  // becomes enforcing once a full submission has been observed clean. Fonts
  // are self-hosted, so no third-party origin appears at all.
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.r2.cloudflarestorage.com",
      "media-src 'self' blob: https://*.r2.cloudflarestorage.com",
      "connect-src 'self' https://*.r2.cloudflarestorage.com",
      "font-src 'self'",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "honeycomb-bm",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",


  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
