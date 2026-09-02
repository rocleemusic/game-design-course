// gen-personas.mjs — derives fixtures/personas.json from ../../cast/*.md.
//
// GP-63 (2026-08-02): fixtures/personas.json is GENERATED, never hand-edited.
// The canonical source for authored souls is game-project/cast/ — one
// markdown persona card per soul (verbatim copies of the human-gated
// pipeline-runs cards, provenance noted at the top of each file). This
// script parses each card's essence/trait_axes/voice_register/role tables
// into the PersonaCard shape (src/lib/personaCard.ts) and writes the
// fixture.
//
// PLACEHOLDERS: unauthored souls kept in the fixture until a real cast/<soul>.md
// exists; an entry is deleted once its card lands. `finch` was removed 2026-08-09
// (Roc) — it was a fixture-only soul with no counterpart in the narrative content,
// and it was being emitted into the live project's personas.json as a real soul.
// `mara` remains only as a dead entry: her card exists, so the guard below skips it.
//
// Run:   npm run gen:personas        (from tools/lantern)
// Test:  test/personasFixture.test.ts fails if the fixture is stale.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CAST_DIR = path.resolve(HERE, "../../../cast");
export const FIXTURE = path.resolve(HERE, "../fixtures/personas.json");

/** Unauthored souls preserved in the fixture until a cast/ card exists. */
const PLACEHOLDERS = {
  mara: {
    soul_id: "mara",
    authored: false,
    note:
      "No persona card has been authored for Mara (the Keeper) yet — only the arc doc's one-line arc spine exists (see CastPanel's arc-progress section). Fields below are placeholder, not narrative canon.",
    essence: {
      essence_descriptor: "(placeholder — not yet authored)",
      trait_axes: {},
      voice_register: "(placeholder)",
      conviction: "(placeholder)",
      backstory_guideline: "(placeholder)",
      notice_and_want: "(placeholder)",
    },
    role: { role_tag: "keeper", age_band: "(placeholder)" },
  },
};

/** Strip light markdown (bold, code ticks) from a table cell. */
function clean(s) {
  return s.replace(/\*\*/g, "").replace(/`/g, "").trim();
}

/** All `| field | value |` rows in the doc as a map (first win per key). */
function tableFields(md) {
  const out = {};
  for (const line of md.split("\n")) {
    const m = line.match(/^\|\s*`?([a-z_]+)`?\s*\|(.+)\|\s*$/);
    if (m && !(m[1] in out)) out[m[1]] = clean(m[2]);
  }
  return out;
}

/** trait_axes table: rows between the trait_axes heading and the next ###. */
function traitAxes(md) {
  const section = md.split(/###\s+`trait_axes`[^\n]*\n/)[1]?.split(/\n###\s/)[0] ?? "";
  const axes = {};
  for (const key of ["deflection_target", "precision_profile", "warmth_channel"]) {
    const m = section.match(new RegExp("^\\|\\s*`?" + key + "`?\\s*\\|(.+)\\|\\s*$", "m"));
    if (m) axes[key] = clean(m[1]);
  }
  return axes;
}

/** voice_register: the first blockquote after the voice_register heading. */
function voiceRegister(md) {
  const section = md.split(/###\s+`voice_register`\s*\n/)[1] ?? "";
  const m = section.match(/^>\s*(.+)$/m);
  return m ? clean(m[1]) : undefined;
}

function parseCard(md) {
  const f = tableFields(md);
  const exceptions =
    f.authored_exceptions && !/^null\b/.test(f.authored_exceptions)
      ? f.authored_exceptions
      : undefined;
  const card = {
    soul_id: f.npc_id,
    authored: true,
    essence: {
      primal_seed: f.primal_seed,
      essence_descriptor: f.essence_descriptor,
      trait_axes: traitAxes(md),
      voice_register: voiceRegister(md),
      conviction: f.conviction,
      backstory_guideline: f.backstory_guideline,
      notice_and_want: f.notice_and_want,
    },
    role: { role_tag: f.role_tag, age_band: f.age_band },
  };
  if (exceptions) card.authored_exceptions = exceptions;
  return card;
}

/** Build the whole fixture object: authored cards from cast/, then placeholders. */
/**
 * Souls whose cards are canon but who are NOT dealt into this arc.
 * Ruled by Roc 2026-08-09 (plans/2026-08-09-session-handoff.md §2): v01 is six souls
 * in six civic seats. Nell and Linnet have no role, no thread and no scene. They may be
 * referenced in dialogue — a reference carries no `delta_cast` slot and sets no flag —
 * so they need no persona entry, and emitting one implies a presence the arc does not have.
 * Their cards stay canon and gated; only the v01 deal excludes them.
 */
const DEALT_OUT = new Set(["nell", "linnet"]);

export function buildPersonas(castDir = CAST_DIR) {
  const out = {};
  const files = fs
    .readdirSync(castDir)
    .filter((f) => f.endsWith(".md") && !f.endsWith("-threads.md") && !f.endsWith("-appearance.md"))
    .sort();
  for (const file of files) {
    const card = parseCard(fs.readFileSync(path.join(castDir, file), "utf-8"));
    if (!card.soul_id) throw new Error(`cast/${file}: no npc_id row found`);
    if (DEALT_OUT.has(card.soul_id)) continue;
    out[card.soul_id] = card;
  }
  for (const [id, card] of Object.entries(PLACEHOLDERS)) {
    if (!(id in out)) out[id] = card;
  }
  return out;
}

export function renderPersonas(castDir = CAST_DIR) {
  return JSON.stringify(buildPersonas(castDir), null, 2) + "\n";
}

// The v01 run folder gets the same generated file (the vite bridge reads
// personas.json out of whichever run folder is open; the resolver build
// never writes or clobbers it), so the real project's Cast tab and the
// fixtures both come from cast/ with no second hand-edited copy.
export const RUN_V01 = path.resolve(HERE, "../../../lantern-projects/v01/personas.json");

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const json = renderPersonas();
  fs.writeFileSync(FIXTURE, json);
  console.log(`wrote ${FIXTURE} from ${CAST_DIR}`);
  if (fs.existsSync(path.dirname(RUN_V01))) {
    fs.writeFileSync(RUN_V01, json);
    console.log(`wrote ${RUN_V01}`);
  }
}
