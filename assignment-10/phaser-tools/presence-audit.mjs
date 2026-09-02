/**
 * Cross-references where the day files PLACE each soul against where scenes
 * are actually authored for them.
 *
 * Written after a bug report that Ilsa's and Mara's conversations never open.
 * Presence turned out to be correct — `present_ilsa` really is "T1" on day 1
 * morning — but `world/t1.ink` has no Talk options at all, so a soul can be
 * standing on a screen with nothing to say.
 *
 * Run: node tools/presence-audit.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (p) => JSON.parse(fs.readFileSync(path.join(here, p), "utf8"));

const graph = read("public/story/graph.json");

// soul -> screens that actually have an authored scene for them.
const scened = new Map();
for (const sc of graph.scenes ?? []) {
  if (!sc.soul || !sc.screen_id) continue;
  if (!scened.has(sc.soul)) scened.set(sc.soul, new Map());
  const byScreen = scened.get(sc.soul);
  byScreen.set(sc.screen_id, (byScreen.get(sc.screen_id) ?? 0) + 1);
}

const days = [];
for (let d = 1; d <= 5; d++) {
  try {
    days.push(read(`public/story/day-${d}.json`));
  } catch {
    break;
  }
}

// soul -> role -> workplace screens. This binding ALREADY EXISTS in the graph
// and is exactly what the scheduler should be honouring — the narrative crew
// authored every scene at the soul's own role workplace.
const roleOf = new Map((graph.souls ?? []).map((x) => [x.soul_id, x.role_tag]));
const workplace = new Map(
  (graph.role_workplace ?? []).map((r) => [
    r.role_tag,
    { screens: r.workplace_screens ?? [], blocks: r.time_blocks ?? [] },
  ]),
);
const wpFor = (soul) => workplace.get(roleOf.get(soul)) ?? { screens: [], blocks: [] };

console.log("\nsoul -> role -> workplace, vs where scenes were authored\n");
for (const soul of graph.souls ?? []) {
  const wp = wpFor(soul.soul_id);
  const authored = [...(scened.get(soul.soul_id)?.keys() ?? [])].sort();
  console.log(
    "  " +
      soul.soul_id.padEnd(8) +
      String(soul.role_tag ?? "-").padEnd(11) +
      "workplace=" +
      JSON.stringify(wp.screens).padEnd(16) +
      " scenes=" +
      JSON.stringify(authored),
  );
}

console.log("\nauthored scenes per soul\n");
const souls = [...scened.keys()].sort();
for (const soul of souls) {
  const screens = [...scened.get(soul).entries()]
    .map(([s, n]) => `${s}(${n})`)
    .sort()
    .join(" ");
  console.log(`  ${soul.padEnd(8)} ${screens}`);
}

// Souls the day files place but that have no scenes anywhere at all.
const placedSouls = new Set();
for (const day of days) for (const f of day.slot_fill ?? []) placedSouls.add(f.soul);
const voiceless = [...placedSouls].filter((s) => !scened.has(s)).sort();
if (voiceless.length) {
  console.log(`\n  placed but have no scene anywhere: ${voiceless.join(", ")}`);
}

console.log("\nplacements that can never open a conversation\n");
let total = 0;
let dead = 0;
const deadByScreen = new Map();
const liveRows = [];

for (const day of days) {
  for (const fill of day.slot_fill ?? []) {
    total++;
    const screens = scened.get(fill.soul);
    const has = screens?.has(fill.screen_id);
    if (has) {
      liveRows.push(`day ${day.day} ${fill.time_block.padEnd(9)} ${fill.screen_id.padEnd(3)} ${fill.soul}`);
      continue;
    }
    dead++;
    deadByScreen.set(fill.screen_id, (deadByScreen.get(fill.screen_id) ?? 0) + 1);
  }
}

const byScreen = [...deadByScreen.entries()].sort((a, b) => b[1] - a[1]);
for (const [screen, n] of byScreen) {
  const name = (graph.screens ?? []).find((s) => s.screen_id === screen)?.name ?? screen;
  console.log(`  ${screen.padEnd(3)} ${String(n).padStart(3)} placements  ${name}`);
}

console.log("\nplacements that DO open a conversation\n");
for (const row of liveRows) console.log(`  ${row}`);

// How many placements land on the soul's OWN role workplace?
let atWorkplace = 0;
let offWorkplace = 0;
for (const day of days) {
  for (const fill of day.slot_fill ?? []) {
    if (wpFor(fill.soul).screens.includes(fill.screen_id)) atWorkplace++;
    else offWorkplace++;
  }
}

console.log("\nsummary");
console.log(`  ${total} soul placements across ${days.length} days`);
console.log(`  ${liveRows.length} can open a conversation`);
console.log(`  ${dead} cannot — the soul is present with nothing authored on that screen`);
console.log(`  ${Math.round((dead / total) * 100)}% of placements are silent`);
console.log("\n  against the role_workplace binding that already exists:");
console.log(`    ${atWorkplace} placements are at the soul's own workplace`);
console.log(`    ${offWorkplace} are not — the scheduler never consults it\n`);
