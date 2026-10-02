// Where a story came from. Stories recorded on the site have no source; ones
// that arrive from a partner archive are marked so the comb can frame them in
// that archive's own border. Only these values are accepted by the review API.
export const SOURCES = [
  { value: '', label: 'Contributor, through the site' },
  { value: 'archives-of-the-impossible', label: 'Archives of the Impossible (Rice University)' },
];
export const SOURCE_VALUES = SOURCES.map((s) => s.value);

// How worn a story's gold frame is, from when the experience happened:
// 0 = this decade (clean), 1 = 2000-2019, 2 = 1980-1999, 3 = before 1980.
// No year, or one that does not parse, gets the clean frame.
export function wearForYear(year) {
  const y = parseInt(String(year ?? '').match(/\d{4}/)?.[0] ?? '', 10);
  if (!Number.isFinite(y)) return 0;
  if (y >= 2020) return 0;
  if (y >= 2000) return 1;
  if (y >= 1980) return 2;
  return 3;
}

// The frame a story's cell wears, in order of precedence:
//   Archives of the Impossible  -> 'rice'   (Rice silver and navy)
//   community-only              -> 'bronze' (oxidized bronze; only members see these)
//   everything else             -> the gold, worn by decade: 'story', 'story1'..'story3'
export function frameForStory(exp) {
  if (!exp) return 'story';
  if (exp.source === 'archives-of-the-impossible') return 'rice';
  if (exp.privacy === 'community') return 'bronze';
  const w = wearForYear(exp.experienceYear);
  return w ? `story${w}` : 'story';
}
