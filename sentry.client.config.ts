import * as Sentry from "@sentry/nextjs";
import { scrub } from "./app/lib/sentry-scrub";

// Error reports leave the browser through /monitoring on our own domain and
// carry no personal data: no IP, no cookies, no request bodies, no user. A
// contributor's story must never end up in an error report. See /privacy.
Sentry.init({
  dsn: "https://9a6b7f1543b154dfdbf362c64b4c2303@o4511804699639808.ingest.us.sentry.io/4511804702982144",
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  beforeSend: scrub,
  beforeSendTransaction: scrub,
  debug: false,
});
