// The archive's tag vocabulary: the one list the comb clusters on, the
// tagger proposes from, and the seed stories are drawn from.
//
// Each tag carries a one-line meaning. The AI tagger is given these, so it
// chooses by what a story is about rather than by which words appear in it —
// "to bear witness" is not a second witness, and "being able to" is not a
// being. Keep meanings short and literal.
//
// The "encounter" group was added on 2026-10-21 for accounts the first
// vocabulary had no words for: dreams, voices, messages, consciousness, and
// visitations at home. The seed stories predate it, so the seed fixture
// (scripts/seed-stories.mjs) uses every group but this one.
//
// Plain JS rather than TS so the scripts and tests can import it directly.

export const TAG_GROUPS = {
  phenomenon: {
    orb: 'a ball or point of light, glowing sphere',
    triangle: 'a triangular or chevron-shaped craft',
    disc: 'a disc, saucer or circular craft',
    formation: 'several lights or objects moving together in formation',
    humanoid: 'a non-human being or figure was seen',
    presence: 'an unseen presence was felt, the sense of not being alone',
    apparition: 'something appeared and vanished like a ghost or shadow figure',
  },
  sensory: {
    silent: 'the thing seen made no sound, or everything went silent',
    hum: 'a hum, vibration or low-frequency sound',
    static: 'static or white noise',
    cold: 'cold, a chill, a temperature drop',
    pressure: 'physical pressure in the ears, chest or air',
  },
  effects: {
    'radio-failure': 'a radio cut out or failed',
    'engine-stall': 'a car or engine died or would not start',
    'ground-trace': 'marks, burns or flattened ground left behind',
    'animal-reaction': 'animals reacted: went quiet, bolted, refused',
    electrical: 'power, lights, clocks or instruments were affected',
  },
  setting: {
    highway: 'on a road or while driving',
    farm: 'on a farm, field or pasture',
    water: 'at or over a lake, river or the sea',
    forest: 'in or near woods or forest',
    desert: 'in the desert',
    urban: 'in a city or town',
    coastal: 'at the coast, a beach or harbour',
    mountain: 'in mountains, hills or a valley',
  },
  time: {
    night: 'it happened at night',
    dawn: 'it happened at dawn or early morning',
    daytime: 'it happened in daylight',
    dusk: 'it happened at dusk or in the evening',
    winter: 'it happened in winter, snow or ice',
  },
  witness: {
    family: 'family members were part of the experience',
    children: 'children were present or involved',
    childhood: 'the teller was a child when it happened',
    'multiple-witness': 'more than one person saw it',
    solitary: 'the teller was alone',
    generational: 'experiences passed down or shared across generations',
    military: 'military personnel, a base or service was involved',
  },
  aftermath: {
    'missing-time': 'time was lost or unaccounted for',
    'memory-gap': 'part of the event cannot be remembered',
    'dreams-after': 'recurring dreams about it afterwards',
    drawing: 'the teller drew or sketched what they saw',
    'never-told': 'kept secret, not told to anyone for a long time',
    telepathy: 'communication mind to mind, without speech',
  },
  encounter: {
    dream: 'the experience itself happened in a dream or while asleep',
    voice: 'a voice spoke to the teller, heard or inside the mind',
    message: 'the teller was given a message, lesson or instruction',
    consciousness: 'about consciousness, awakening or a change in awareness',
    visitation: 'beings or a presence came to the teller at home or in the bedroom',
    abduction: 'the teller was taken from where they were',
    examination: 'the teller was examined, scanned or had a procedure done',
    paralysis: 'the teller could not move',
  },
};

/** Every tag in the archive, in group order. */
export const ALL_TAGS = Object.values(TAG_GROUPS).flatMap((g) => Object.keys(g));

/** The groups the seed stories are drawn from: all but "encounter". */
export const SEED_GROUPS = Object.fromEntries(
  Object.entries(TAG_GROUPS).filter(([group]) => group !== 'encounter').map(([group, tags]) => [group, Object.keys(tags)]),
);
