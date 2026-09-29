// The people behind Honeycomb, in one place: the About page, the Allies and
// Contact panels all read from here.
//
// TEAM `slot` is [column, row] on the About page's comb (pointy-top cells,
// odd rows shifted half a cell right). Leave it off a new member and the page
// lays the team out in rows of three instead. `role` is an optional line under
// the name; `email` is optional, and a member without one is left off the
// Contact list.

export const ROSTER_EMAIL = 'contact@projecthoneycomb.site';

export const TEAM = [
  {
    name: 'Paul Werenko',
    image: '/team/paul-werenko.png',
    imagePosition: '50% 42%',
    email: 'paul@honeycomb-phenomenon.com',
    slot: [1, 1],
    bio: [
      'Paul Werenko is the visionary behind Honeycomb. Following a lifetime of personal anomalous experiences which he previously dismissed as coincidences, Paul’s comprehension of the phenomenon began to shift, thanks in no small part to Leslie Kean’s 2017 NYT article and subsequent disclosures from trusted individuals. He has since dedicated his time and effort to numerous projects and organizations to assist in the education of all in the phenomena and their impact on humanity.',
      'Honeycomb is just one of those projects that is today his life’s work but it has become his flagship vision. Alongside his handpicked team and with the tireless support of well-known members of the UAP Community including journalists, pilots, and Experiencers, Paul and his team are committed to providing a platform where every individual in the world is able to share their story.',
    ],
  },
  {
    name: 'Eavie Arntzen',
    image: '/team/eavie-arntzen.png',
    imagePosition: '58% 48%',
    email: 'eavie@honeycomb-phenomenon.com',
    slot: [0, 1],
    bio: [
      'With a lifelong fascination in the question of consciousness and a background in psychology and writing, Eavie Arntzen is deeply invested in the exploration of consciousness and, thanks to the disclosure of brave individuals committed to telling and sharing the truth, the connections between what it means to be conscious and the profound experience of unexplained phenomena.',
      'The single most engaging, fundamental and philosophical questions about our species and our universe are being asked today, and through the work of Honeycomb she is excited to direct those questions through a deeply human lens by supporting experiencers in telling their stories.',
    ],
  },
  {
    name: 'James Faulk',
    image: '/team/james-faulk.png',
    imagePosition: '50% 42%',
    email: 'james@honeycomb-phenomenon.com',
    slot: [2, 1],
    bio: [
      'In late 2022, award-winning reporter, writer, producer, news anchor and podcaster James Faulk launched Neon Galactic podcast to help mainstream the vital conversation surrounding UAP, NHI, and government secrecy. His work there triggered a deep dive into esoteric philosophy and other forms of rejected knowledge, prompting an ontological flip that impacted every aspect of his life.',
      'The rather impromptu online side gig became his primary passion, an engine for self-discovery, and a means to foster connection. His newest venture with Honeycomb is a perfect crystallization of the values and perspective he has developed these past several years and he is thrilled to help uncover the truth about humankind, consciousness, and unity in the cosmos, all of which James believes can be found in people’s lived experience. The goal now is to help people tell their stories.',
    ],
  },
  {
    name: 'Liz Perez',
    image: '/team/liz-perez.png',
    imagePosition: '50% 43%',
    email: 'liz@honeycomb-phenomenon.com',
    slot: [1, 0],
    bio: [
      'Liz Perez’s personal experiences with the anomalous span the breadth of her life but have been refocused with her more recent research into the phenomenon. As a project manager for a high-end, complex and demanding engineering and construction firm, Liz provides the scaffolding of the Honeycomb project, keeping an eye on the next step and jumping in by making new ideas tangible.',
      'Her involvement in various projects related to the phenomena led her to a central role in Honeycomb and a commitment to disclosure and realizing the goal of making the once-sidelined truth accessible.',
    ],
  },
  {
    name: 'Dane Street',
    image: '/team/dane-street.png',
    imagePosition: '50% 42%',
    email: 'dane@honeycomb-phenomenon.com',
    slot: [2, 0],
    bio: [
      'Driven by the idea of aiding connection and expansion of the human story within the phenomenon, Dane Street brings to Honeycomb a passion for shifting the paradigm and creating a platform through which disclosure will happen, not by way of appeals to repeal government secrecy, but by the people and for the people.',
      'Analytical by nature, his skill set as a logic and process analyst directs Dane’s exploration into the unexplainable and the as-yet-unrealized possibilities of human knowledge and understanding. Through population-based disclosure, Dane intends to return the truth to humanity and open the door to our shared history.',
    ],
  },
  {
    name: 'Allen Grabo',
    role: 'Creative technologist · The archive’s builder',
    image: '/team/allen-grabo.jpg',
    imagePosition: '50% 38%',
    slot: [0, 0],
    bio: [
      'Allen Grabo is a creative technologist based in Washington, DC, and the founder of rtfx design, a studio that builds visual systems for real spaces. The work lives where an idea has to survive contact with a room: projection-mapped environments, LED walls, generative visuals, and the show-control systems that keep them running live. Allen has built the systems that powered events at Porsche Studio Portland, Miami Art Week, Cape Canaveral, the Kennedy Center, Baltimore Ravens tailgates, and the Smithsonian.',
      'At Honeycomb, Allen builds the archive itself: the comb where every voice appears as a point of light, the recorder that lets someone tell their story in their own words, and the quiet machinery that keeps each story in the hands of the person who lived it. The work is as much custody as design. It decides not only how an experience looks when it is shared, but who can see it, how long it stays, and how it can be taken back. For Allen, an archive of the unexplained earns trust the way a good live show does: everything complicated stays out of sight, and nothing is left to chance.',
    ],
  },
];

// Organisations that work alongside Honeycomb, and the people and groups who
// stand with experiencers. Each entry: { name, role, url?, logo? }. An empty
// list renders as a note that the names are still being confirmed.
export const PARTNERS = [];
export const ADVISORS = [
  { name: 'Karin Austin', role: 'Director, Center for the Impossible, Rice University', url: 'https://profiles.rice.edu/staff/karin-austin' },
  { name: 'Andrea Oddo', role: 'Technology and privacy advisor' },
];
export const ALLIES = [];

export const ADVISOR_NOTE = 'People who advise Honeycomb on how an archive of lived experience should be kept: with consent, with care, and with the contributor in control.';
