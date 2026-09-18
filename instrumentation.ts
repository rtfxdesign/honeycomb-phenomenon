import * as Sentry from "@sentry/nextjs";
import { scrub } from "./app/lib/sentry-scrub";

// Server-side error reporting, scrubbed the same way as the browser: no IP,
// no headers, no request body. See app/lib/sentry-scrub.ts and /privacy.
const options = {
  dsn: "https://9a6b7f1543b154dfdbf362c64b4c2303@o4511804699639808.ingest.us.sentry.io/4511804702982144",
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: scrub,
  beforeSendTransaction: scrub,
  debug: false,
};

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") Sentry.init(options);
  if (process.env.NEXT_RUNTIME === "edge") Sentry.init(options);
}
