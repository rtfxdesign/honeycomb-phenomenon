// The two bands of text a moderator can put on a cell (top and bottom edge
// of the portrait). The comb's CellStamp shrinks the type to fit the band;
// these numbers are shared with /review so it can say, while a label is
// typed, whether it will fit.
//
//   px / minPx        set at 11px; shrinks no further than 7px
//   tracking          .14em letter-spacing, dropped to .04em before shrinking
//   desktop / phone   usable width of a band in px, at the face widths the
//                     comb draws (127px and 100px): the hexagon is half as
//                     wide at its flat edges, less a little margin
export const STAMP_FIT = { px: 11, minPx: 7, tracking: 0.14, tightTracking: 0.04, desktop: 65, phone: 51 };
