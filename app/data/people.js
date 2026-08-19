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
  {
    key: 'John_B',
    name: 'John Berg',
    video: '/videos/john-berg.mp4',
    about: [
      'Hi, my name is John Berg and I am reporting an instance of witnessing a UAP. This had to have been around 2015 when I was working at the US State Department and I was leaving work. So it was after 5 p.m. in Washington DC and I don’t remember the exact streets, the cross streets I was at, but it was maybe K and 17 maybe in any case, you know, it was after work, so the sidewalks were pretty full with other people who had just gotten off work, and I happened to glance up into the sky and sort of in the direction of sort of the Potomac River, maybe around the Georgetown University area, like in the sky. I noticed the white orb. I would guess that this thing was probably about the size of a sedan, and that the elevation may have been around 1000ft, no lower than that, maybe 5 to 700ft high. But I noticed in the sky as I glanced towards the horizon above the edge of the buildings, and I just sort of stopped and stared at it for a while, and I kept thinking, I should take a picture of this. I should take a picture of this. But I didn’t because I was kind of transfixed.',
      'I’d look away and glance up and down the street to see if anybody else on the sidewalks had noticed, and nobody was taking any notice that glanced back up. It was still there, it just hovering, stationary. And it wasn’t a balloon because it wasn’t drifting. It was like dead in the sky. I wasn’t the planet. It was clearly an orb because the sun was up and it was shining on the orb.',
      'And the orb had a side that was reflecting the sunlight and the side that was dark. You know, that the sun was shining on. So I knew it was a circular white orb, and I was headed somewhere, I think, meeting some friends for a happy hour or something. And I was about to be running late, so I stopped staring at this thing, but it was very transfixing.',
      'And that was my first UAP UFO witness account. Thank you.',
    ],
  },
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
