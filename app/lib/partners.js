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
    // the line under the title when their link is shared
    shareLine: 'A private entrance for the Archives of the Impossible at Rice University.',
    // Their gate wears their identity: the Woodson Research Center lockup
    // (Rice Fondren Library, Center of the Impossible) as published on
    // impossiblearchives.org, unaltered on a white plate; Rice's shield navy
    // and the Center's gold; Public Sans, the Center's typeface. Colours and
    // type are set in globals.css under .gate[data-partner="rice"].
    logo: '/partners/rice-woodson-center-for-the-impossible.jpg',
    logoAlt: 'Rice Fondren Library, Woodson Research Center, Center of the Impossible',
    logoPlate: true,
    // the comb lines drawn behind the gate (lib/honeycomb-hover.js)
    fx: { color: '#f6c924', glow: '#3f5bd1', honey: '#fff1b0' },
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
    shareLine: 'A private entrance for the John E. Mack Institute.',
    // Their wordmark from johnemackinstitute.org (made for a dark header, so
    // it sits straight on the gate), their violet, and their typefaces:
    // Source Serif for headings, Nunito for text.
    logo: '/partners/john-mack-institute.png',
    logoAlt: 'John Mack Institute',
    logoPlate: false,
    fx: { color: '#c39bff', glow: '#7f37ba', honey: '#efe3ff' },
  },
};

export const PARTNER_SLUGS = Object.keys(PARTNERS);

export const partnerFor = (slug) => (typeof slug === 'string' && Object.hasOwn(PARTNERS, slug) ? PARTNERS[slug] : null);
