// The word ceilings, and the convention for counting against them.
//
// SOURCE OF TRUTH: ProjectOS/game-project/tools/line-lint.mjs, the linter that enforces
// these same numbers on committed content (1138 slots, clean). These are copied verbatim
// so this folder runs standalone. Two copies of a ceiling is how they drift, so the copy
// is declared here rather than made quietly — if line-lint changes, this changes with it.
//
// The numbers themselves come from narrative-pipeline/register.md, which set them against
// a measured 4,735-turn corpus: median turn 5-7 words, a long run begins around 26.

export const CEILING = { dialogue: 40, action: 60, object: 60, player_line: 12 }
export const LONG_RUN = 75

// The counting convention, ruled 2026-08-11 by Roc. See
// narrative-pipeline/templates/line-file-schema.md § The counting convention.
//   1. the **[action]** render marker does not count
//   2. square brackets do not count; the words inside them do
//   3. a contraction is one word — apostrophes stay glued, so no extra splitting
export const countWords = (cell) =>
  cell
    .replace(/\*\*\[action\]\*\*/g, ' ')
    .replace(/\*\*MARKED LONG RUN\.\*\*/g, ' ')
    .replace(/[[\]]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length
