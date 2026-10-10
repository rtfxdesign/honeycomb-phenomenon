// The people behind Honeycomb, in one place: the About page, the Allies and
// Contact panels all read from here.
//
// The About page lays each group out in rows of three, the team's rows above
// the advisors', and deals the cells out in a fresh order on every visit.
// `role` is an optional line under the name; `email` is optional, and a member
// without one is left off the Contact list. `fullImage` is an optional wider
// photo, shown when the cell is clicked and grows; without it the portrait
// itself is shown larger. An entry with no `image` shows its initials.

export const ROSTER_EMAIL = 'contact@projecthoneycomb.site';

export const TEAM = [
  {
    name: 'Paul Werenko',
    role: 'Founder',
    image: '/team/paul-werenko.png',
    fullImage: '/team/paul-werenko-full.jpg',
    fullPosition: '58% 42%',
    imagePosition: '50% 42%',
    email: 'paul@honeycomb-phenomenon.com',
    bio: [
      'Paul Werenko is the visionary behind Honeycomb. Following a lifetime of personal anomalous experiences which he previously dismissed as coincidences, Paul’s comprehension of the phenomenon began to shift, thanks in no small part to Leslie Kean’s 2017 NYT article and subsequent disclosures from trusted individuals. He has since dedicated his time and effort to numerous projects and organizations to assist in the education of all in the phenomena and their impact on humanity.',
      'Honeycomb is just one of those projects that is today his life’s work but it has become his flagship vision. Alongside his handpicked team and with the tireless support of well-known members of the UAP Community including journalists, pilots, and Experiencers, Paul and his team are committed to providing a platform where every individual in the world is able to share their story.',
    ],
  },
  {
    name: 'Eavie Arntzen',
    role: 'Writer and researcher',
    image: '/team/eavie-arntzen.png',
    fullImage: '/team/eavie-arntzen-full.jpg',
    fullPosition: '50% 45%',
    imagePosition: '58% 48%',
    email: 'eavie@honeycomb-phenomenon.com',
    bio: [
      'With a lifelong fascination in the question of consciousness and a background in psychology and writing, Eavie Arntzen is deeply invested in the exploration of consciousness and, thanks to the disclosure of brave individuals committed to telling and sharing the truth, the connections between what it means to be conscious and the profound experience of unexplained phenomena.',
      'The single most engaging, fundamental and philosophical questions about our species and our universe are being asked today, and through the work of Honeycomb she is excited to direct those questions through a deeply human lens by supporting experiencers in telling their stories.',
    ],
  },
  {
    name: 'James Faulk',
    role: 'Journalist and podcaster',
    image: '/team/james-faulk.png',
    fullImage: '/team/james-faulk-full.jpg',
    fullPosition: '52% 42%',
    imagePosition: '50% 42%',
    email: 'james@honeycomb-phenomenon.com',
    bio: [
      'In late 2022, award-winning reporter, writer, producer, news anchor and podcaster James Faulk launched Neon Galactic podcast to help mainstream the vital conversation surrounding UAP, NHI, and government secrecy. His work there triggered a deep dive into esoteric philosophy and other forms of rejected knowledge, prompting an ontological flip that impacted every aspect of his life.',
      'The rather impromptu online side gig became his primary passion, an engine for self-discovery, and a means to foster connection. His newest venture with Honeycomb is a perfect crystallization of the values and perspective he has developed these past several years and he is thrilled to help uncover the truth about humankind, consciousness, and unity in the cosmos, all of which James believes can be found in people’s lived experience. The goal now is to help people tell their stories.',
    ],
  },
  {
    name: 'Liz Perez',
    role: 'Project manager',
    image: '/team/liz-perez.png',
    imagePosition: '50% 43%',
    email: 'liz@honeycomb-phenomenon.com',
    bio: [
      'Liz Perez’s personal experiences with the anomalous span the breadth of her life but have been refocused with her more recent research into the phenomenon. As a project manager for a high-end, complex and demanding engineering and construction firm, Liz provides the scaffolding of the Honeycomb project, keeping an eye on the next step and jumping in by making new ideas tangible.',
      'Her involvement in various projects related to the phenomena led her to a central role in Honeycomb and a commitment to disclosure and realizing the goal of making the once-sidelined truth accessible.',
    ],
  },
  {
    name: 'Dane Street',
    role: 'Logic and process analyst',
    image: '/team/dane-street.png',
    fullImage: '/team/dane-street-full.jpg',
    fullPosition: '50% 40%',
    imagePosition: '50% 42%',
    email: 'dane@honeycomb-phenomenon.com',
    bio: [
      'Driven by the idea of aiding connection and expansion of the human story within the phenomenon, Dane Street brings to Honeycomb a passion for shifting the paradigm and creating a platform through which disclosure will happen, not by way of appeals to repeal government secrecy, but by the people and for the people.',
      'Analytical by nature, his skill set as a logic and process analyst directs Dane’s exploration into the unexplainable and the as-yet-unrealized possibilities of human knowledge and understanding. Through population-based disclosure, Dane intends to return the truth to humanity and open the door to our shared history.',
    ],
  },
  {
    name: 'Allen Grabo',
    role: 'Creative Technologist / Web Developer',
    image: '/team/allen-grabo.jpg',
    imagePosition: '50% 38%',
    fullImage: '/team/allen-grabo-full.jpg',
    fullPosition: '50% 50%',
    bio: [
      'A lifelong fascination with the unknown led Allen Grabo to a doctorate in social psychology and a career-long effort to understand consciousness and the mind. With his experience as a creative technologist running his own design company, Allen uses this expansive background to create the various interfaces of Honeycomb, from the website and the recorder people use to share experience, to the security infrastructure used to protect our submissions. For Allen, this work comes down to trust. He is committed to keeping each experiencer’s story in their own hands.',
    ],
  },
  {
    name: 'DJ Stange',
    role: 'Graphic Designer',
    image: '/team/dj-stange.jpg',
    imagePosition: '50% 40%',
    fullImage: '/team/dj-stange-full.jpg',
    fullPosition: '50% 45%',
    bio: [
      'As a foundational creative partner for Honeycomb, DJ Stange brings a wealth of experience in visual storytelling, branding, and design to the project that have helped shape the aesthetic and creative identity of the platform, ensuring it visually resonates with the profound nature of the human experiences it archives. A dedicated creative professional and accomplished musician, he bridges the gap between art and human connection, driven by a passion to help contextualize the anomalous and make these vital stories accessible to the world.',
    ],
  },
];

// Organisations that work alongside Honeycomb, and the people and groups who
// stand with experiencers. Each entry: { name, role, url?, logo? }. An empty
// list renders as a note that the names are still being confirmed.
export const PARTNERS = [];
// shown as initials until each has sent a photo and agreed to its use
export const ADVISORS = [
  { name: 'Karin Austin', role: 'Director, Center for the Impossible at Rice University', url: 'https://profiles.rice.edu/staff/karin-austin' },
  { name: 'Leslie Kean', role: 'Investigative Journalist' },
  { name: 'Andrea Oddo', role: 'Technology and Privacy Advisor' },
  { name: 'Matthew Roberts', role: 'Author and Experiencer' },
];
export const ALLIES = [];

export const ADVISOR_NOTE = 'People who advise Honeycomb on how an archive of lived experience should be kept: with consent, with care, and with the contributor in control.';
