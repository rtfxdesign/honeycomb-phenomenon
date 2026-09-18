// How a contributor's name is stored and shown.
//
// The recorder collects first and last name separately and asks how much of
// it to show. Both are kept: the raw parts so the choice can be changed later
// without asking again, and the rendered displayName so the rest of the site
// (cells, panel, search, the review dashboard) keeps reading one field.
//
// Plain JS rather than TS so the tests can import it directly.

export const NAME_DISPLAY_OPTIONS = [
  ["full", "Full name", "Jane Doe"],
  ["first-initial", "First name and last initial", "Jane D."],
  ["initials", "Initials only", "J.D."],
];

export const NAME_DISPLAY_LEVELS = NAME_DISPLAY_OPTIONS.map(([v]) => v);

const clean = (s) => String(s ?? "").trim().replace(/\s+/g, " ");
const initial = (s) => (s ? `${s[0].toUpperCase()}.` : "");

/** Render first + last according to the chosen display level. Blank names give "". */
export function formatDisplayName(firstName, lastName, level = "full") {
  const first = clean(firstName);
  const last = clean(lastName);
  if (!first && !last) return "";
  switch (level) {
    case "initials":
      return `${initial(first)}${initial(last)}`;
    case "first-initial":
      if (!first) return initial(last);
      return last ? `${first} ${initial(last)}` : first;
    default:
      return `${first} ${last}`.trim();
  }
}

/**
 * What a cell is labelled with: the name as the contributor chose to show it,
 * else their place, else the title. The display level only governs how the
 * name renders, never which field is used.
 */
export function cellLabel(exp) {
  if (!exp) return "";
  const name = exp.displayName || formatDisplayName(exp.firstName, exp.lastName, exp.nameDisplay);
  return clean(name) || clean(exp.location) || clean(exp.title) || "";
}

/** Two-letter mark for a cell with no portrait. "J.D." → "JD", "Hudson Valley, NY" → "HV". */
export function initialsOf(label) {
  const words = clean(label).replace(/[.,]/g, " ").split(" ").filter(Boolean);
  if (!words.length) return "";
  const letters = words.slice(0, 2).map((w) => w[0]);
  return letters.join("").toUpperCase();
}
