// Partner institutions that get a gate of their own.
//
// Each partner has a page at /<slug>, branded for them, with a password of
// its own (set in Netlify as the env var named here, comma-separated like the
// site password). Entering it opens the archive as a visitor and marks the
// session with the partner; anything submitted in that session is stamped
// with `origin: <slug>` on the record and carries the partner's tag, so the
// comb can gather a partner's stories and /review can filter by them.
//
// Display text only — no secrets live here, so the gate can import it.
// Plain JS rather than TS so the scripts and tests can import it directly.

export const PARTNERS = {
  rice: {
    slug: 'rice',
    tag: 'rice',
    passwordEnv: 'HONEYCOMB_PARTNER_RICE_PASSWORD',
    name: 'Archives of the Impossible',
    org: 'Rice University',
    // the line under the title on their gate
    welcome:
      'Project Honeycomb is a living archive of first-hand encounters with the unexplained, told by the people who had them. ' +
      'This entrance was made for the Archives of the Impossible at Rice University. Enter the password you were given to continue.',
    // the badge shown on their submissions in /review
    label: 'Rice · Archives of the Impossible',
  },
  'john-mack': {
    slug: 'john-mack',
    tag: 'john-mack',
    passwordEnv: 'HONEYCOMB_PARTNER_JOHN_MACK_PASSWORD',
    name: 'John E. Mack Institute',
    org: null,
    welcome:
      'Project Honeycomb is a living archive of first-hand encounters with the unexplained, told by the people who had them. ' +
      'This entrance was made for the John E. Mack Institute. Enter the password you were given to continue.',
    label: 'John E. Mack Institute',
  },
};

export const PARTNER_SLUGS = Object.keys(PARTNERS);

export const partnerFor = (slug) => (typeof slug === 'string' && Object.hasOwn(PARTNERS, slug) ? PARTNERS[slug] : null);
