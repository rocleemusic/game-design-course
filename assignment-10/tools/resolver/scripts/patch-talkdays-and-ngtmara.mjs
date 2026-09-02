// Re-point gates to talk-days + finish NGT-mara (fixes 1 and 3).
//   1. Greetings: bond_band -> talk_days (first-meeting ==0 / familiar 1-3 / close >=4).
//   2. NGT-mara option -a: gate on talk_days(mara) >= 4 (per-option gate).
//   3. ENC-mara-3: distinct grade flags (whole/half/miss) so NGT-mara can read them.
//   4. NGT-mara: three grade-gated tonic land lines + the Adren sub-choice.
// Dry-run by default; --write to commit. Backs up first.

import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const SG = join(here, "..", "data", "scene-graph.json");
const WRITE = process.argv.includes("--write");
const sg = JSON.parse(readFileSync(SG, "utf8"));
const byId = new Map(sg.scenes.map((s) => [s.scene_id, s]));
const log = [];
const err = [];

// --- 1. greetings: bond_band -> talk_days ---
const GREET_GATE = {
  1: ["talk_days(SOUL) == 0"],
  2: ["talk_days(SOUL) >= 1", "talk_days(SOUL) <= 3"],
  3: ["talk_days(SOUL) >= 4"],
};
for (const soul of ["toby", "ilsa", "mara"]) {
  for (const tier of [1, 2, 3]) {
    const sc = byId.get(`GRT-${soul}-${tier}`);
    if (!sc) { err.push(`missing GRT-${soul}-${tier}`); continue; }
    sc.entry_gate = GREET_GATE[tier].map((g) => g.replace("SOUL", soul));
    log.push(`GRT-${soul}-${tier}: entry_gate -> ${JSON.stringify(sc.entry_gate)}`);
  }
}

// --- 2. NGT-mara -a per-option gate ---
const ngt = byId.get("NGT-mara");
if (!ngt) err.push("missing NGT-mara");
const node = ngt?.choice_nodes.find((n) => n.choice_id === "CH-NGT-M-1");
const optA = node?.options.find((o) => o.option_id === "CH-NGT-M-1-a");
if (!optA) err.push("missing CH-NGT-M-1-a");
else { optA.availability_conditions = ["talk_days(mara) >= 4"]; log.push("CH-NGT-M-1-a: gated talk_days(mara) >= 4"); }

// --- 3. ENC-mara-3 grade flags ---
const enc = byId.get("ENC-mara-3");
const gradeFlag = { "CH-ENC-M3-1-bind": "mara_enc3_whole", "CH-ENC-M3-1-portion": "mara_enc3_half", "CH-ENC-M3-1-end": "mara_enc3_miss" };
for (const [optId, flag] of Object.entries(gradeFlag)) {
  const o = enc?.choice_nodes.flatMap((n) => n.options).find((o) => o.option_id === optId);
  if (!o) { err.push(`ENC-mara-3 missing ${optId}`); continue; }
  o.state_actions ??= [];
  if (!o.state_actions.some((a) => a.type === "knowledge_flag" && a.arg === flag)) {
    o.state_actions.push({ type: "knowledge_flag", arg: flag });
    log.push(`ENC-mara-3/${optId}: +knowledge_flag(${flag})`);
  }
}

// --- 4a. NGT-mara: three grade-gated tonic land lines, after A-NGT-M-1 ---
const landLines = [
  { content_id: "A-NGT-M-1-land-whole", slot_type: "dialogue", speaker_id: "mara",
    conditions: ["knows(mara_enc3_whole)"],
    text: "\"The tonic's a good batch this year — a full one. It'll go all the way round the square tonight, a cup for every soul. A proper wishing.\"" },
  { content_id: "A-NGT-M-1-land-half", slot_type: "dialogue", speaker_id: "mara",
    conditions: ["knows(mara_enc3_half)"],
    text: "\"It'll be a thinner pour this year — the last herbs came in weak. Enough to go round tonight, not a drop over. Everyone still gets some at least.\"" },
  { content_id: "A-NGT-M-1-land-miss", slot_type: "dialogue", speaker_id: "mara",
    conditions: ["knows(mara_enc3_miss)"],
    text: "\"The frost caught the last of the herbs before I could. There'll be no tonic to pass tonight.\" She sets a spool back in the drawer. \"There was always tonic. Every year, a cup for the whole square.\"" },
];
if (ngt && !ngt.lines.some((l) => l.content_id === "A-NGT-M-1-land-whole")) {
  const idx = ngt.lines.findIndex((l) => l.content_id === "A-NGT-M-1");
  if (idx < 0) err.push("NGT-mara: A-NGT-M-1 not found for land-line insert");
  else { ngt.lines.splice(idx + 1, 0, ...landLines); log.push(`NGT-mara: +3 grade-gated land lines after A-NGT-M-1`); }
}

// --- 4b. NGT-mara: the Adren sub-choice (parent_option CH-NGT-M-1-a) ---
if (ngt && !ngt.choice_nodes.some((n) => n.choice_id === "CH-NGT-M-1-a2")) {
  ngt.lines.push(
    { content_id: "L-CH-NGT-M-1-a2-more-p", slot_type: "player_line", speaker_id: "player", text: "\"Who is Adren?\"", choice_id: "CH-NGT-M-1-a2", option_id: "CH-NGT-M-1-a2-a" },
    { content_id: "L-CH-NGT-M-1-a2-more-r", slot_type: "dialogue", speaker_id: "mara", choice_id: "CH-NGT-M-1-a2", option_id: "CH-NGT-M-1-a2-a",
      text: "\"My sister. Younger.\" She turns the doll over. \"Quick, that one — into everything, helping at the stalls before she could see over them. Used to sit right where you are, picking out my stitches to learn how I'd done them. Took a thing apart and set it back till she knew it. Never once wrong.\" She smooths the arm. \"This doll was her favourite.\"" },
    { content_id: "L-CH-NGT-M-1-a2-sit-r", slot_type: "action", speaker_id: "mara", choice_id: "CH-NGT-M-1-a2", option_id: "CH-NGT-M-1-a2-b",
      text: "You don't press. She turns the doll once more and sets it back among the rest. \"Still holds together, though. Always has.\" She eases the drawer to." },
  );
  ngt.choice_nodes.push({
    choice_id: "CH-NGT-M-1-a2",
    scene_id: "NGT-mara",
    parent_option: "CH-NGT-M-1-a",
    availability_conditions: [],
    equal_weight_note: "Press gently for more, or let it sit — both honest, neither the 'right' one.",
    no_accrual_note: "Neither option records; the reveal already recorded on the parent option -a.",
    options: [
      { option_id: "CH-NGT-M-1-a2-a", player_line: "L-CH-NGT-M-1-a2-more-p", response_slots: ["L-CH-NGT-M-1-a2-more-r"], state_actions: [], rejoin: "gather" },
      { option_id: "CH-NGT-M-1-a2-b", surface_action: "Let it sit — say nothing", response_slots: ["L-CH-NGT-M-1-a2-sit-r"], state_actions: [], rejoin: "gather" },
    ],
  });
  log.push("NGT-mara: +Adren sub-choice CH-NGT-M-1-a2 (parent_option CH-NGT-M-1-a)");
}

console.log("=== PATCH talk-days + NGT-mara (dry-run) ===");
for (const l of log) console.log("  " + l);
if (err.length) { console.log("\nERRORS:"); err.forEach((e) => console.log("  x " + e)); }
if (!WRITE) { console.log("\n(dry-run; pass --write)"); process.exit(err.length ? 1 : 0); }
if (err.length) { console.log("\nREFUSING with errors."); process.exit(1); }
copyFileSync(SG, SG + ".pre-talkdays.bak");
writeFileSync(SG, JSON.stringify(sg, null, 2) + "\n");
console.log(`\nWROTE ${SG} (backup .pre-talkdays.bak)`);
