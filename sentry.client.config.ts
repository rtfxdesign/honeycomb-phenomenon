import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://9a6b7f1543b154dfdbf362c64b4c2303@o4511804699639808.ingest.us.sentry.io/4511804702982144",
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
