// Where a story came from. Stories recorded on the site have no source; ones
// that arrive from a partner archive are marked so the comb can frame them in
// that archive's own border. Only these values are accepted by the review API.
export const SOURCES = [
  { value: '', label: 'Contributor, through the site' },
  { value: 'archives-of-the-impossible', label: 'Archives of the Impossible (Rice University)' },
];
export const SOURCE_VALUES = SOURCES.map((s) => s.value);

// the cell frame a story wears: Rice silver and navy for Archives of the
// Impossible, the quieter gold for everything else
export const frameForStory = (exp) => (exp && exp.source === 'archives-of-the-impossible' ? 'rice' : 'story');
