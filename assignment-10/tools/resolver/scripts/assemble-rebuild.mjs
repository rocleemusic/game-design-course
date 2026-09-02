// Assemble the retired-dialogue rebuild into scene-graph.json.
// Retires all current scenes, swaps in the 29 converted + 12 greeting scenes,
// mints the `narrator` soul (VIG scenes), and reconciles role goal_threads.
// Dry-run by default; pass --write to commit. Backs up scene-graph.json first.
//
// Usage: node scripts/assemble-rebuild.mjs [--write]

import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "data");
const SG = join(dataDir, "scene-graph.json");
const RW = join(dataDir, "role-workplace.json");
const WRITE = process.argv.includes("--write");

const sg = JSON.parse(readFileSync(SG, "utf8"));
const converted = JSON.parse(readFileSync(join(here, "_staging-scenes.json"), "utf8"));
const greetings = JSON.parse(readFileSync(join(here, "_staging-greetings.json"), "utf8"));
const newScenes = [...converted, ...greetings];

const errors = [];
const warn = [];

// --- validate ---
const seenScene = new Set();
const threadMoves = new Set();
const soulsInScenes = new Set();
for (const s of newScenes) {
  if (!s.scene_id) errors.push(`scene missing scene_id: ${JSON.stringify(s).slice(0, 80)}`);
  if (seenScene.has(s.scene_id)) errors.push(`duplicate scene_id: ${s.scene_id}`);
  seenScene.add(s.scene_id);
  soulsInScenes.add(s.soul);
  if (!s.screen_id) errors.push(`${s.scene_id}: missing screen_id`);
  const lineIds = new Set();
  for (const l of s.lines ?? []) {
    if (lineIds.has(l.content_id)) errors.push(`${s.scene_id}: dup content_id ${l.content_id}`);
    lineIds.add(l.content_id);
    if (!["dialogue", "action", "object", "player_line"].includes(l.slot_type))
      errors.push(`${s.scene_id}: bad slot_type ${l.slot_type} on ${l.content_id}`);
  }
  for (const node of s.choice_nodes ?? []) {
    for (const opt of node.options ?? []) {
      const hasLabel = Boolean(opt.player_line) || Boolean(opt.surface_action);
      if (!hasLabel) errors.push(`${s.scene_id}/${opt.option_id}: no player_line or surface_action (emitter throws)`);
      if (opt.player_line && !lineIds.has(opt.player_line))
        errors.push(`${s.scene_id}/${opt.option_id}: player_line ${opt.player_line} not in lines`);
      for (const rs of opt.response_slots ?? [])
        if (!lineIds.has(rs)) errors.push(`${s.scene_id}/${opt.option_id}: response_slot ${rs} not in lines`);
      for (const a of opt.state_actions ?? []) {
        if (a.type === "thread_move") threadMoves.add(a.arg);
        if (!["bond_event", "knowledge_flag", "thread_move", "canon_write", "score", "see_spell", "cast_learn"].includes(a.type))
          errors.push(`${s.scene_id}/${opt.option_id}: bad state_action ${a.type}`);
      }
    }
  }
}

// --- souls: add narrator ---
const existingSoulIds = new Set(sg.souls.map((s) => s.soul_id));
const knownSouls = new Set([...existingSoulIds, "narrator"]);
for (const soul of soulsInScenes)
  if (!knownSouls.has(soul)) errors.push(`scene references unknown soul: ${soul}`);

const newSouls = sg.souls.slice();
if (!existingSoulIds.has("narrator")) {
  newSouls.push({
    soul_id: "narrator",
    name: "Narrator",
    depth: "texture",
    role_tag_note: "Non-diegetic narrator/priest voice for the festival vignette scenes (VIG-quiet/warm/grand). Added 2026-08-30 for the dialogue rebuild. No role, never placed as an NPC; its scenes are reached only by the festival_vignette router, never a screen hub.",
  });
}

// --- goal_threads reconciliation ---
const rw = JSON.parse(readFileSync(RW, "utf8"));
const roles = rw.roles ?? rw;
const GOAL_BY_ROLE = { Baker: "toby-feast-short", Blacksmith: "ilsa-forge-short", Herbalist: "mara-tonic-frost" };
const goalReport = [];
for (const role of roles) {
  const want = GOAL_BY_ROLE[role.role_tag];
  if (!want) continue;
  const moved = threadMoves.has(want);
  goalReport.push(`${role.role_tag}: goal_threads -> ["${want}"]  (moved by new content: ${moved})`);
  if (WRITE) role.goal_threads = [want];
  if (!moved) warn.push(`${role.role_tag} goal thread "${want}" is NOT moved by any converted scene`);
}

// --- report ---
console.log("=== ASSEMBLY DRY-RUN ===");
console.log(`old scenes: ${sg.scenes.length} -> new scenes: ${newScenes.length}`);
console.log(`souls: ${sg.souls.length} -> ${newSouls.length} (narrator ${existingSoulIds.has("narrator") ? "already present" : "added"})`);
console.log(`thread_moves referenced: ${[...threadMoves].sort().join(", ")}`);
console.log("goal_threads:");
for (const g of goalReport) console.log("  " + g);
console.log(`screens used: ${[...new Set(newScenes.map((s) => s.screen_id))].sort().join(", ")}`);
if (warn.length) { console.log("\nWARNINGS:"); warn.forEach((w) => console.log("  ! " + w)); }
if (errors.length) { console.log(`\nERRORS (${errors.length}):`); errors.forEach((e) => console.log("  x " + e)); }
else console.log("\nvalidation: 0 errors");

if (!WRITE) { console.log("\n(dry-run; pass --write to commit)"); process.exit(errors.length ? 1 : 0); }
if (errors.length) { console.log("\nREFUSING TO WRITE with errors."); process.exit(1); }

copyFileSync(SG, SG + ".bak");
const newSg = { ...sg, souls: newSouls, scenes: newScenes };
writeFileSync(SG, JSON.stringify(newSg, null, 2) + "\n");
writeFileSync(RW, JSON.stringify(rw, null, 2) + "\n");
console.log(`\nWROTE ${SG} (backup at scene-graph.json.bak) and ${RW}`);
