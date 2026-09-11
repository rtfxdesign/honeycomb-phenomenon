import { NextRequest, NextResponse } from "next/server";

/**
 * Suggests tags for a submission by scanning its text.
 *
 * The vocabulary here is deliberately the same lowercase, hyphenated set the
 * comb clusters on. It used to emit CamelCase labels of its own ("MissingTime",
 * "CraftShape"), which read fine on a card and were useless everywhere else:
 * clustering relates two voices by shared tags, so an auto-tagged submission
 * carrying "LightPhenomenon" would never gather with a story tagged "orb". Two
 * vocabularies meant auto-tagged records quietly sat alone in the field.
 *
 * Keep this list in step with TAG_VOCABULARY in scripts/seed-stories.mjs.
 */
const tagDictionary: Record<string, RegExp[]> = {
  // phenomenon
  // People almost never write "orb" — they write "a light". The patterns have
  // to catch the phrasing rather than the label, but stay tight enough that
  // every account mentioning headlights does not become an orb sighting.
  orb: [/\borb(s)?\b/i, /\bball of light\b/i, /\bglowing sphere\b/i, /\bpoint of light\b/i, /\bstrange light\b/i, /\ba light (came|held|moved|appeared|rested|travelled|traveled)\b/i, /\bthe light (was|moved|went|passed|came|held)\b/i, /\blight(s)? (over|above|in the sky|off the)\b/i, /\bgreen light\b/i, /\bglow\b/i],
  triangle: [/\btriangle\b/i, /\btriangular\b/i, /\bchevron\b/i, /\bthree points\b/i],
  disc: [/\bdisc\b/i, /\bdisk\b/i, /\bsaucer\b/i, /\bcircular craft\b/i],
  formation: [/\bformation\b/i, /\bin a line\b/i, /\bheld (its |their )?spacing\b/i, /\bin sequence\b/i],
  humanoid: [/\bhumanoid\b/i, /\bfigure(s)?\b/i, /\bbeing(s)?\b/i, /\btall (and )?thin\b/i, /\bentity\b/i],
  presence: [/\bpresence\b/i, /\bsomething (was )?in the room\b/i, /\bbeing watched\b/i, /\bnot alone\b/i, /\battended to\b/i, /\bsomeone (was )?waiting\b/i, /\bcompany\b/i, /\bin the room\b/i, /\bfelt (it|something)\b/i],
  apparition: [/\bapparition\b/i, /\bghost\b/i, /\bshadow person\b/i, /\bthen (it|there) was not\b/i],

  // sensory
  silent: [/\bsilent\b/i, /\bno sound\b/i, /\bdead quiet\b/i, /\bmade no sound\b/i, /\bsilence\b/i, /\bwent quiet\b/i, /\bnot a sound\b/i, /\bwithout (a )?(sound|noise)\b/i, /\bnothing (was )?audible\b/i],
  hum: [/\bhum(ming)?\b/i, /\blow frequency\b/i, /\bvibrat(ion|ing)\b/i, /\bthrough the (floor|ground)\b/i],
  static: [/\bstatic\b/i, /\bwhite noise\b/i, /\bevery channel\b/i],
  cold: [/\bcold\b/i, /\bcold spot\b/i, /\btemperature drop(ped)?\b/i, /\bchill\b/i],
  pressure: [/\bpressure\b/i, /\bin (my|the) ears\b/i, /\bchest felt\b/i, /\bheav(y|iness) in the air\b/i],

  // effects
  "radio-failure": [/\bradio (cut|went|failed|died)\b/i, /\blost the radio\b/i, /\bradio was (dead|useless)\b/i],
  "engine-stall": [/\bengine (died|cut|stalled|stopped)\b/i, /\bcar (died|cut out|stopped)\b/i, /\bwould not start\b/i],
  "ground-trace": [/\bground trace\b/i, /\bring in the\b/i, /\bflattened\b/i, /\bscorch(ed)?\b/i, /\bpressed into the\b/i, /\bmarks? on the ground\b/i],
  "animal-reaction": [/\b(dog|dogs|horse|horses|cattle|animals|deer|birds)\b.{0,40}\b(quiet|still|would not|refused|bolted|panicked)\b/i, /\banimals went (quiet|silent)\b/i],
  electrical: [/\bevery clock\b/i, /\bpower (went|cut|failed)\b/i, /\blights flickered\b/i, /\bcompass\b/i, /\binstruments\b/i, /\belectrical\b/i],

  // setting
  highway: [/\bhighway\b/i, /\bfreeway\b/i, /\binterstate\b/i, /\bcounty road\b/i, /\bdriving\b/i, /\bthe road\b/i],
  farm: [/\bfarm\b/i, /\bbarn\b/i, /\bpaddock\b/i, /\bfield\b/i, /\bwheat\b/i, /\borchard\b/i, /\bpasture\b/i],
  water: [/\blake\b/i, /\briver\b/i, /\bsea\b/i, /\bocean\b/i, /\bharbour\b/i, /\bharbor\b/i, /\bwater\b/i, /\bquarry\b/i],
  forest: [/\bforest\b/i, /\bwoods\b/i, /\btreeline\b/i, /\bpines\b/i, /\btrees\b/i],
  desert: [/\bdesert\b/i, /\bmesa\b/i, /\barroyo\b/i, /\bsagebrush\b/i, /\bdust\b/i],
  urban: [/\bcity\b/i, /\bdowntown\b/i, /\bapartment\b/i, /\bstreet\b/i, /\boverpass\b/i, /\bplant\b/i],
  coastal: [/\bcoast\b/i, /\bshore\b/i, /\bbeach\b/i, /\bpier\b/i, /\bdock\b/i, /\bferry\b/i],
  mountain: [/\bmountain\b/i, /\bridge\b/i, /\bvalley\b/i, /\bmoor\b/i, /\bhillside\b/i, /\bhill\b/i],

  // time
  night: [/\bnight\b/i, /\bmidnight\b/i, /\bsmall hours\b/i, /\bafter dark\b/i, /\bstars\b/i],
  dawn: [/\bdawn\b/i, /\bfirst light\b/i, /\bsunrise\b/i, /\bearly morning\b/i],
  daytime: [/\bmidday\b/i, /\bafternoon\b/i, /\bbroad daylight\b/i, /\bmid-?morning\b/i, /\bdaylight\b/i, /\bbright\b/i, /\blate morning\b/i, /\bin full day\b/i, /\bat noon\b/i],
  dusk: [/\bdusk\b/i, /\btwilight\b/i, /\bsunset\b/i, /\bevening\b/i],
  winter: [/\bwinter\b/i, /\bsnow\b/i, /\bice\b/i, /\bfrozen\b/i],

  // witness
  family: [/\bmy (mother|father|brother|sister|wife|husband|son|daughter|grandmother|grandfather)\b/i, /\bfamily\b/i],
  children: [/\bchild(ren)?\b/i, /\bkids?\b/i, /\bschoolyard\b/i, /\bmy son\b/i, /\bmy daughter\b/i],
  childhood: [/\bwhen I was (a child|young|\d{1,2})\b/i, /\bas a (child|kid|boy|girl)\b/i, /\bchildhood\b/i],
  "multiple-witness": [/\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|several|many) of us\b/i, /\bwe all saw\b/i, /\bwitness(es)?\b/i, /\beveryone saw\b/i, /\bthere were \w+ of us\b/i, /\ball (three|four|five|six) \b/i, /\bnone of us\b/i, /\bwe (stood|watched|stopped|agreed)\b/i],
  solitary: [/\bI was alone\b/i, /\bby myself\b/i, /\bon my own\b/i, /\bnobody else (was|saw)\b/i, /\balone in\b/i, /\bI stood there\b/i, /\bI was (outside|out|driving|working)\b/i],
  generational: [/\bmy grandmother\b/i, /\bher mother had\b/i, /\bthree generations\b/i, /\bhad told me\b/i, /\bpassed down\b/i],
  military: [/\bmilitary\b/i, /\bair force\b/i, /\bbase\b/i, /\bserved\b/i, /\bservice\b/i, /\blogbook\b/i],

  // aftermath
  "missing-time": [/\bmissing time\b/i, /\blost time\b/i, /\bminutes? (missing|unaccounted)\b/i, /\btime skipped\b/i, /\bhours went by\b/i],
  "memory-gap": [/\bcould ?n'?o?t remember\b/i, /\bblacked out\b/i, /\bno memory of\b/i, /\bthere is a gap\b/i],
  "dreams-after": [/\bdream(t|ed|s)? (about|of)\b/i, /\brecurring dream\b/i, /\bfor (about )?a year afterwards\b/i],
  drawing: [/\bdrew it\b/i, /\bdrawing(s)?\b/i, /\bsketch(ed)?\b/i, /\bon paper\b/i],
  "never-told": [/\bnever (told|spoke|said|reported)\b/i, /\bdid not (speak|talk) about it\b/i, /\bkept (it )?quiet\b/i, /\bfor thirty years\b/i, /\bnever mentioned\b/i, /\bnot (a word|one word)\b/i, /\bnever shown\b/i, /\bin a drawer\b/i, /\btold (nobody|no one)\b/i, /\bstayed quiet\b/i],
  telepathy: [/\btelepath(y|ic)\b/i, /\bin my head\b/i, /\bvoice in my mind\b/i, /\bwithout speaking\b/i, /\bit told me\b/i],
};

// The tags this endpoint can produce are the same set the comb clusters on.
// Not exported: a Next route module may only export handlers and route config,
// and anything else fails the build's type check. scripts/check-autotag.mjs
// reads the dictionary out of this file directly instead.

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ tags: [] });
    }

    const matched = new Set<string>();

    for (const [tag, patterns] of Object.entries(tagDictionary)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          matched.add(tag);
          break;
        }
      }
    }

    // A submission tagged with everything is tagged with nothing: a tag that
    // lands on most of the archive cannot distinguish one voice from another,
    // and the comb would gather at random. Long accounts trip many patterns,
    // so the suggestion set is capped and the moderator adds any that matter.
    const tags = Array.from(matched).slice(0, 8);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Failed to generate tags:", error);
    return NextResponse.json({ tags: [] });
  }
}
