/**
 * Seeds the preview environment with test submissions.
 *
 * Writes into the same R2 bucket as production but under R2_PREFIX (normally
 * "preview/"), so nothing here can reach the live archive. Refuses to run
 * without a prefix for exactly that reason.
 *
 *   R2_PREFIX=preview/ node scripts/seed-preview.mjs          # add seed data
 *   R2_PREFIX=preview/ node scripts/seed-preview.mjs --wipe   # clear it first
 */
import { readFile } from "node:fs/promises";
import {
  S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const PREFIX = process.env.R2_PREFIX || "";
const BUCKET = process.env.R2_BUCKET_NAME;
if (!PREFIX) {
  console.error("Refusing to seed without R2_PREFIX — that would write into the live archive.");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const phys = (k) => `${PREFIX}${k}`;

async function put(logicalKey, body, contentType) {
  await client.send(new PutObjectCommand({
    Bucket: BUCKET, Key: phys(logicalKey), Body: body, ContentType: contentType,
  }));
}

async function wipe() {
  let removed = 0;
  let token;
  do {
    const res = await client.send(new ListObjectsV2Command({
      Bucket: BUCKET, Prefix: PREFIX, ContinuationToken: token,
    }));
    for (const obj of res.Contents || []) {
      await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: obj.Key }));
      removed++;
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  console.log(`wiped ${removed} objects under ${PREFIX}`);
}

// ── the test archive ────────────────────────────────────────────────────────
// Overlapping places, years, and tags on purpose, so search and the gather
// animation have something real to work with.

const STORIES = [
  { name: "Marcy Ruiz", title: "A silent light above the pines", location: "Hudson Valley, NY", year: "1986", type: "Light",
    tags: ["orb", "silent", "hudson-valley", "childhood"], portrait: true,
    text: "It held perfectly still over the treeline, then moved without crossing the space between. No sound at all — that is the part I have never been able to explain to anyone. My brother saw it too and we did not speak about it for thirty years." },
  { name: "Jonah Ellery", title: "Three points over the water", location: "Lake Erie, OH", year: "2004", type: "Craft",
    tags: ["triangle", "water", "lake-erie", "formation"], portrait: true,
    text: "The lights formed a triangle but the stars disappeared behind it, which is how I knew it was one solid object and not three separate craft. It drifted west across the lake for maybe four minutes and then simply was not there." },
  { name: "Ana Whitfield", title: "The morning after", location: "Sedona, AZ", year: "2018", type: "Dream",
    tags: ["dream", "sedona", "consciousness", "memory"],
    text: "I woke with a memory that felt more like a place I had visited than anything my mind invented. There was a room with no corners and someone patiently waiting for me to understand something. I have never had a dream leave that kind of residue." },
  { name: "Dell Emerson", title: "No sound on the county road", location: "Taos, NM", year: "1997", type: "Craft",
    tags: ["new-mexico", "radio-failure", "highway", "silent"], portrait: true,
    text: "My radio cut out before the glow appeared over the ridge. The truck kept running but every electrical thing in it went dead quiet. When the light passed the radio came back mid-song like nothing had happened." },
  { name: "Kit Sorenson", title: "A shape inside the cloud", location: "Portland, OR", year: "2021", type: "Other",
    tags: ["cloud", "portland", "daytime", "shape"],
    text: "The cloud changed around something that never became fully visible. You could see the edge of it by what the vapor did — the way you can see wind by what it moves. It stayed maybe twenty minutes." },
  { name: "Rosa Calder", title: "My grandmother saw it too", location: "Marfa, TX", year: "1973", type: "Light",
    tags: ["marfa", "texas", "family", "orb", "generational"], portrait: true,
    text: "We never spoke about it until thirty years later, and when we finally did our details matched exactly — the color, the way it split, the direction it went. That was harder to sit with than the sighting itself." },
  { name: "Priya Anand", title: "Eleven minutes missing", location: "Allagash, ME", year: "1992", type: "Presence",
    tags: ["missing-time", "maine", "camping", "night"],
    text: "The clock was the first thing that told us the evening had changed. Four of us, four watches, eleven minutes gone from all of them. We were standing in the same place we had been standing, holding the same gear." },
  { name: "Tendai Ncube", title: "Over the schoolyard", location: "Ariel, Zimbabwe", year: "1994", type: "Presence",
    tags: ["zimbabwe", "children", "school", "presence", "telepathy"], portrait: true,
    text: "What stayed with me was not fear. It was the feeling of being seen, completely, by something that already knew what it was looking at. Sixty of us were in that yard and no two accounts disagree about that part." },
  { name: "Vince Corado", title: "The object that became two", location: "Chicago, IL", year: "2015", type: "Light",
    tags: ["chicago", "split", "orb", "urban"],
    text: "It divided cleanly and the two lights left in opposite directions at a speed I have no reference for. I called the tower at Midway the next morning and the man who answered was very careful about what he would and would not say." },
  { name: "Bett Halloran", title: "Red glow beyond the orchard", location: "Yakima, WA", year: "1969", type: "Craft",
    tags: ["yakima", "orchard", "red", "childhood", "family"],
    text: "My father told me not to look. He watched until it was gone and then went inside and did not come back out that night. He never once mentioned it again and I never once asked." },
  { name: "Lou Whitmore", title: "A pressure in the room", location: "Kansas City, MO", year: "2026", type: "Presence",
    tags: ["presence", "missouri", "sleep", "pressure"], portrait: true,
    text: "I could hear the house, but every familiar sound seemed to be arriving from much further away than it should have. The air had weight to it. It lasted about ninety seconds and then everything was ordinary again." },
  { name: "Gita Raman", title: "Daylight over the interstate", location: "Tampa, FL", year: "2023", type: "Other",
    tags: ["florida", "daytime", "highway", "traffic"],
    text: "Hundreds of cars kept moving. I still wonder who else looked up and decided not to say anything, because that is exactly what I did for two years." },
  { name: "Ray Petrossian", title: "The hum under the field", location: "Ludlow, VT", year: "2011", type: "Other",
    tags: ["sound", "vermont", "hum", "ground"],
    text: "It came up through the soles of my boots before I heard it. Low enough that I felt it in my teeth. The cattle in the next field were all facing the same direction, completely still." },
  { name: "Nell Okonjo", title: "Something walked the fence line", location: "Boulder, CO", year: "2008", type: "Presence",
    tags: ["colorado", "night", "presence", "animals"], portrait: true, privacy: "community",
    text: "The dogs would not go past the gate. Whatever moved along that fence had a rhythm to it that was not a person and was not a deer, and it stopped every time I stopped." },
  { name: "Sam Ferreira", title: "The lights that answered", location: "Alentejo, Portugal", year: "1999", type: "Light",
    tags: ["portugal", "orb", "response", "flashlight"],
    text: "I flashed my torch twice, mostly as a joke. It flashed twice back. I did three, it did three. I stopped after that because my hands were shaking too much to hold the torch straight." },
  { name: "Iris Delgado", title: "Above the container port", location: "Long Beach, CA", year: "2019", type: "Craft",
    tags: ["california", "port", "night-shift", "craft"],
    text: "Four of us on the night shift watched it sit over stack nine for most of an hour. The cranes kept running. Nobody filed anything because nobody wanted to be the one who filed it." },
  { name: "Owen Brackley", title: "The road that repeated", location: "Bodmin Moor, UK", year: "1988", type: "Dream",
    tags: ["uk", "missing-time", "road", "loop"], portrait: true,
    text: "I passed the same stone wall and the same gate four times driving in a straight line. When I finally came out the other side the sky had changed from dusk to full dark in what felt like six minutes." },
  { name: "Hana Kimura", title: "Snow that fell upward", location: "Hokkaido, Japan", year: "2013", type: "Other",
    tags: ["japan", "snow", "gravity", "winter"],
    text: "For about ten seconds the snow in one specific area moved up instead of down. Only in that area. The snow around it fell normally, which somehow made it worse." },
  { name: "Ford Mabry", title: "Static on every channel", location: "Bowling Green, KY", year: "1977", type: "Craft",
    tags: ["kentucky", "radio-failure", "static", "farm"],
    text: "Every radio and both televisions went to static at the same moment. My mother started unplugging things. Out the kitchen window there was a light sitting over the south field, and it stayed until the power came back." },
  { name: "Zadie Iverson", title: "The visitor my daughter drew", location: "Asheville, NC", year: "2020", type: "Presence",
    tags: ["children", "north-carolina", "drawing", "presence"], privacy: "community",
    text: "She was four. She drew the same figure eleven times over two weeks and described it the same way every time, using words she did not have any other reason to know." },
  { name: "Cal Mendez", title: "Formation over the Gulf", location: "Corpus Christi, TX", year: "2005", type: "Craft",
    tags: ["texas", "formation", "gulf", "military"], portrait: true,
    text: "Nine lights in a perfect arc, holding station against a strong wind. I was Navy for eleven years and I know what our aircraft do at night. This was not that." },
  { name: "Wren Ashby", title: "Missing hours on the drive home", location: "Flagstaff, AZ", year: "2001", type: "Dream",
    tags: ["arizona", "missing-time", "highway", "night"],
    text: "Ninety minutes of road I cannot account for and a full tank that had gone to a quarter. I have driven that route two hundred times before and since without anything close to it happening again." },
  { name: "Milo Trent", title: "It watched the storm with me", location: "Lincoln, NE", year: "2016", type: "Light",
    tags: ["nebraska", "storm", "orb", "weather"],
    text: "It held position inside the cell, completely steady while everything around it was violent. The lightning went around it — not through it, around it." },
  { name: "Odile Fontaine", title: "The field where nothing grew", location: "Beauce, France", year: "1996", type: "Other",
    tags: ["france", "ground-trace", "farm", "physical-effects"],
    text: "A ring nine metres across where the wheat lay flat in a spiral and nothing would grow the following season. The soil tested normal. My grandfather ploughed it under and refused to discuss it." },
];

const PENDING = [
  { name: "Test Submitter", title: "Something over the ridge line", location: "Ogden, UT", year: "2024", type: "Light",
    tags: ["utah", "orb", "pending-test"], privacy: "public",
    text: "This is a pending test submission — it should appear in the review queue and nowhere on the public site until it is approved." },
  { name: "Anonymous", title: "Lights while driving north", location: "Bangor, ME", year: "2022", type: "Craft",
    tags: ["maine", "highway", "pending-test"], privacy: "community",
    text: "A second pending test submission, marked community-only, to check that the privacy control survives the approve step." },
  { name: "Quiet Voice", title: "A record I do not want shown", location: "Withheld", year: "1991", type: "Presence",
    tags: ["pending-test", "private"], privacy: "archive",
    text: "A pending test submission marked strictly archived — after approval it should be preserved but must never appear as a cell in the honeycomb." },
];

// Procedural portraits: warm abstract plates, clearly placeholders rather than
// invented faces, so the photo path is exercised honestly.
function portraitSvg(seedIndex) {
  // amber range only — these sit among real portraits and must not fight the
  // warm palette; deliberately abstract rather than an invented face
  const hue = 26 + ((seedIndex * 13) % 14);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <radialGradient id="g" cx="50%" cy="34%" r="76%">
      <stop offset="0%" stop-color="hsl(${hue + 8},62%,46%)"/>
      <stop offset="52%" stop-color="hsl(${hue},52%,26%)"/>
      <stop offset="100%" stop-color="hsl(${hue - 8},46%,10%)"/>
    </radialGradient>
  </defs>
  <rect width="600" height="600" fill="url(#g)"/>
  <circle cx="300" cy="238" r="92" fill="rgba(255,206,132,0.20)"/>
  <path d="M300 352c102 0 166 66 180 158H120c14-92 78-158 180-158z" fill="rgba(255,206,132,0.20)"/>
</svg>`;
}

const initialsOf = (name) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

async function seed() {
  const stamp = Date.parse("2026-08-25T12:00:00Z");
  let n = 0;

  // one real video and one real audio file so the players can be exercised
  let videoKey = null;
  try {
    const video = await readFile(new URL("../public/videos/john-berg.mp4", import.meta.url));
    videoKey = "approved/video/seed-account.mp4";
    await put(videoKey, video, "video/mp4");
    console.log("uploaded seed video");
  } catch {
    console.log("no seed video available — skipping");
  }

  for (const [i, s] of STORIES.entries()) {
    const id = `sub_${stamp + i * 1000}`;
    let photoKey;
    if (s.portrait) {
      photoKey = `approved/image/${id}-portrait.svg`;
      await put(photoKey, portraitSvg(i), "image/svg+xml");
    }
    const useVideo = videoKey && i === 0;
    const record = {
      id,
      title: s.title,
      displayName: s.name,
      location: s.location,
      experienceYear: s.year,
      experienceType: s.type,
      transcript: s.text,
      privacy: s.privacy || "public",
      recordingMode: useVideo ? "video" : "text",
      hashtags: s.tags,
      mediaKey: useVideo ? videoKey : undefined,
      photoKey,
      submittedAt: new Date(stamp + i * 1000).toISOString(),
      approvedAt: new Date(stamp + i * 1000 + 500).toISOString(),
      status: "approved",
      seed: true,
    };
    await put(`approved/submissions/${id}.json`, JSON.stringify(record, null, 2), "application/json");
    n++;
  }

  for (const [i, s] of PENDING.entries()) {
    const id = `sub_${stamp + 900000 + i * 1000}`;
    const record = {
      id,
      title: s.title,
      displayName: s.name,
      location: s.location,
      experienceYear: s.year,
      experienceType: s.type,
      transcript: s.text,
      privacy: s.privacy,
      recordingMode: "text",
      hashtags: s.tags,
      submittedAt: new Date(stamp + 900000 + i * 1000).toISOString(),
      status: "pending",
      seed: true,
    };
    await put(`submissions/${id}.json`, JSON.stringify(record, null, 2), "application/json");
    n++;
  }

  console.log(`seeded ${n} records under ${PREFIX} (${STORIES.length} approved, ${PENDING.length} pending)`);
}

if (process.argv.includes("--wipe")) await wipe();
await seed();
