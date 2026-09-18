/**
 * Strip anything personal from a Sentry event before it leaves.
 *
 * Kept deliberately blunt: rather than pick fields we think are safe, remove
 * the whole request body, every header and cookie, the user, and the IP. A
 * stack trace and a message are enough to fix a bug; a contributor's story
 * is not ours to forward to an error tracker.
 */
type Scrubbable = {
  user?: unknown;
  request?: {
    data?: unknown;
    cookies?: unknown;
    headers?: unknown;
    env?: unknown;
    query_string?: unknown;
    url?: string;
  };
  contexts?: Record<string, unknown>;
  breadcrumbs?: Array<{ data?: Record<string, unknown> }>;
};

export function scrub<T extends Scrubbable>(event: T): T {
  delete event.user;
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.env;
    delete event.request.query_string;
    // A presigned upload URL carries a signature; keep only the path.
    if (event.request.url) event.request.url = event.request.url.split("?")[0];
  }
  if (event.contexts) {
    delete event.contexts.device;
    delete event.contexts.culture;
  }
  for (const crumb of event.breadcrumbs || []) {
    if (crumb.data) {
      delete crumb.data.body;
      delete crumb.data.response_body_size;
      if (typeof crumb.data.url === "string") crumb.data.url = crumb.data.url.split("?")[0];
    }
  }
  return event;
}
