/**
 * The approved token values as data — single TS source for the settings
 * drawer (defaults / reset / Copy CSS) and the contrast test.
 *
 * MUST match the :root block of src/styles/tokens.css (the shipped source of
 * truth, from design/tokens.html approved 2026-07-30). test/contrast.test.ts
 * fails if the two drift apart.
 *
 * The 18 keys and their order mirror the token sheet's tweakable list.
 */
export const TOKEN_COLORS: Record<string, string> = {
  night: "#232025",
  "night-raise": "#2d2930",
  cream: "#f3ebd7",
  paper: "#f7f1e2",
  "cream-edge": "#e4d5b4",
  ink: "#382c1e",
  muted: "#6e6149",
  milk: "#ede6d6",
  gold: "#e3b26a",
  amber: "#ce8f45",
  forest: "#4e6b4f",
  "forest-deep": "#33492f",
  sage: "#90a67c",
  dusk: "#6e8794",
  "dusk-deep": "#435966",
  clay: "#a34a34",
  teal: "#2e4e48",
  blossom: "#a8626d",
};

export const TOKEN_NAMES = Object.keys(TOKEN_COLORS);

/** drawer defaults for the two non-color tokens */
export const BASE_TEXT_PX = 16;
export const CARD_RADIUS_PX = 12;
