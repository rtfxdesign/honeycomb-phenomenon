import * as Sentry from "@sentry/nextjs";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn: "https://9a6b7f1543b154dfdbf362c64b4c2303@o4511804699639808.ingest.us.sentry.io/4511804702982144",
      tracesSampleRate: 1,
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: "https://9a6b7f1543b154dfdbf362c64b4c2303@o4511804699639808.ingest.us.sentry.io/4511804702982144",
      tracesSampleRate: 1,
      debug: false,
    });
  }
}
