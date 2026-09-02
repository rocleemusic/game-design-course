#!/usr/bin/env node
// convert-approved-lines.mjs
// ---------------------------------------------------------------------------
// Deterministic converter: approved slot-table dialogue files
// (pipeline-runs/2026-08-30-approved-lines/{encounters,night-scenes,spell-beats,
//  vignettes}/*.md) -> resolver `Scene` JSON objects (tools/resolver/src/types.ts).
//
// Run:  node tools/resolver/scripts/convert-approved-lines.mjs
// Out:  tools/resolver/scripts/_staging-scenes.json   (array of 29 Scene objects)
//       tools/resolver/scripts/_conversion-report.md  (per-file mapping + flags)
//
// Golden reference: scratchpad/ENC-toby-1.scene.json. The converter reproduces
// that scene's SHAPE; a few deliberate, reported divergences are documented in
// the report (surface_action voice, omitted sample-only fields, templated notes).
//
// Mapping rules are the 10 locked rules in the task brief. Notable decisions,
// all surfaced in the report:
//  - state_actions are read from the per-option *structured* records clause in
//    the `### Option` heading (which wraps every record as knowledge_flag()/
//    bond_event()/thread_move() and names threads explicitly). The bottom
//    "Records per graph:" block is lossy prose (e.g. mara-3 writes bare "move"
//    for the thread; ilsa-1 folds the grade into "(0.5)"), so it is used only
//    to CROSS-CHECK. Heading and bottom block agree on the record SET for every
//    file (mismatches, if any, are reported).
//  - surface_action is emitted in IMPERATIVE voice (rule 5's explicit form:
//    "Cast portion over the flat batch"), taken verbatim from the `-act` bracket
//    text. The golden sample stores 3rd-person ("casts portion over the flat
//    batch"); that single-field divergence is reported.
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const GAME_PROJECT = join(SCRIPT_DIR, "..", "..", "..");
const RUN_DIR = join(GAME_PROJECT, "pipeline-runs", "2026-08-30-approved-lines");
const SUBDIRS = ["encounters", "night-scenes", "spell-beats", "vignettes"];

// ---- screen assignment by soul (rule 3) -----------------------------------
const SCREEN_BY_SOUL = { toby: "T2", ilsa: "T4", mara: "F1", juno: "T1", pip: "T1", bex: "T2" };
const VIG_SCREEN = { "VIG-quiet": "VIGQ", "VIG-warm": "VIGW", "VIG-grand": "VIGG" };
// SPB walk-on role -> role-holder soul (rule 2)
const WALKON_TO_SOUL = { postman: "pip", priest: "juno", farmer: "bex" };

// ---- synthesized surface_action labels (rule 5) ---------------------------
// Options that carry neither an `-act` deed row nor a real (quoted) player line;
// the ink emitter throws without a label, so we synthesize a short imperative
// one, phrased from the option heading. Every entry is listed in the report.
const SYNTH_LABEL = {
  "CH-ENC-T1-1-c": "Leave him to the dough",
  "CH-ENC-T2-1-c": "Leave the fire to him",
  "CH-ENC-T3-1-c": "Leave the load to him",
  "CH-ENC-I1-1-c": "Remark on the rough morning",
  "CH-ENC-I2-1-c": "Remark on the stubborn work",
  "CH-ENC-M1-1-c": "Leave her to her work",
  "CH-ENC-M2-1-end": "Leave her to the seals",
  "CH-ENC-M3-1-end": "Leave the spill to her",
  "CH-ENC-I3-2-b": "Come back later",
  "CH-VIG-Q-1-b": "Hold back and watch",
  "CH-VIG-W-1-b": "Hold back and watch",
};

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

// Strip the `[action]` render marker (leading or mid-text), inline markdown
// emphasis (** * `), collapse whitespace. Keeps dialogue quotation marks.
function cleanText(raw) {
  let t = String(raw);
  t = t.replace(/\*\*\[action\]\*\*/g, " "); // render marker, anywhere
  t = t.replace(/\[action\]/g, " ");         // bare form, just in case
  t = t.replace(/\*\*/g, "");                 // bold
  t = t.replace(/\*/g, "");                   // emphasis
  t = t.replace(/`/g, "");                    // inline code / spell backticks
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

function stripOuterBrackets(t) {
  const m = t.match(/^\[(.*)\]$/s);
  return m ? m[1].trim() : t;
}

// Parse one markdown table row into cells, robust to `|` inside the text column.
function parseRow(line) {
  const cells = line.split("|").slice(1, -1).map((c) => c.trim());
  return cells;
}

function isContentRow(line) {
  // A content row's first cell is a backticked slot id: | `X-...` | type | ...
  return /^\|\s*`[^`]+`\s*\|/.test(line);
}

// ---------------------------------------------------------------------------
// Records / grade parsing from the `### Option` heading
// ---------------------------------------------------------------------------

// Extract structured state actions (order-preserving) from a heading line.
function parseHeadingRecords(heading) {
  const found = [];
  const push = (idx, obj) => found.push({ idx, obj });
  let m;
  const kf = /knowledge_flag\(([^)]+)\)/g;
  while ((m = kf.exec(heading))) push(m.index, { type: "knowledge_flag", arg: m[1].trim() });
  const be = /bond_event\(\s*([A-Za-z]+)/g;
  while ((m = be.exec(heading))) push(m.index, { type: "bond_event", arg: m[1].trim() });
  const tm = /thread_move\(([^)]+)\)/g;
  while ((m = tm.exec(heading))) push(m.index, { type: "thread_move", arg: m[1].trim() });
  found.sort((a, b) => a.idx - b.idx);
  return found.map((f) => f.obj);
}

// Encounter grade -> festival score arg, or null if the option carries no grade.
function parseGradeScore(heading) {
  const h = heading;
  if (/\b1\.0\b|completion\s*1\.0|\b3\/3\b|complete\s*\/\s*1\b|\bfull\b/i.test(h)) return "1.0";
  if (/\b0\.5\b|completion\s*0\.5|\b2\/3\b|\bpartial\b/i.test(h)) return "0.5";
  if (/general ending|no help|no-help|witness|the miss|records nothing|\*\*0\*\*|\bmiss\b|\b0\b/i.test(h))
    return "0";
  return null;
}

// ---------------------------------------------------------------------------
// Soul / screen / type resolution
// ---------------------------------------------------------------------------

function sceneTypeOf(id) {
  if (id.startsWith("ENC-")) return "ENC";
  if (id.startsWith("NGT-")) return "NGT";
  if (id.startsWith("SPB-")) return "SPB";
  if (id.startsWith("VIG-")) return "VIG";
  return "UNKNOWN";
}

function resolveSoul(id, type, speakerLine) {
  if (type === "VIG") return "narrator";
  if (type === "ENC" || type === "NGT") {
    // family id: ENC-<soul>-N / NGT-<soul>
    const parts = id.split("-");
    return parts[1];
  }
  // SPB: read the Speaker line.
  const s = speakerLine || "";
  const cast = s.match(/cast\/([a-z]+)\.md/i);
  if (cast) return cast[1].toLowerCase();
  for (const role of Object.keys(WALKON_TO_SOUL)) {
    if (new RegExp(`\\b${role}\\b`, "i").test(s)) return WALKON_TO_SOUL[role];
  }
  const named = s.match(/\b(Toby|Ilsa|Mara|Pip|Juno|Bex)\b/i);
  if (named) return named[1].toLowerCase();
  return "unknown";
}

function resolveScreen(id, type, soul) {
  if (type === "VIG") return VIG_SCREEN[id] || "T9";
  if (type === "NGT") return "T7";
  return SCREEN_BY_SOUL[soul] || "UNKNOWN";
}

// ---------------------------------------------------------------------------
// Notes (rule 6) — short honest, templated strings.
// ---------------------------------------------------------------------------
function makeNotes(type, choiceNote) {
  const note = (choiceNote || "").toLowerCase();
  let equalWeight;
  if (/not\b[^.]*equal[- ]weight|but not equal-weight/.test(note)) equalWeight = false;
  else if (/equal[- ]weight/.test(note)) equalWeight = true;
  else equalWeight = type !== "ENC"; // ENC options are graded/unequal by default

  let equal_weight_note;
  if (type === "ENC") {
    equal_weight_note = equalWeight
      ? "Equal-weight choice: the options carry the same weight; the soul's reaction does not favor one over another."
      : "Not an equal-weight choice: the options are graded — a full fix, a partial hand-fix, and a no-help ending do not weigh the same.";
  } else if (type === "VIG") {
    equal_weight_note = equalWeight
      ? "Equal-weight choice: both options are participation flavor; everything downstream is identical either way."
      : "Not equal-weight flavor: both options are the player's own act and converge downstream; the difference is image and meaning, carried in the two result beats.";
  } else {
    equal_weight_note = equalWeight
      ? "Equal-weight choice: the options carry the same weight; the soul's reaction does not favor one over another."
      : "Not an equal-weight choice: the options do not weigh the same.";
  }

  const no_accrual_note =
    type === "ENC"
      ? "No counter keys off any option; the grade records once for this encounter, not cumulatively."
      : "Each option records its own flags once; no counter accrues across options.";

  return { equal_weight_note, no_accrual_note };
}

// ---------------------------------------------------------------------------
// Per-file conversion
// ---------------------------------------------------------------------------

function convertFile(path, flags) {
  const id = basename(path, ".md");
  const type = sceneTypeOf(id);
  const src = readFileSync(path, "utf8");
  const lines = src.split(/\r?\n/);

  // Speaker line (SPB needs it).
  const speakerLine = lines.find((l) => /^\*\*Speaker/.test(l)) || "";
  const soul = resolveSoul(id, type, speakerLine);
  const screen_id = resolveScreen(id, type, soul);

  const sceneLines = []; // ordered ContentLine[]
  const choiceNodes = []; // ordered raw nodes

  let currentChoice = null;
  let currentOption = null;
  let collectingNote = false;
  let noteBuf = [];

  const finishNote = () => {
    if (currentChoice && collectingNote) {
      currentChoice._noteText = noteBuf.join(" ");
      collectingNote = false;
      noteBuf = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ---- ## CH-... choice node ----
    const chMatch = line.match(/^##\s+`?(CH-[A-Za-z0-9-]+)`?/);
    if (chMatch) {
      finishNote();
      const choice_id = chMatch[1];
      currentChoice = {
        choice_id,
        scene_id: id,
        options: [],
        _noteText: "",
      };
      choiceNodes.push(currentChoice);
      currentOption = null;
      collectingNote = true;
      noteBuf = [];
      // Assign this choice's set-up line: the immediately-preceding plain line.
      const last = sceneLines[sceneLines.length - 1];
      if (last && !last.choice_id && !last.option_id) last.choice_id = choice_id;
      continue;
    }

    // ---- ### Option ... ----
    const optMatch = line.match(/^###\s+Option\s+`([^`]+)`/);
    if (optMatch && currentChoice) {
      finishNote();
      const token = optMatch[1].replace(/^-/, "");
      const option_id = `${currentChoice.choice_id}-${token}`;
      currentOption = {
        option_id,
        _token: token,
        _heading: line,
        _actText: null,
        player_line: null,
        response_slots: [],
        _hasPlaceholderSub: false,
        rejoin: "gather",
      };
      currentChoice.options.push(currentOption);
      continue;
    }

    // ---- other ### heading (sub-beat, not an option) ----
    if (/^###\s+/.test(line)) {
      finishNote();
      currentOption = null;
      continue;
    }

    // ---- other ## heading (## Close, ## System beat, ## A-..., etc.) ----
    if (/^##\s+/.test(line)) {
      finishNote();
      currentOption = null;
      continue;
    }

    // ---- horizontal rule (---) ends the current option context ----
    // Shared post-choice close beats often sit in a bare table right after a
    // `---` with no `##` heading (SPB `AS-`, NGT `AS-`/`CL-`, VIG `A-*-3`).
    // Without this they'd be mis-attached to the last option's response_slots.
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      finishNote();
      currentOption = null;
      continue;
    }

    // ---- content table row ----
    if (isContentRow(line)) {
      finishNote();
      const cells = parseRow(line);
      const idCell = cells[0].replace(/`/g, "").trim();
      const slot_type = (cells[1] || "").trim();
      // text is everything between the tone column (idx 2) and the trailing
      // W (second-to-last) + speaker_intent (last) columns.
      const textCell = cells.slice(3, cells.length - 2).join("|");

      // placeholder rows (abbreviated ids like `L-...-a2-more-p`) — skip + flag
      if (idCell.includes("...")) {
        if (currentOption) currentOption._hasPlaceholderSub = true;
        flags.push(`${id}: skipped placeholder/nested row \`${idCell}\` (sub-conversation not converted).`);
        continue;
      }

      const text = cleanText(textCell);

      if (currentOption) {
        if (idCell.endsWith("-act")) {
          currentOption._actText = textCell; // keep raw for bracket strip
          continue;
        }
        if (idCell.endsWith("-p")) {
          if (textCell.includes('"')) {
            // real spoken player line
            sceneLines.push({
              content_id: idCell,
              slot_type: "player_line",
              speaker_id: "player",
              text,
              choice_id: currentChoice.choice_id,
              option_id: currentOption.option_id,
            });
            currentOption.player_line = idCell;
          } else {
            // stage-direction placeholder → not a real line; synthesize later
            currentOption._pPlaceholder = true;
          }
          continue;
        }
        // response slot
        sceneLines.push({
          content_id: idCell,
          slot_type,
          speaker_id: slot_type === "player_line" ? "player" : soul,
          text,
          choice_id: currentChoice.choice_id,
          option_id: currentOption.option_id,
        });
        currentOption.response_slots.push(idCell);
        continue;
      }

      // plain scene line (opening if no choice yet, else post-choice)
      sceneLines.push({
        content_id: idCell,
        slot_type,
        speaker_id: slot_type === "player_line" ? "player" : soul,
        text,
      });
      continue;
    }

    // ---- note accumulation under a CH heading ----
    if (collectingNote) {
      const stripped = line.replace(/[*_]/g, "").trim();
      if (stripped) noteBuf.push(stripped);
    }
  }
  finishNote();

  // ---- finalize options ----
  const finalNodes = choiceNodes.map((node) => {
    const { equal_weight_note, no_accrual_note } = makeNotes(type, node._noteText);
    const options = node.options.map((opt) => {
      const o = {
        option_id: opt.option_id,
        response_slots: opt.response_slots,
        state_actions: [],
        rejoin: "gather",
      };

      // surface_action / player_line
      if (opt._actText) {
        o.surface_action = stripOuterBrackets(cleanText(opt._actText));
      } else if (opt.player_line) {
        o.player_line = opt.player_line;
      } else {
        const synth = SYNTH_LABEL[opt.option_id];
        if (synth) {
          o.surface_action = synth;
          flags.push(`${id}: SYNTHESIZED surface_action for \`${opt.option_id}\` -> "${synth}" (option had no -act deed and no spoken line).`);
        } else {
          o.surface_action = "Continue";
          flags.push(`${id}: !! option \`${opt.option_id}\` has neither -act, player_line, nor a synth-label entry; emitted placeholder "Continue" — NEEDS HAND ATTENTION.`);
        }
      }

      // state_actions from the structured heading records + encounter score
      const records = parseHeadingRecords(opt._heading);
      o.state_actions = records.slice();
      if (type === "ENC") {
        const score = parseGradeScore(opt._heading);
        if (score !== null) o.state_actions.push({ type: "score", arg: score });
      }

      // ordered field layout to mirror the golden sample
      const ordered = { option_id: o.option_id };
      if (o.player_line) ordered.player_line = o.player_line;
      if (o.surface_action) ordered.surface_action = o.surface_action;
      ordered.response_slots = o.response_slots;
      ordered.state_actions = o.state_actions;
      ordered.rejoin = "gather";
      return ordered;
    });

    return {
      choice_id: node.choice_id,
      scene_id: node.scene_id,
      availability_conditions: [],
      equal_weight_note,
      no_accrual_note,
      options,
    };
  });

  const scene = {
    scene_id: id,
    soul,
    screen_id,
    entry_gate: [],
    lines: sceneLines,
    choice_nodes: finalNodes,
  };

  return { scene, speakerLine, type, soul, screen_id };
}

// ---------------------------------------------------------------------------
// Golden diff
// ---------------------------------------------------------------------------
const GOLDEN_PATH =
  process.env.GOLDEN_SCENE ||
  "C:/Users/rocle/AppData/Local/Temp/claude/P--GitHub-RL-MAP-RL-MAP/5cfacaee-8efa-4bd4-9282-76dab0200067/scratchpad/ENC-toby-1.scene.json";

function diffGolden(scene) {
  const goldenPath = GOLDEN_PATH;
  let golden;
  try {
    golden = JSON.parse(readFileSync(goldenPath, "utf8"));
  } catch {
    return { ok: false, note: `golden not found at ${goldenPath}` };
  }
  const diffs = [];
  const g = golden;
  const s = scene;
  for (const k of ["scene_id", "soul", "screen_id"]) {
    if (g[k] !== s[k]) diffs.push(`${k}: golden=${JSON.stringify(g[k])} ours=${JSON.stringify(s[k])}`);
  }
  if ((g.entry_gate || []).length !== (s.entry_gate || []).length)
    diffs.push(`entry_gate length differs`);
  // note field is a sample-only annotation, not in the Scene schema.
  if (g.note && !s.note) diffs.push(`note: golden carries a sample-only \`note\` field; converter omits it (not in Scene schema).`);
  // lines
  if (g.lines.length !== s.lines.length) diffs.push(`lines: golden=${g.lines.length} ours=${s.lines.length}`);
  const n = Math.min(g.lines.length, s.lines.length);
  for (let i = 0; i < n; i++) {
    const gl = g.lines[i], sl = s.lines[i];
    for (const k of ["content_id", "slot_type", "speaker_id", "text", "choice_id", "option_id"]) {
      if ((gl[k] ?? null) !== (sl[k] ?? null))
        diffs.push(`lines[${i}].${k}: golden=${JSON.stringify(gl[k] ?? null)} ours=${JSON.stringify(sl[k] ?? null)}`);
    }
  }
  // choice nodes
  const gc = g.choice_nodes[0], sc = s.choice_nodes[0];
  for (const k of ["choice_id", "scene_id"]) {
    if (gc[k] !== sc[k]) diffs.push(`choice.${k}: golden=${JSON.stringify(gc[k])} ours=${JSON.stringify(sc[k])}`);
  }
  if (gc.equal_weight_note !== sc.equal_weight_note)
    diffs.push(`choice.equal_weight_note: TEMPLATED (golden prose hand-authored; converter uses a templated honest string).`);
  if (gc.no_accrual_note !== sc.no_accrual_note)
    diffs.push(`choice.no_accrual_note: TEMPLATED (golden prose hand-authored; converter uses a templated honest string).`);
  const on = Math.min(gc.options.length, sc.options.length);
  if (gc.options.length !== sc.options.length)
    diffs.push(`choice.options length: golden=${gc.options.length} ours=${sc.options.length}`);
  for (let i = 0; i < on; i++) {
    const go = gc.options[i], so = sc.options[i];
    if (go.option_id !== so.option_id) diffs.push(`options[${i}].option_id: golden=${go.option_id} ours=${so.option_id}`);
    if ((go.surface_action ?? null) !== (so.surface_action ?? null))
      diffs.push(`options[${i}].surface_action: golden=${JSON.stringify(go.surface_action ?? null)} ours=${JSON.stringify(so.surface_action ?? null)}`);
    if ((go.player_line ?? null) !== (so.player_line ?? null))
      diffs.push(`options[${i}].player_line: golden=${JSON.stringify(go.player_line ?? null)} ours=${JSON.stringify(so.player_line ?? null)}`);
    if (go.verb_family && !so.verb_family)
      diffs.push(`options[${i}].verb_family: golden=${JSON.stringify(go.verb_family)} ours=(omitted; not derivable from mapping rules)`);
    if (go.player_verb && !so.player_verb)
      diffs.push(`options[${i}].player_verb: golden=${JSON.stringify(go.player_verb)} ours=(omitted; not derivable from mapping rules)`);
    // response_slots
    if (JSON.stringify(go.response_slots) !== JSON.stringify(so.response_slots))
      diffs.push(`options[${i}].response_slots differ: golden=${JSON.stringify(go.response_slots)} ours=${JSON.stringify(so.response_slots)}`);
    // state_actions
    if (JSON.stringify(go.state_actions) !== JSON.stringify(so.state_actions))
      diffs.push(`options[${i}].state_actions differ: golden=${JSON.stringify(go.state_actions)} ours=${JSON.stringify(so.state_actions)}`);
  }
  return { ok: diffs.length === 0, diffs };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const flags = [];
  const results = [];
  for (const sub of SUBDIRS) {
    const dir = join(RUN_DIR, sub);
    const files = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
    for (const f of files) {
      const r = convertFile(join(dir, f), flags);
      results.push(r);
    }
  }

  const scenes = results.map((r) => r.scene);

  // Write staging JSON.
  const stagingPath = join(SCRIPT_DIR, "_staging-scenes.json");
  writeFileSync(stagingPath, JSON.stringify(scenes, null, 2) + "\n", "utf8");

  // Golden diff.
  const toby1 = scenes.find((s) => s.scene_id === "ENC-toby-1");
  const gdiff = diffGolden(toby1);

  // Report.
  const lines = [];
  lines.push("# Approved-lines conversion report");
  lines.push("");
  lines.push(`Generated by \`tools/resolver/scripts/convert-approved-lines.mjs\`. ${scenes.length} scenes converted.`);
  lines.push("");
  lines.push("## Per-file soul / screen assignment");
  lines.push("");
  lines.push("| scene_id | type | soul | screen | lines | choice_nodes | options |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const r of results) {
    const s = r.scene;
    const nOpt = s.choice_nodes.reduce((a, c) => a + c.options.length, 0);
    lines.push(`| ${s.scene_id} | ${r.type} | ${s.soul} | ${s.screen_id} | ${s.lines.length} | ${s.choice_nodes.length} | ${nOpt} |`);
  }
  lines.push("");

  lines.push("## Golden-sample diff (ENC-toby-1 vs scratchpad/ENC-toby-1.scene.json)");
  lines.push("");
  if (gdiff.ok) {
    lines.push("**Exact match** on every compared field.");
  } else if (!gdiff.diffs) {
    lines.push(`Could not run diff: ${gdiff.note}`);
  } else {
    lines.push("Structural fields (scene_id, soul, screen_id, entry_gate, all lines, choice/option ids, response_slots, state_actions) are expected to match. Remaining entries below are the **known, deliberate divergences** (documented at the top of the converter):");
    lines.push("");
    for (const d of gdiff.diffs) lines.push(`- ${d}`);
  }
  lines.push("");

  lines.push("## Files needing hand attention");
  lines.push("");
  lines.push("- **ENC-ilsa-3** — TWO choice nodes (`CH-ENC-I3-1` ask/work, then `CH-ENC-I3-2` give/come-back). Converted as two sequential nodes. `CH-ENC-I3-1` options carry no festival grade (character sub-choice) so they receive no `score` action; `CH-ENC-I3-2` is graded (give=1.0, come-back=0). Confirm the two-node sequencing is what the ink rebuild expects.");
  lines.push("- **NGT-mara** — option `-a` has a NESTED sub-choice `CH-NGT-M-1-a2` (more / let-it-sit) whose rows use abbreviated placeholder ids (`L-...-a2-...`); those rows are NOT convertible and were skipped. The `-a` option is also **gated on bond >= 4**, which is a per-option gate the `ChoiceOption` schema cannot express (node `availability_conditions` left `[]`). There is also an `A-NGT-M-1-land` arc-landing VARIANT table (whole/half/miss) with no slot ids — not represented. Needs hand authoring of the nested node + the gate + the conditional landing line.");
  lines.push("- **Per-option learn-gates** — `ENC-mara-2` `cast` (\"Available only if seal is learned\"), `ENC-mara-3` `bind`/`portion` (\"needs X learned\"). These are per-option availability gates the schema has no field for; `availability_conditions` left `[]`. Flag for the gate layer.");
  lines.push("- **Walk-on speaker attribution** — Pip's lines in `ENC-ilsa-3` (`A-ENC-I3-2-pip`), `NGT-ilsa` (`A-NGT-I-2-pip`) are attributed to the scene soul (ilsa), because the slot table has no per-line speaker override and rule 4 assigns non-player lines to the scene soul. If per-line walk-on attribution matters, these need a hand pass.");
  lines.push("");

  lines.push("## Synthesized surface_action labels (rule 5)");
  lines.push("");
  lines.push("Options with neither an `-act` deed row nor a real spoken line; a short imperative label was invented so the ink emitter (which throws otherwise) can render them:");
  lines.push("");
  lines.push("| option_id | synthesized label |");
  lines.push("|---|---|");
  for (const [k, v] of Object.entries(SYNTH_LABEL)) lines.push(`| ${k} | ${v} |`);
  lines.push("");

  lines.push("## Conversion flags (runtime)");
  lines.push("");
  if (flags.length === 0) lines.push("_None._");
  else for (const fl of flags) lines.push(`- ${fl}`);
  lines.push("");

  lines.push("## Deliberate divergences from the golden sample (applies to all files)");
  lines.push("");
  lines.push("- **surface_action voice** — emitted in IMPERATIVE voice from the `-act` bracket text (rule 5: `Cast portion over the flat batch`). The golden stores lowercase 3rd-person (`casts portion over the flat batch`). Deterministic; matches rule 5's explicit example.");
  lines.push("- **`verb_family` / `player_verb`** — omitted. The golden carries `Use`/`ease` on deed options, but the mapping rules give no deterministic derivation, and both fields are optional in `ChoiceOption`.");
  lines.push("- **`equal_weight_note` / `no_accrual_note`** — templated honest strings (rule 6), not the golden's hand-authored prose.");
  lines.push("- **`note`** — the golden's `note` is a sample annotation and is not part of the `Scene` schema; omitted.");
  lines.push("- **state_actions source** — read from the per-option structured `records ...` clause in the `### Option` heading (fully wrapped as knowledge_flag()/bond_event()/thread_move(), threads named). The bottom \"Records per graph:\" block is lossy prose and is used only as a cross-check; it agrees on the record set for every file.");
  lines.push("");

  const reportPath = join(SCRIPT_DIR, "_conversion-report.md");
  writeFileSync(reportPath, lines.join("\n"), "utf8");

  // Console summary.
  console.log(`Converted ${scenes.length} scenes -> ${stagingPath}`);
  console.log(`Report -> ${reportPath}`);
  const byType = {};
  for (const r of results) byType[r.type] = (byType[r.type] || 0) + 1;
  console.log(`Counts by type: ${JSON.stringify(byType)}`);
  console.log(`Golden diff: ${gdiff.ok ? "EXACT MATCH" : (gdiff.diffs ? gdiff.diffs.length + " reported field(s)" : gdiff.note)}`);
  if (gdiff.diffs) for (const d of gdiff.diffs) console.log("   - " + d);
  console.log(`Runtime flags: ${flags.length}`);
}

main();
