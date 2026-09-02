// Inject the learn-scene bridge into scene-graph.json.
//   see_spell(<spell>)  -> added to EVERY option of a learn scene (idempotent
//                          host clue; fires whichever option the player picks
//                          after watching the cast).
//   cast_learn(<spell>) -> added to the ONE "cast it yourself" option, where a
//                          real cast (consume + VFX + learn-on-effect) happens.
//
// SPB scenes grant SEE only — they have no authored "cast it yourself" option,
// so LEARN-by-casting there is a morning item (needs a new option per scene).
//
// Dry-run by default; --write to commit. Backs up scene-graph.json first.
// Usage: node scripts/enrich-learn-scenes.mjs [--write]

import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const SG = join(here, "..", "data", "scene-graph.json");
const WRITE = process.argv.includes("--write");

// scene_id -> spell seen in that scene (see_spell on every option)
const SEE = {
  "ENC-toby-1": "portion", "ENC-toby-3": "weigh",
  "ENC-ilsa-1": "ignite", "ENC-ilsa-2": "temper",
  "ENC-mara-1": "preserve",
  "SPB-portion": "portion", "SPB-weigh": "weigh", "SPB-steep": "steep",
  "SPB-preserve": "preserve", "SPB-ignite": "ignite", "SPB-temper": "temper",
  "SPB-bind": "bind", "SPB-scratch": "scratch", "SPB-seal": "seal",
  "SPB-dry": "dry", "SPB-leap": "leap", "SPB-waft": "waft",
  "SPB-breath": "breath", "SPB-furrow": "furrow",
};

// scene_id -> { option_id: spell } for the cast-it-yourself option (real cast)
const CAST_LEARN = {
  "ENC-ilsa-1": { "CH-ENC-I1-1-b": "ignite" },
  "ENC-ilsa-2": { "CH-ENC-I2-1-b": "temper" },
  "ENC-toby-1": { "CH-ENC-T1-1-a": "portion" },
  "ENC-toby-3": { "CH-ENC-T3-1-a": "weigh" },
};

const sg = JSON.parse(readFileSync(SG, "utf8"));
const byId = new Map(sg.scenes.map((s) => [s.scene_id, s]));
const log = [];
const errors = [];

const hasAction = (opt, type, arg) =>
  (opt.state_actions ?? []).some((a) => a.type === type && a.arg === arg);

// see_spell on every option of each SEE scene
let seeCount = 0;
for (const [sceneId, spell] of Object.entries(SEE)) {
  const scene = byId.get(sceneId);
  if (!scene) { errors.push(`SEE: scene ${sceneId} not found`); continue; }
  let n = 0;
  for (const node of scene.choice_nodes ?? []) {
    for (const opt of node.options ?? []) {
      opt.state_actions ??= [];
      if (!hasAction(opt, "see_spell", spell)) { opt.state_actions.push({ type: "see_spell", arg: spell }); n++; seeCount++; }
    }
  }
  log.push(`SEE ${sceneId}: +see_spell(${spell}) on ${n} options`);
}

// cast_learn on the specific option
let castCount = 0;
for (const [sceneId, map] of Object.entries(CAST_LEARN)) {
  const scene = byId.get(sceneId);
  if (!scene) { errors.push(`CAST: scene ${sceneId} not found`); continue; }
  for (const [optId, spell] of Object.entries(map)) {
    let found = false;
    for (const node of scene.choice_nodes ?? []) {
      for (const opt of node.options ?? []) {
        if (opt.option_id !== optId) continue;
        found = true;
        opt.state_actions ??= [];
        if (!hasAction(opt, "cast_learn", spell)) { opt.state_actions.push({ type: "cast_learn", arg: spell }); castCount++; }
        log.push(`CAST ${sceneId}/${optId}: +cast_learn(${spell})`);
      }
    }
    if (!found) errors.push(`CAST: option ${optId} not found in ${sceneId}`);
  }
}

console.log("=== ENRICH LEARN SCENES (dry-run) ===");
for (const l of log) console.log("  " + l);
console.log(`\ntotals: see_spell +${seeCount}, cast_learn +${castCount}`);
if (errors.length) { console.log("\nERRORS:"); errors.forEach((e) => console.log("  x " + e)); }

if (!WRITE) { console.log("\n(dry-run; pass --write to commit)"); process.exit(errors.length ? 1 : 0); }
if (errors.length) { console.log("\nREFUSING TO WRITE with errors."); process.exit(1); }
copyFileSync(SG, SG + ".pre-enrich.bak");
writeFileSync(SG, JSON.stringify(sg, null, 2) + "\n");
console.log(`\nWROTE ${SG} (backup at scene-graph.json.pre-enrich.bak)`);
