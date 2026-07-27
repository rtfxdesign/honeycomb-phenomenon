import { NextRequest, NextResponse } from "next/server";

// A dictionary mapping phenomenological hashtags to a list of regex patterns.
const tagDictionary: Record<string, RegExp[]> = {
  "MissingTime": [/\blost time\b/i, /\bmissing time\b/i, /\bblacked out\b/i, /\bcouldn'?t remember\b/i, /\btime skipped\b/i, /\bhours went by\b/i],
  "CraftShape": [/\btriangle\b/i, /\bcigar\b/i, /\btic-tac\b/i, /\bsaucer\b/i, /\bdisc\b/i, /\bsphere\b/i, /\bchevron\b/i],
  "SleepParalysis": [/\bparalysis\b/i, /\bcouldn'?t move\b/i, /\bfrozen\b/i, /\bparalyzed\b/i, /\bwoke up unable\b/i],
  "Telepathy": [/\btelepath(y|ic)\b/i, /\bheard (it|a voice) in my head\b/i, /\bvoice in my mind\b/i, /\bspoke into my mind\b/i],
  "LightPhenomenon": [/\borb(s)?\b/i, /\bflash of light\b/i, /\bglowing\b/i, /\bpulsing light\b/i, /\bbeam of light\b/i, /\bstrange light\b/i],
  "EntityEncounter": [/\bentity\b/i, /\bbeing(s)?\b/i, /\bgrey(s)?\b/i, /\btall white(s)?\b/i, /\breptilian(s)?\b/i, /\bfigure(s)?\b/i, /\bshadow person\b/i, /\bhumanoid\b/i],
  "Abduction": [/\babduct(ed|ion)\b/i, /\btaken\b/i, /\bship interior\b/i, /\bmedical table\b/i, /\bexamined\b/i],
  "SoundAnomalies": [/\bhumming\b/i, /\bvibrat(ion|ing)\b/i, /\bdead silent\b/i, /\bsilence\b/i, /\bno sound\b/i, /\blow frequency\b/i, /\bpiercing sound\b/i],
  "PhysicalEffects": [/\bmark(s)? on my body\b/i, /\bscoop mark(s)?\b/i, /\bradiation\b/i, /\bnosebleed(s)?\b/i, /\bsickness\b/i, /\bburn(s)?\b/i, /\bscar(s)?\b/i],
  "Poltergeist": [/\bpoltergeist\b/i, /\bthings moving\b/i, /\bobjects thrown\b/i, /\bfootsteps\b/i, /\bdoor(s)? slam\b/i],
  "Cryptid": [/\bcryptid\b/i, /\bbigfoot\b/i, /\bsasquatch\b/i, /\bdogman\b/i, /\bchupacabra\b/i, /\bmothman\b/i, /\bmonster\b/i],
  "CloseEncounter": [/\bclose encounter\b/i, /\bhappened right in front of\b/i, /\bhovered over\b/i, /\blanded\b/i],
  "UFO": [/\bufo\b/i, /\buap\b/i, /\bflying object\b/i, /\bcraft\b/i, /\bship\b/i]
};

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ tags: [] });
    }

    const matchedTags = new Set<string>();

    // Scan the text against our dictionary
    for (const [tag, patterns] of Object.entries(tagDictionary)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          matchedTags.add(tag);
          break; // Move to the next tag once we find a match for this one
        }
      }
    }

    return NextResponse.json({ tags: Array.from(matchedTags) });
  } catch (error) {
    console.error("Failed to generate tags:", error);
    return NextResponse.json({ tags: [] });
  }
}
