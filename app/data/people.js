// One entry per bright-cell face in the archive field.
// `about` renders in the story panel today; drop a video file into
// /public/videos and set `video: '/videos/<file>.mp4'` to replace it
// with that person's submission recording.

const PLACEHOLDER = [
  'This cell holds a member of the Honeycomb community. Their recorded experience is being prepared for the archive.',
  'Every experience is treated as a point of light within a shared history — one person at a time, one experience at a time.',
];

export const PEOPLE = [
  { key: 'Cydney_B', name: 'Cydney', video: null, about: PLACEHOLDER },
  { key: 'Doug_V', name: 'Doug', video: null, about: PLACEHOLDER },
  { key: 'Finn_S', name: 'Finn', video: null, about: PLACEHOLDER },
  { key: 'George_K', name: 'George Kendle', video: null, about: PLACEHOLDER },
  { key: 'Jorge_L', name: 'Jorge', video: null, about: PLACEHOLDER },
  {
    key: 'Liz_P',
    name: 'Liz Perez',
    video: null,
    about: [
      'Liz Perez’s personal experiences with the anomalous span the breadth of her life but have been refocused with her more recent research into the phenomenon.',
      'As a project manager for a high-end, complex and demanding engineering and construction firm, Liz provides the scaffolding of the Honeycomb project, keeping an eye on the next step and jumping in by making new ideas tangible. Her involvement in various projects related to the phenomena led her to a central role in Honeycomb and a commitment to disclosure and realizing the goal of making the once-sidelined truth accessible.',
    ],
  },
  {
    key: 'Liz_P2',
    name: 'Liz Perez',
    video: null,
    about: [
      'Liz Perez’s personal experiences with the anomalous span the breadth of her life but have been refocused with her more recent research into the phenomenon.',
      'As a project manager for a high-end, complex and demanding engineering and construction firm, Liz provides the scaffolding of the Honeycomb project, keeping an eye on the next step and jumping in by making new ideas tangible. Her involvement in various projects related to the phenomena led her to a central role in Honeycomb and a commitment to disclosure and realizing the goal of making the once-sidelined truth accessible.',
    ],
  },
  { key: 'Lucy_D', name: 'Lucy', video: null, about: PLACEHOLDER },
  { key: 'Mark_W', name: 'Mark', video: null, about: PLACEHOLDER },
  { key: 'Neil_F', name: 'Neil', video: null, about: PLACEHOLDER },
  { key: 'Paul_B', name: 'Paul', video: null, about: PLACEHOLDER },
  {
    key: 'Paul_W1',
    name: 'Paul Werenko',
    video: null,
    about: [
      'Paul Werenko is the visionary behind Honeycomb. Following a lifetime of personal anomalous experiences which he previously dismissed as coincidences, Paul’s comprehension of the phenomenon began to shift, thanks in no small part to Leslie Kean’s 2017 NYT article and subsequent disclosures from trusted individuals.',
      'He has since dedicated his time and effort to numerous projects and organizations to assist in the education of all in the phenomena and their impact on humanity. Honeycomb is just one of those projects that is today his life’s work but it has become his flagship vision.',
      'Alongside his handpicked team and with the tireless support of well-known members of the UAP Community including journalists, pilots, and Experiencers, Paul and his team are committed to providing a platform where every individual in the world is able to share their story.',
    ],
  },
  { key: 'Pricilla_S', name: 'Pricilla', video: null, about: PLACEHOLDER },
  { key: 'Ramiro_G', name: 'Ramiro', video: null, about: PLACEHOLDER },
  { key: 'Stuart_W', name: 'Stuart', video: null, about: PLACEHOLDER },
  { key: 'Walter_P', name: 'Walter P', video: null, about: PLACEHOLDER },
  { key: 'Zandra_W', name: 'Zandra', video: null, about: PLACEHOLDER },
];

export const FACES = PEOPLE.map((p) => ({
  src: '/uploads/' + p.key + '.webp',
  name: p.name,
  person: p,
}));
