/**
 * Line-file importer (GP-133 content import).
 *
 * Reads the 30 authored line files in
 * `lantern-projects/v01/threads/lines/` and builds the `lines` +
 * `choice_nodes` structure of `data/scene-graph.json` from them.
 *
 * Same reason author-scenes.mjs exists: hand-writing choice-node JSON is how
 * id-rule slips get in, so ONE generator expands a parsed spec and every id
 * comes out of one code path. The difference is where the spec comes from —
 * author-scenes.mjs carries it inline, this reads it off the authored files.
 *
 * Two things this file is deliberately paranoid about, because both have
 * already cost this project a run:
 *
 *  1. **No positional column parsing.** Cells are addressed by HEADER NAME
 *     (`line-file-schema.md`). A `speaker` column exists in 2 of 30 files and
 *     sits after `tone`; three files carry an extra trailing column. Reading
 *     column 4 as `text` returned 46 slots against a true 85 once already.
 *  2. **No positional NODE references.** Ownership of every slot is derived
 *     from the slot id itself (`id-label-convention.md`'s stack), never from
 *     which table or heading it happens to sit under — `A-CH-T4-04-4-a-r` is
 *     printed inside the nested child's table but belongs to option `-4-a`'s
 *     response run, and only the id says so.
 *
 * Anything the parse had to INFER (a gate, a speaker, a note the line file
 * does not carry) is recorded on the node/scene under `importer_inferred` AND
 * listed in the report, so a later pass audits rather than trusts. Roc ruled
 * that explicitly: infer, but make it auditable.
 *
 * Nothing is written unless the verify pass is clean. A partial import that
 * looks successful is the failure this is designed against.
 *
 * Run: node scripts/import-lines.mjs            (dry run, writes the report only)
 *      node scripts/import-lines.mjs --write    (writes scene-graph.json too)
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const GRAPH_FILE = join(ROOT, "data", "scene-graph.json");
const LINES_DIR = join(
  ROOT,
  "..",
  "..",
  "lantern-projects",
  "v01",
  "threads",
  "lines",
);
const REPORT_DIR = join(ROOT, "reports");
const REPORT_FILE = join(REPORT_DIR, "import-lines-report.md");

const WRITE = process.argv.includes("--write");
/** Apply the authoritative ENTRY_GATES table below. Off by default. */
const ENTRY_GATE_MODE = process.argv.includes("--entry-gates");

/** slot_type is a closed set (line-file-schema.md). `surface_action` is NOT one. */
const SLOT_TYPES = new Set(["dialogue", "action", "object", "player_line"]);
/** Word ceilings are a register/guardrails contract, not tuning. */
const CEILINGS = { dialogue: 40, action: 60, object: 60, player_line: 12 };
const VERB_FAMILIES = new Set(["Collect", "Make", "Use", "Converse"]);
const PLAYER_VERBS = new Set(["witness", "ease", "sit-with"]);
const BOND_CATEGORIES = ["Trust", "Intimacy", "Recognition", "Respect"];
/** The one legal variant vocabulary for a path variant (id-label-convention.md). */
const PATH_SELECTORS = new Set(["norm", "div"]);
/** Grandfathered pre-2026-08-09 selectors — accepted, reported, never minted. */
const LEGACY_SELECTORS = new Set(["both", "repaid"]);

/**
 * The authoritative entry-gate table for the 30 authored conversations.
 *
 * Transcribed from the nine thread docs' `## Dependency order` sections and
 * ratified for this import 2026-08-11. It lives here, as a declared constant,
 * so entry gates are part of the reproducible import rather than a one-off
 * patch applied by hand after the fact — re-running the importer reproduces
 * them byte for byte.
 *
 * Shape, for orientation:
 *  - a linear thread's C1 opens ungated (`[]`); every later conversation gates
 *    on `played(<previous scene>)`;
 *  - `ilsa-kin-no-show` is a diamond: C2 and C3 both gate on C1, and C4 gates
 *    on BOTH C2 and C3;
 *  - `mara-said-out-loud` C1 carries the corpus's only cross-thread gate
 *    (`played(SC-T2-14)`, `mara-set-for-two` C3);
 *  - `toby-the-shelf` adds two flag gates on top of its chain. Roc ruled
 *    2026-08-11, having been told the cost, that these are honoured as
 *    written: `knows(shelf_named)` on SC-T2-11 is reachable but NOT
 *    guaranteed, and a player who skips the one option that sets it is locked
 *    out of C4 for that life. "Even if only 1 possible path allows reaching
 *    then its ok."
 *
 * Applied only under `--entry-gates`. Empty arrays are meaningful: they say
 * "this conversation opens ungated", so no gate is written and none is
 * inherited from the existing graph.
 */
const ENTRY_GATES = new Map(Object.entries({
  // ilsa-forge-short — linear C1→C4
  "SC-T4-07": [],
  "SC-T4-08": ["played(SC-T4-07)"],
  "SC-T4-09": ["played(SC-T4-08)"],
  "SC-T4-10": ["played(SC-T4-09)"],
  // ilsa-kin-no-show — diamond: C1 → {C2, C3} → C4
  "SC-T4-03": [],
  "SC-T4-04": ["played(SC-T4-03)"],
  "SC-T4-05": ["played(SC-T4-03)"],
  "SC-T4-06": ["played(SC-T4-04)", "played(SC-T4-05)"],
  // ilsa-not-family — linear C1→C3
  "SC-T4-11": [],
  "SC-T4-12": ["played(SC-T4-11)"],
  "SC-T4-13": ["played(SC-T4-12)"],
  // mara-set-for-two — linear C1→C3
  "SC-T2-12": [],
  "SC-T2-13": ["played(SC-T2-12)"],
  "SC-T2-14": ["played(SC-T2-13)"],
  // mara-said-out-loud — C1 gates cross-thread on mara-set-for-two C3
  "SC-T2-24": ["played(SC-T2-14)"],
  "SC-T2-25": ["played(SC-T2-24)"],
  // mara-tonic-frost — linear C1→C3, C2 sits in the forest
  "SC-T2-22": [],
  "SC-F1-03": ["played(SC-T2-22)"],
  "SC-T2-23": ["played(SC-F1-03)"],
  // toby-feast-short — linear C1→C4
  "SC-T2-15": [],
  "SC-T2-16": ["played(SC-T2-15)"],
  "SC-T2-17": ["played(SC-T2-16)"],
  "SC-T2-18": ["played(SC-T2-17)"],
  // toby-kept-and-returned — linear C1→C3
  "SC-T2-19": [],
  "SC-T2-20": ["played(SC-T2-19)"],
  "SC-T2-21": ["played(SC-T2-20)"],
  // toby-the-shelf — chain plus the two ruled flag gates
  "SC-T2-08": [],
  "SC-T2-09": ["played(SC-T2-08)", "knows(shelf_seen)"],
  "SC-T2-10": ["played(SC-T2-09)"],
  "SC-T2-11": ["played(SC-T2-10)", "knows(shelf_named)"],
}));

// ---------------------------------------------------------------------------
// diagnostics
// ---------------------------------------------------------------------------

const errors = [];   // block the write
const warnings = []; // reported, do not block
const inferred = []; // every inference, for the audit trail

const err = (file, msg) => errors.push({ file, msg });
const warn = (file, msg) => warnings.push({ file, msg });
const infer = (file, kind, msg) => {
  inferred.push({ file, kind, msg });
  return msg;
};

// ---------------------------------------------------------------------------
// text normalisation
// ---------------------------------------------------------------------------

const squash = (s) => s.replace(/\s+/g, " ").trim();

/** Words of a text cell, per the 2026-08-11 counting ruling. */
const words = (s) => (squash(s) === "" ? 0 : squash(s).split(" ").length);

/**
 * A text cell as it will play. The render markers come off (`**[action]**` is a
 * marker, not text — the counting ruling says so), the inline `(13 w)` counts
 * that four files carry inside the cell come off, and the quoting/bracketing
 * that marks modality comes off because the emitter re-adds it.
 */
function cleanText(raw, slotType, role) {
  let t = raw;
  t = t.replace(/\*\*\s*\[action\]\s*\*\*/gi, " ");
  t = t.replace(/(?:^|\s)\[action\](?=\s)/gi, " ");
  t = t.replace(/\((?:\d+)\s*(?:w|words)\.?\)/gi, " ");
  t = squash(t);
  // A deed cell is bracketed to mark it as player-directed action; the
  // brackets are punctuation, not text (counting ruling 2).
  if (role === "act" || /^\[.*\]$/.test(t)) t = t.replace(/^\[(.*)\]$/, "$1").trim();
  // Spoken text is wrapped in quotation marks; the emitter re-adds them.
  t = t.replace(/^["“](.*)["”]$/, "$1").trim();
  return squash(t);
}

/**
 * `Marta: "Eggs and the barley loaf..."` — a speaker named inside the text
 * cell, which the schema calls a defect. Lifted into speaker_id rather than
 * left to play as prose, and reported either way.
 */
function liftInlineSpeaker(text) {
  const m = text.match(/^([A-Z][a-z]+)\s*:\s*["“]?(.*)$/);
  if (!m) return null;
  return { speaker: m[1].toLowerCase(), text: cleanText(m[2], "dialogue", "r") };
}

// ---------------------------------------------------------------------------
// slot id -> ownership  (id-label-convention.md's stack, decoded)
// ---------------------------------------------------------------------------

const ROLE_TAILS = new Set(["s", "s1", "s2", "s3", "p", "act"]);
const isOptionLetter = (t) => /^[a-c]$/.test(t);
const isNum = (t) => /^\d+$/.test(t);
const isRole = (t) => ROLE_TAILS.has(t) || /^r\d*$/.test(t);

/**
 * Decode a slot id into the thing that owns it.
 *
 * Returns { prefix, kind: "scene"|"choice", choice_id, option_id, role,
 *           variant } — or null with a reason if the id is not decodable.
 *
 * The walk is unambiguous because no role tail is ever a bare digit or a bare
 * letter a-c: `-a-1-b` (option a, its child 1, that child's option b) and a
 * flat `-a-b` can therefore be told apart, which is the trap the label
 * convention exists for.
 */
function decodeSlotId(id) {
  const m = id.match(/^([LAO])-(SC|CH)-([A-Z]+\d*)-(\d+)(?:-(.*))?$/);
  if (!m) return { error: `slot id "${id}" does not match <L|A|O>-<SC|CH>-<screen>-<seq>[-tail]` };
  const [, prefix, kind, screen, seq, tailRaw] = m;
  const base = `${screen}-${seq}`;
  const tokens = tailRaw ? tailRaw.split("-") : [];

  if (kind === "SC") {
    // A scene-level description slot: `A-SC-T2-10-1` sits on node 1's edge.
    // Its trailing number is the node it plays against, not an option.
    if (tokens.length === 0) return { error: `scene slot "${id}" names no node` };
    if (!isNum(tokens[0])) return { error: `scene slot "${id}": "${tokens[0]}" is not a node number` };
    if (tokens.length > 1) return { error: `scene slot "${id}" carries an unexpected tail` };
    return { prefix, kind: "scene", choice_id: `CH-${base}-${tokens[0]}`, option_id: null, role: "scene", variant: null };
  }

  if (tokens.length === 0) return { error: `choice slot "${id}" names no node` };
  if (!isNum(tokens[0])) return { error: `choice slot "${id}": "${tokens[0]}" is not a node number` };

  const path = [tokens[0]];
  let i = 1;
  let option_id = null;
  while (i < tokens.length && isOptionLetter(tokens[i])) {
    const letter = tokens[i];
    if (i + 1 < tokens.length && isNum(tokens[i + 1])) {
      // option letter followed by a child node number: the path descends.
      path.push(letter, tokens[i + 1]);
      option_id = null;
      i += 2;
    } else {
      // option letter followed by a role: this is the owning option.
      option_id = `CH-${base}-${[...path, letter].join("-")}`;
      i += 1;
      break;
    }
  }
  const choice_id = `CH-${base}-${path.join("-")}`;
  const tail = tokens.slice(i);
  if (tail.length === 0) return { error: `slot "${id}" carries no role tail (-s / -p / -act / -rN)` };
  if (!isRole(tail[0])) return { error: `slot "${id}": "${tail[0]}" is not a slot role` };
  const variant = tail.length > 1 ? tail.slice(1).join("-") : null;
  if (tail.length > 2 && !variant) return { error: `slot "${id}" carries more than one selector` };
  const role = tail[0] === "act" ? "act" : tail[0] === "p" ? "p" : /^s/.test(tail[0]) ? "s" : "r";
  return { prefix, kind: "choice", choice_id, option_id, role, roleTail: tail[0], variant };
}

// ---------------------------------------------------------------------------
// markdown table parsing — BY HEADER NAME, never by index
// ---------------------------------------------------------------------------

const splitRow = (line) =>
  line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());

const normHeader = (h) => h.toLowerCase().replace(/[`*]/g, "").trim();

/**
 * Every slot table in the file, as { headers, rows, lineNo }.
 * A table is a slot table when its first header cell is `slot id`; that check
 * alone excludes the inventions table, the slot-count table and the
 * front-matter tables without needing to know where they sit.
 */
function parseSlotTables(text, file) {
  const lines = text.split(/\r?\n/);
  const tables = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*\|/.test(lines[i])) continue;
    const headers = splitRow(lines[i]).map(normHeader);
    if (headers[0] !== "slot id") {
      // Skip the whole block so its body rows are not re-examined.
      while (i < lines.length && /^\s*\|/.test(lines[i])) i++;
      continue;
    }
    if (!/^\s*\|[\s:|-]+\|?\s*$/.test(lines[i + 1] ?? "")) {
      warn(file, `line ${i + 1}: a \`slot id\` header row with no separator row under it — skipped`);
      continue;
    }
    const index = {};
    headers.forEach((h, at) => {
      if (index[h] === undefined) index[h] = at;
      else warn(file, `line ${i + 1}: duplicate column header "${h}"`);
    });
    for (const need of ["slot_type", "text"]) {
      if (index[need] === undefined) {
        err(file, `line ${i + 1}: slot table has no \`${need}\` column — canonical order is \`| slot id | slot_type | tone | text | W | speaker_intent |\``);
      }
    }
    if (index.w === undefined && index.words === undefined) {
      warn(file, `line ${i + 1}: slot table carries no count column (\`W\`)`);
    }
    const rows = [];
    let j = i + 2;
    for (; j < lines.length && /^\s*\|/.test(lines[j]); j++) {
      const cells = splitRow(lines[j]);
      if (cells.length !== headers.length) {
        warn(file, `line ${j + 1}: row has ${cells.length} cells against ${headers.length} headers — parsed by name anyway`);
      }
      const get = (name) => (index[name] === undefined ? "" : (cells[index[name]] ?? ""));
      rows.push({ lineNo: j + 1, get, cells });
    }
    tables.push({ headers, index, rows, lineNo: i + 1 });
    i = j - 1;
  }
  return tables;
}

// ---------------------------------------------------------------------------
// front matter — bold markdown, not YAML, and five different label spellings
// ---------------------------------------------------------------------------

const firstBacktick = (s) => {
  const m = s.match(/`([^`]+)`/);
  return m ? m[1] : null;
};
const allBackticks = (s) => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]);

function parseFrontMatter(text, file) {
  const lines = text.split(/\r?\n/);
  // The header block is everything above the first `---` rule.
  let end = lines.findIndex((l) => /^---\s*$/.test(l));
  if (end < 0) end = Math.min(lines.length, 30);
  const head = lines.slice(0, end);
  const fm = { soul: null, defaultSpeaker: null, exceptions: new Map(), entryGate: [], incomingStates: null, prosePeakerRule: null };

  const title = head[0] ?? "";
  fm.scene_id = firstBacktick(title.split("·").pop() ?? "") ?? null;
  if (!fm.scene_id || !/^SC-/.test(fm.scene_id)) {
    const any = allBackticks(title).find((b) => /^SC-/.test(b));
    fm.scene_id = any ?? null;
  }

  for (const raw of head) {
    const l = raw.trim();
    const plain = l.replace(/\*\*/g, "");

    if (fm.soul === null && /^(Soul|Souls)\s*:/i.test(plain)) fm.soul = firstBacktick(plain);

    // Three spellings of the speaker declaration, plus one prose form.
    if (/^Speaker (for all|per)\b/i.test(plain)) {
      const bits = allBackticks(plain);
      // bits[0] is the literal word `dialogue` in every file's phrasing.
      const souls = bits.filter((b) => !/^dialogue$/i.test(b));
      if (souls.length) fm.defaultSpeaker = souls[0].toLowerCase();
      // `..., except these, which are `bex`: `ID`, `ID`, ...`
      const exc = plain.match(/except these,? which are `([^`]+)`\s*:\s*(.*)$/i);
      if (exc) {
        const who = exc[1].toLowerCase();
        for (const id of allBackticks(exc[2])) fm.exceptions.set(id, who);
      }
    }
    if (/^Dialogue speakers\s*:/i.test(plain)) {
      // Prose form: "`ilsa` unless a section note says otherwise. **Pip
      // speaks** in node 1 option `-c` ...". The default is recoverable; the
      // exceptions are POSITIONAL and are handled as an inference below.
      const bits = allBackticks(plain).filter((b) => !/^dialogue$/i.test(b) && !/^-/.test(b));
      if (bits.length && !fm.defaultSpeaker) fm.defaultSpeaker = bits[0].toLowerCase();
      fm.prosePeakerRule = plain;
    }

    if (/ENTRY GATE/i.test(plain)) {
      for (const b of allBackticks(plain)) {
        if (/^(knows|played|item_held|bond_band|day)\b/.test(b)) fm.entryGate.push(b);
      }
    }
    if (/^Incoming state/i.test(plain) || /^Reachable incoming state/i.test(plain)) {
      fm.incomingStates = plain;
    }
  }

  if (!fm.soul) err(file, "front matter names no soul (`**Soul:**` / `**Souls:**` / `Soul:`)");
  if (!fm.scene_id) err(file, "the H1 does not carry a `SC-…` scene id");
  if (!fm.incomingStates) {
    warn(file, "front matter carries NO incoming-states / gating line — nothing could be cross-checked against the node gates parsed from the headings");
  }
  if (!fm.defaultSpeaker) {
    fm.defaultSpeaker = fm.soul;
    infer(file, "speaker", `no default-speaker declaration; defaulted every unmarked \`dialogue\` slot to the file's soul \`${fm.soul}\``);
  }
  return fm;
}

// ---------------------------------------------------------------------------
// headings
// ---------------------------------------------------------------------------

/** A predicate the vocabulary actually has (screen-spec-schema.md). */
const isPredicate = (s) =>
  /^knows\([^)]+\)$/.test(s) ||
  /^item_held\([^)]+\)$/.test(s) ||
  /^played\([^)]+\)$/.test(s) ||
  /^bond_band\([^)]+\)\s*=\s*\w+$/.test(s) ||
  /^day\s*[<>=]=?\s*\d+$/.test(s) ||
  /^aliveness\b/.test(s);

/**
 * Gates named in a node's heading or in the prose between the heading and its
 * first table — "Gated `knows(shelf_seen)`. Auto-skips otherwise.",
 * "· gate `bond_band(toby) = low`", "**Gate:** `knows(gave_unowed)`",
 * "*(plays only at `bond_band(toby) = high`)*".
 *
 * Only backticked predicates are taken, and only from a clause that says it is
 * a gate — a bare `knows(x)` mentioned in a note is not a gate.
 */
function gatesFrom(file, choiceId, headingLine, bodyLines) {
  const found = [];
  const consider = (line, where) => {
    if (!/gat(e|ed|es)\b|plays only at|opens on|reads `|auto-skip/i.test(line)) return;
    for (const b of allBackticks(line)) {
      if (isPredicate(b) && !found.includes(b)) {
        found.push(b);
        infer(file, "gate", `${choiceId}: availability_conditions += \`${b}\` — read from ${where}: "${squash(line).slice(0, 140)}"`);
      }
    }
  };
  consider(headingLine, "the node heading");
  for (const l of bodyLines) consider(l, "the prose under the node heading");
  return found;
}

/** `*(both options `divert` → `CH-T4-10-6`)*` and friends. */
function divertFrom(line, ownId) {
  if (!/\bdivert\b/i.test(line)) return null;
  // The target is the id after the arrow. A node heading also carries its OWN
  // id in backticks ahead of it — "`CH-T4-10-4` … both options `divert` →
  // `CH-T4-10-6`" — so taking the first backticked CH id makes the node divert
  // to itself.
  const arrow = line.match(/(?:→|->|➜)\s*`(CH-[^`]+)`/);
  const target = arrow ? arrow[1] : allBackticks(line).find((b) => /^CH-/.test(b) && b !== ownId);
  if (!target || target === ownId) return null;
  const scope = /\bboth options\b|\ball options\b/i.test(line) ? "all" : "named";
  return { target, scope };
}

/**
 * An option heading, in every form the corpus uses:
 *   ### Option `-a` · Use · ease · <gist> *(sets `gave_unowed`)*
 *   ### Option `-a` — <gist> *(spoken · Trust)* — **receiving beat, 3 slots**
 *   #### Option `-a` — <gist> *(deed · records nothing, deliberate)*
 */
function parseOptionHeading(file, heading, threadId) {
  const letter = (heading.match(/Option\s+`-([a-c])`/) ?? [])[1];
  if (!letter) return null;
  let rest = heading.slice(heading.indexOf("`-" + letter + "`") + 4);

  const state_actions = [];
  const push = (type, arg) => {
    if (!state_actions.some((a) => a.type === type && a.arg === arg)) state_actions.push({ type, arg });
  };
  for (const m of rest.matchAll(/sets\s+`([^`]+)`/gi)) push("knowledge_flag", m[1]);
  for (const m of rest.matchAll(/mov(?:es|e)\s*:?\s*`([^`]+)`/gi)) push("thread_move", m[1]);
  if (/mov(?:es|e)s? the thread/i.test(rest) && threadId) push("thread_move", threadId);
  for (const cat of BOND_CATEGORIES) {
    if (new RegExp(`(?<![A-Za-z])${cat}(?![A-Za-z])`).test(rest)) push("bond_event", cat);
  }
  const recordsNothing = /records nothing/i.test(rest);
  if (recordsNothing) state_actions.length = 0;

  // The parenthetical and any trailing bold aside are metadata, not the gist.
  let gistPart = rest.replace(/\*\((?:[^)]*)\)\*/g, " ").replace(/—\s*\*\*[^*]*\*\*/g, " ");
  const segs = gistPart
    .split("·")
    .map((s) => s.replace(/^[\s—–-]+/, "").replace(/[\s—–-]+$/, "").trim())
    .filter(Boolean);
  let verb_family = null;
  let player_verb = null;
  const gistSegs = [];
  for (const s of segs) {
    if (VERB_FAMILIES.has(s)) verb_family = s;
    else if (PLAYER_VERBS.has(s)) player_verb = s;
    else gistSegs.push(s);
  }
  const gist = squash(gistSegs.join(" · ").replace(/`/g, ""));

  // "spoken" as a modality marker is its own `·` token. `responses spoken by
  // \`pip\`` is a SPEAKER declaration and says nothing about modality — reading
  // it as one mislabelled seven deed options as spoken on the first pass.
  const modality = rest.replace(/spoken by[^·)]*/gi, " ");
  const declaredSpoken = /(?:^|[·(\s])spoken(?=[\s·,)])/i.test(modality)
    ? true
    : /(?:^|[·(\s])deed(?=[\s·,)])/i.test(modality)
      ? false
      : null;
  // `… · responses spoken by `pip`` / `… · first response spoken by `juno`,
  // second by `ilsa``. The first form is an option-wide speaker; the second is
  // POSITIONAL and is reported rather than applied.
  const speakerDecl = [];
  for (const m of rest.matchAll(/((?:\w+\s+)*responses?)\s+spoken by\s+`([^`]+)`/gi)) {
    speakerDecl.push({ scope: squash(m[1]).toLowerCase(), who: m[2].toLowerCase() });
  }
  return { letter, gist, verb_family, player_verb, state_actions, declaredSpoken, recordsNothing, speakerDecl, heading };
}

// ---------------------------------------------------------------------------
// one file -> one scene spec
// ---------------------------------------------------------------------------

function parseFile(file, text, existingScene) {
  const threadId = file.replace(/-C\d+\.md$/, "");
  const fm = parseFrontMatter(text, file);
  const lines = text.split(/\r?\n/);

  // --- headings, in document order ---
  // A heading may be STRUCK OUT (`~~### Option …~~ **roc review: cut this**`).
  // toby-the-shelf C2 marks node CH-T2-09-4's two options that way, PENDING
  // ROC. Struck headings are still parsed: deleting authored slots on a review
  // marker would be the importer making the call, so they import and get
  // reported instead.
  const headings = [];
  lines.forEach((l, at) => {
    const m = l.match(/^(~~)?(#{2,6})\s+(.*)$/);
    if (m) headings.push({ depth: m[2].length, text: m[3].replace(/~~/g, ""), struck: Boolean(m[1]), lineNo: at + 1 });
  });
  const bodyUntilNextHeading = (h) => {
    const next = headings.find((x) => x.lineNo > h.lineNo);
    const stop = next ? next.lineNo - 1 : lines.length;
    const out = [];
    for (let i = h.lineNo; i < stop; i++) {
      if (/^\s*\|/.test(lines[i])) break; // stop at the first table
      if (lines[i].trim()) out.push(lines[i]);
    }
    return out;
  };

  // --- node declarations from node headings (id-based, never positional) ---
  const nodes = new Map(); // choice_id -> node spec
  const nodeOrder = [];
  const declareNode = (choiceId, from) => {
    if (nodes.has(choiceId)) return nodes.get(choiceId);
    const n = {
      choice_id: choiceId,
      scene_id: fm.scene_id,
      options: new Map(),
      optionOrder: [],
      availability_conditions: [],
      setupLines: [],
      sceneLines: [],
      variantSetups: [],
      pendingDiverts: [],
      declaredFrom: from,
      inferredNotes: [],
      divert: null,
    };
    nodes.set(choiceId, n);
    nodeOrder.push(choiceId);
    return n;
  };

  let currentNode = null;
  const optionHeadings = []; // { node, opt }
  for (const h of headings) {
    const chId = allBackticks(h.text).find((b) => /^CH-/.test(b));
    const isNodeHeading = chId && !/^Option\b/i.test(h.text);
    if (isNodeHeading) {
      currentNode = declareNode(chId, `heading line ${h.lineNo}`);
      const body = bodyUntilNextHeading(h);
      for (const g of gatesFrom(file, chId, h.text, body)) {
        if (!currentNode.availability_conditions.includes(g)) currentNode.availability_conditions.push(g);
      }
      const d = divertFrom(h.text, chId);
      if (d) currentNode.divert = d;
      continue;
    }
    if (/^Option\s+`-[a-c]`/.test(h.text)) {
      const opt = parseOptionHeading(file, h.text, threadId);
      if (!opt) continue;
      if (!currentNode) {
        err(file, `line ${h.lineNo}: option heading "${squash(h.text).slice(0, 60)}" appears before any node heading`);
        continue;
      }
      const option_id = `${currentNode.choice_id}-${opt.letter}`;
      if (currentNode.options.has(option_id)) {
        err(file, `line ${h.lineNo}: option ${option_id} is declared twice`);
        continue;
      }
      opt.option_id = option_id;
      opt.lineNo = h.lineNo;
      if (h.struck) {
        warn(file, `line ${h.lineNo}: option ${option_id} is STRUCK OUT in the source ("${squash(h.text).slice(0, 70)}") — imported anyway rather than silently dropping authored slots; PENDING ROC`);
      }
      opt.response_slots = [];
      opt.player_line = null;
      opt.actSlot = null;
      const d = divertFrom(h.text, currentNode.choice_id);
      if (d) opt.divert = d;
      currentNode.options.set(option_id, opt);
      currentNode.optionOrder.push(option_id);
      optionHeadings.push({ node: currentNode, opt, lineNo: h.lineNo });
    }
  }

  /**
   * Names this file is allowed to name as a speaker. Built from the file's own
   * declarations only — front matter souls/exceptions and the `spoken by` notes
   * on option headings — so a `speaker_intent` cell that happens to open with a
   * capitalised word ("Attention lands on him…") can never be read as a
   * speaker. `ilsa-not-family` C1-C3 mark their second soul with a fourth
   * dialect, `Pip — …` / `Juno — …` at the head of `speaker_intent`, and this
   * is what makes that dialect safe to read.
   */
  const allowedSpeakers = new Set([fm.soul, fm.defaultSpeaker, ...fm.exceptions.values()].filter(Boolean));
  for (const raw of text.split(/\r?\n/)) {
    for (const m of raw.matchAll(/spoken by\s+`([^`]+)`/gi)) allowedSpeakers.add(m[1].toLowerCase());
    for (const m of raw.matchAll(/\*\*(\w+) speaks\*\*/gi)) allowedSpeakers.add(m[1].toLowerCase());
  }

  // --- every slot row in the file, attributed by ID ---
  const contentLines = [];
  const existingLineById = new Map((existingScene?.lines ?? []).map((l) => [l.content_id, l]));
  const seenIds = new Set();
  const claimed = new Set();
  const tables = parseSlotTables(text, file);

  for (const t of tables) {
    const hasSpeakerCol = t.index.speaker !== undefined;
    for (const row of t.rows) {
      const idCell = row.get("slot id");
      const id = firstBacktick(idCell) ?? squash(idCell).replace(/`/g, "");
      if (!id) continue;
      if (!/^[LAO]-/.test(id)) {
        warn(file, `line ${row.lineNo}: row id "${squash(idCell).slice(0, 40)}" is not a slot id — skipped`);
        continue;
      }
      if (seenIds.has(id)) {
        err(file, `line ${row.lineNo}: duplicate slot id \`${id}\``);
        continue;
      }
      seenIds.add(id);

      const d = decodeSlotId(id);
      if (d.error) {
        err(file, `line ${row.lineNo}: ${d.error}`);
        continue;
      }

      // A slot id names its owner, EXCEPT where a human deliberately wired it
      // somewhere the id cannot express. `A-CH-T2-09-6-s` is the live case: the
      // file heads it "Divert entry only — before the set-up", and the only way
      // to make it play on the divert path alone is to hang it off the
      // DIVERTING option, `CH-T2-09-3-a` — which is where the graph has it.
      // Re-deriving it from the id silently moved it to node 6 and stole node
      // 6's set-up slot. So where the graph already wires a slot against what
      // its id implies, the graph wins, exactly as it does for the two notes.
      const priorLine = existingLineById.get(id);
      if (priorLine && (priorLine.choice_id ?? null) !== d.choice_id) {
        infer(file, "wiring", `\`${id}\`: its id implies ${d.choice_id}${d.option_id ? " / " + d.option_id : ""}, but the graph wires it to ${priorLine.choice_id ?? "the scene (no choice_id — usually a gather_line)"}${priorLine.option_id ? " / " + priorLine.option_id : ""} — the graph's wiring KEPT`);
        if (!priorLine.choice_id) {
          // A scene slot the graph hangs off the scene, not a node — SC-T2-08/09
          // do this and name the slot as a node's `gather_line` instead.
          d.kind = "scene";
          d.choice_id = null;
          d.option_id = null;
        } else {
          d.kind = "choice";
          d.choice_id = priorLine.choice_id;
          d.option_id = priorLine.option_id ?? null;
          // Under the new owner the role is a run entry, not that node's set-up.
          if (d.option_id && d.role === "s") d.role = "r";
        }
      }

      // slot_type is a closed set; `surface_action` here is the known defect.
      let slot_type = squash(row.get("slot_type")).replace(/`/g, "").toLowerCase();
      if (slot_type === "surface_action") {
        err(file, `line ${row.lineNo}: \`${id}\` has slot_type \`surface_action\` — that is a choice-OPTION field, never a slot type (line-file-schema.md)`);
        continue;
      }
      if (!SLOT_TYPES.has(slot_type)) {
        err(file, `line ${row.lineNo}: \`${id}\` has slot_type "${slot_type}" — must be one of ${[...SLOT_TYPES].join(" | ")}`);
        continue;
      }

      // The line file is TRUTH for slot_type: the stale graph types
      // L-CH-T2-09-2-a-1-b-r1 as `dialogue` while it holds a stage direction.
      const rawText = row.get("text");
      let text_ = cleanText(rawText, slot_type, d.role);
      const intent = row.get("speaker_intent") ?? "";

      // --- speaker, in precedence order ---
      let speaker_id;
      let speakerWhy;
      if (slot_type === "player_line") {
        speaker_id = "player";
        speakerWhy = "player_line";
      } else if (hasSpeakerCol && squash(row.get("speaker")) && !/^[—–-]$/.test(squash(row.get("speaker")))) {
        speaker_id = squash(row.get("speaker")).replace(/`/g, "").replace(/\(.*\)/, "").trim().toLowerCase();
        speakerWhy = "speaker column";
      } else if (fm.exceptions.has(id)) {
        speaker_id = fm.exceptions.get(id);
        speakerWhy = "front-matter exception list";
      } else {
        const inline = intent.match(/^\s*\*\(([a-z][a-z -]*)\)\*/i);
        const dashed = intent.match(/^\s*([A-Z][a-z]+)\s*[—–-]\s+/);
        if (inline) {
          speaker_id = inline[1].trim().toLowerCase();
          speakerWhy = "inline *(name)* in speaker_intent";
        } else if (dashed && allowedSpeakers.has(dashed[1].toLowerCase())) {
          speaker_id = dashed[1].toLowerCase();
          speakerWhy = "`Name — ` prefix in speaker_intent";
          infer(file, "speaker", `\`${id}\` -> \`${speaker_id}\`, read from the "${dashed[1]} — " prefix on its speaker_intent (a fourth speaker-marking dialect; the schema's form is \`*(name)*\`)`);
        } else {
          speaker_id = fm.defaultSpeaker;
          speakerWhy = "front-matter default";
        }
      }
      // A speaker named inside the text cell is a schema defect; lift it.
      const lifted = liftInlineSpeaker(text_);
      if (lifted && slot_type === "dialogue") {
        warn(file, `line ${row.lineNo}: \`${id}\` names its speaker inside the \`text\` cell ("${lifted.speaker}:") — a schema defect; lifted to speaker_id and the prefix stripped`);
        speaker_id = lifted.speaker;
        text_ = lifted.text;
        speakerWhy = "lifted from the text cell (defect)";
      }
      if (speakerWhy === "front-matter default" && fm.prosePeakerRule) {
        infer(
          file,
          "speaker",
          `\`${id}\` -> \`${speaker_id}\` by the file's default; this file states its exceptions in PROSE ("${squash(fm.prosePeakerRule).slice(0, 110)}…") so any non-default speaker here is NOT machine-derivable and needs a human pass`,
        );
      }

      if (!text_) {
        err(file, `line ${row.lineNo}: \`${id}\` has an empty \`text\` cell`);
        continue;
      }

      // W-count check — the column is machine-checkable and that is the point.
      const wCell = squash(row.get("w") || row.get("words") || "");
      if (/^\d+$/.test(wCell)) {
        const actual = words(text_);
        if (Math.abs(Number(wCell) - actual) > 1) {
          warn(file, `line ${row.lineNo}: \`${id}\` states W=${wCell}, text counts ${actual}`);
        }
      }
      // A ceiling breach is a CONTENT defect, not a structural one — and some
      // are legitimate: two files declare a sanctioned long run (75 words) in
      // their front matter. Reported, never blocking; blocking here would mean
      // the import cannot land until prose is rewritten.
      const ceiling = CEILINGS[slot_type];
      if (ceiling && words(text_) > ceiling) {
        warn(file, `line ${row.lineNo}: \`${id}\` is ${words(text_)} words, over the ${slot_type} ceiling of ${ceiling} — content defect unless it is this file's sanctioned long run`);
      }

      const line = { content_id: id, slot_type, speaker_id, text: text_, choice_id: d.choice_id };
      if (d.option_id) line.option_id = d.option_id;
      contentLines.push(line);

      // --- attach to its target ---
      // The enclosing option heading. Used ONLY as a documented fallback for
      // the one id shape whose owner the id genuinely cannot name (below);
      // everything else is attributed from the id.
      const enclosing = [...optionHeadings].reverse().find((x) => x.lineNo < row.lineNo);

      if (d.kind === "scene") {
        // The trailing number on a scene slot is an ORDINAL, not always a node:
        // `O-SC-T4-06-5` is C4's closing image and C4 has four nodes. Attach it
        // to the node when the node exists, and to the scene when it does not.
        if (d.choice_id && nodes.has(d.choice_id)) {
          nodes.get(d.choice_id).sceneLines.push(id);
        } else {
          delete line.choice_id;
          if (d.choice_id) {
            infer(file, "scene-slot", `\`${id}\` names ${d.choice_id}, which this file declares no node for — kept as a scene-level line with no choice_id (its trailing number is an ordinal, not a node)`);
          }
        }
        claimed.add(id);
        continue;
      }

      const node = declareNode(d.choice_id, `slot \`${id}\` (no node heading found)`);
      if (!d.option_id) {
        if (d.role !== "s") {
          // `A-CH-T2-24-3-a-1-r`: an action slot inside a CHILD node's run. The
          // id names the child node, not which of its options the run belongs
          // to — the one shape the id stack cannot express. Attributed to the
          // option whose section it is printed in, which is how the existing
          // SC-T2-09 rows already sit, and reported as an inference.
          if (enclosing && enclosing.node.choice_id === d.choice_id) {
            enclosing.opt.response_slots.push(id);
            line.option_id = enclosing.opt.option_id;
            infer(file, "run-slot", `\`${id}\` names node ${d.choice_id} but no option; attached to ${enclosing.opt.option_id}'s response run by the section it is printed in (line ${row.lineNo}, heading line ${enclosing.lineNo}) — POSITIONAL, verify`);
            claimed.add(id);
            continue;
          }
          err(file, `line ${row.lineNo}: \`${id}\` has no option in its id, role "-${d.roleTail}", and no enclosing option section to attribute it to`);
          continue;
        }
        if (d.variant) node.variantSetups.push({ id, selector: d.variant });
        node.setupLines.push(id);
        claimed.add(id);
        continue;
      }
      const opt = node.options.get(d.option_id);
      if (!opt) {
        err(file, `line ${row.lineNo}: \`${id}\` names option ${d.option_id}, which has no option heading in this file`);
        continue;
      }
      // A `-div` variant is the SIBLING text of its `-norm`, not a second slot:
      // one of the pair is wired and the other rides it through
      // `path_variants`, which is exactly the field's contract. Wiring both
      // would print the divert text to the normal-path player as well.
      if (d.variant === "div") {
        node.pendingDiverts.push({ divId: id, normId: id.replace(/-div$/, "-norm"), lineNo: row.lineNo });
        claimed.add(id);
        continue;
      }
      if (d.role === "p") {
        if (opt.player_line) err(file, `line ${row.lineNo}: option ${d.option_id} has two \`-p\` slots`);
        opt.player_line = id;
      } else if (d.role === "act") {
        if (opt.actSlot) err(file, `line ${row.lineNo}: option ${d.option_id} has two \`-act\` slots`);
        opt.actSlot = id;
        // The deed slot heads the option's run, exactly as the existing
        // SC-T2-09/10 scenes carry it.
        opt.response_slots.push(id);
      } else {
        opt.response_slots.push(id);
      }
      claimed.add(id);
    }
  }

  // --- option-heading speaker declarations, applied or reported ---
  const lineById = new Map(contentLines.map((l) => [l.content_id, l]));
  for (const { opt } of optionHeadings) {
    for (const decl of opt.speakerDecl ?? []) {
      const all = /^responses?$/.test(decl.scope);
      const targets = opt.response_slots
        .map((id) => lineById.get(id))
        .filter((l) => l && l.slot_type === "dialogue");
      if (!all) {
        // "first response spoken by `juno`, second by `ilsa`" — POSITIONAL, and
        // the rows themselves already carry `Juno — ` prefixes, so the prefix is
        // trusted and this note is only reported.
        infer(file, "speaker", `${opt.option_id}: heading declares speakers POSITIONALLY ("${decl.scope} spoken by ${decl.who}") — not applied from the heading; the per-row speaker markings were used instead`);
        continue;
      }
      for (const l of targets) {
        if (l.speaker_id === decl.who) continue;
        if (l.speaker_id !== fm.defaultSpeaker) {
          warn(file, `\`${l.content_id}\`: option heading says responses are spoken by \`${decl.who}\`, the row marks \`${l.speaker_id}\` — the row won`);
          continue;
        }
        l.speaker_id = decl.who;
        infer(file, "speaker", `\`${l.content_id}\` -> \`${decl.who}\` from ${opt.option_id}'s heading ("responses spoken by \`${decl.who}\`"); the row itself carries no speaker marking`);
      }
    }
  }

  // --- variant selectors ---
  for (const node of nodes.values()) {
    for (const p of node.pendingDiverts) {
      if (!seenIds.has(p.normId)) {
        err(file, `line ${p.lineNo}: \`${p.divId}\` has no \`-norm\` sibling (\`${p.normId}\`) — a variant may not sit beside a bare base or alone (id-label-convention.md)`);
        continue;
      }
      node.path_variants = { ...(node.path_variants ?? {}), [p.normId]: p.divId };
      infer(file, "variant", `${node.choice_id}: path_variants { ${p.normId} -> ${p.divId} } — the \`-div\` text rides its \`-norm\` sibling rather than taking a slot of its own`);
    }
    if (!node.variantSetups.length) continue;
    const sels = node.variantSetups.map((v) => v.selector);
    const legacy = sels.filter((s) => LEGACY_SELECTORS.has(s));
    if (legacy.length) {
      warn(file, `${node.choice_id}: grandfathered variant selectors ${legacy.map((s) => "`-" + s + "`").join(", ")} — pre-2026-08-09 scheme, accepted, not to be minted again (id-label-convention.md)`);
    }
    const unknown = sels.filter((s) => !PATH_SELECTORS.has(s) && !LEGACY_SELECTORS.has(s) && !/^[a-z0-9_]+(?:-and-[a-z0-9_]+)?$/.test(s));
    for (const u of unknown) err(file, `${node.choice_id}: variant selector \`-${u}\` is outside the scheme (norm | div | flag name)`);
    if (sels.every((s) => PATH_SELECTORS.has(s)) && sels.length === 2) {
      const norm = node.variantSetups.find((v) => v.selector === "norm");
      const div = node.variantSetups.find((v) => v.selector === "div");
      if (norm && div) {
        node.path_variants = { ...(node.path_variants ?? {}), [norm.id]: div.id };
        infer(file, "variant", `${node.choice_id}: path_variants { ${norm.id} -> ${div.id} } from the \`-norm\`/\`-div\` set-up pair`);
      }
    }
  }

  // --- cross-check the front matter's POSITIONAL node talk against the gates ---
  if (fm.incomingStates) {
    // Only node numbers inside a clause that actually says "gate" count. The
    // same line also says things like "Node 6 is reached from the gather and
    // from the divert", which is not a gate statement — counting those produced
    // five false mismatches on the first pass.
    const stated = fm.incomingStates
      .split(/(?<=[.;])\s+/)
      .filter((s) => /gat(e|ed|es)\b|auto-skip/i.test(s))
      .flatMap((s) => [...s.matchAll(/nodes?\s+(\d+(?:\s*(?:,|and|&)\s*\d+)*)/gi)])
      .flatMap((m) => m[1].split(/\s*(?:,|and|&)\s*/))
      .map(Number)
      .filter((n) => Number.isFinite(n));
    if (stated.length) {
      const gatedNums = [...nodes.values()]
        .filter((n) => n.availability_conditions.length)
        .map((n) => Number(n.choice_id.split("-")[3]))
        .filter((n) => Number.isFinite(n));
      const missing = stated.filter((n) => !gatedNums.includes(n));
      const extra = gatedNums.filter((n) => !stated.includes(n));
      infer(
        file,
        "gate-crosscheck",
        `front matter names node(s) ${stated.join(", ")} positionally; gates parsed from headings land on node(s) ${gatedNums.join(", ") || "none"}` +
          (missing.length || extra.length ? ` — MISMATCH: stated-not-gated ${missing.join(", ") || "none"}; gated-not-stated ${extra.join(", ") || "none"}` : " — agree"),
      );
      if (missing.length) {
        warn(file, `front matter states node(s) ${missing.join(", ")} are gated, but no gate could be read from those node headings — POSITIONAL reference, needs a human check`);
      }
    }
  }

  // --- build the scene ---
  const existingNodeById = new Map((existingScene?.choice_nodes ?? []).map((n) => [n.choice_id, n]));
  const choice_nodes = [];
  for (const choiceId of nodeOrder) {
    const node = nodes.get(choiceId);
    if (!node.options.size) {
      err(file, `${choiceId} (${node.declaredFrom}) has no options — the schema allows 2 or 3, never 0`);
      continue;
    }
    if (node.options.size < 2 || node.options.size > 3) {
      err(file, `${choiceId}: ${node.options.size} option(s) — the schema allows 2 or 3`);
      continue;
    }
    if (!node.setupLines.length && !node.sceneLines.length) {
      err(file, `${choiceId}: no set-up or scene slot claims this node — nothing opens it`);
    }

    const prior = existingNodeById.get(choiceId);
    const options = node.optionOrder.map((optionId) => {
      const o = node.options.get(optionId);
      const priorOpt = (prior?.options ?? []).find((x) => x.option_id === optionId);
      const spoken = Boolean(o.player_line);
      if (spoken && o.actSlot) {
        err(file, `${optionId}: has BOTH a \`-p\` and an \`-act\` slot — exactly one of player_line / surface_action per option`);
      }
      if (!spoken && !o.actSlot && !o.response_slots.length) {
        err(file, `${optionId}: no \`-p\`, no \`-act\` and no response slot — nothing is authored for this option`);
      }
      if (o.declaredSpoken !== null && o.declaredSpoken !== spoken) {
        warn(file, `${optionId}: heading says "${o.declaredSpoken ? "spoken" : "deed"}" but the tables carry ${spoken ? "a `-p` slot" : "no `-p` slot"} — the tables were taken as truth`);
      }
      const out = {
        option_id: optionId,
        verb_family: o.verb_family ?? priorOpt?.verb_family ?? "Converse",
        response_slots: o.response_slots,
        state_actions: o.state_actions.length ? o.state_actions : (o.recordsNothing ? [] : priorOpt?.state_actions ?? []),
        rejoin: "gather",
      };
      if (!o.verb_family) {
        infer(file, "option", `${optionId}: no verb_family named in the heading — ${priorOpt?.verb_family ? `kept the graph's \`${priorOpt.verb_family}\`` : "defaulted to `Converse` (author-scenes.mjs's default)"}`);
      }
      const pv = o.player_verb ?? priorOpt?.player_verb;
      if (pv) out.player_verb = pv;
      if (spoken) out.player_line = o.player_line;
      else {
        // surface_action is the option's diegetic gist, per the existing
        // SC-T2-09/10 rows — NOT the bracketed `-act` slot text, which stays a
        // content line at the head of the response run.
        out.surface_action = o.gist || priorOpt?.surface_action || "";
        if (!out.surface_action) err(file, `${optionId}: unspoken option with no gist to carry surface_action`);
      }
      if (!o.state_actions.length && !o.recordsNothing && !priorOpt?.state_actions?.length) {
        warn(file, `${optionId}: no state_actions could be read from its heading and none exist in the graph — confirm against the thread doc`);
      }
      const dv = o.divert ?? (node.divert && node.divert.scope === "all" ? node.divert : null);
      if (dv) {
        out.rejoin = "divert";
        out.divert_to = dv.target;
        infer(file, "divert", `${optionId}: rejoin=divert -> ${dv.target}, read from the ${o.divert ? "option" : "node"} heading`);
      }
      return out;
    });

    const gists = node.optionOrder.map((id) => node.options.get(id).gist).filter(Boolean);
    const out = {
      choice_id: choiceId,
      scene_id: fm.scene_id,
      options,
      availability_conditions: node.availability_conditions,
      equal_weight_note:
        prior?.equal_weight_note ??
        `IMPORTED PLACEHOLDER (import-lines.mjs): line files carry no equal-weight note — the thread doc's content block does. Options: ${gists.join(" / ")}.`,
      no_accrual_note:
        prior?.no_accrual_note ??
        "IMPORTED PLACEHOLDER (import-lines.mjs): no counter keys off any option; verify against the thread doc's content block before the gate.",
    };
    // Reported off the VALUE, not off whether `prior` supplied it — otherwise a
    // second run against an already-imported graph reports zero placeholders
    // and the report quietly stops being the audit trail.
    if (/^IMPORTED PLACEHOLDER/.test(out.equal_weight_note)) {
      out.inferredNotes = ["equal_weight_note", "no_accrual_note"];
      infer(file, "note", `${choiceId}: equal_weight_note and no_accrual_note are IMPORTED PLACEHOLDERS — no line file carries either; the thread doc's content block does`);
    }
    // parent_option is structural: it falls straight out of the choice id.
    const seg = choiceId.split("-");
    if (seg.length > 4) {
      out.parent_option = seg.slice(0, seg.length - 1).join("-");
    }
    if (node.path_variants) out.path_variants = node.path_variants;
    // `gather_line` is an authorial call — which slot stands at the gather after
    // a branch converges — and no line file states it. Where the graph already
    // has one, it is kept; the 26 new scenes get none, which is honest: an
    // unauthored gather keeps its generated placeholder rather than reading as
    // finished content (choice-node-schema.md).
    if (prior?.gather_line) {
      out.gather_line = prior.gather_line;
      infer(file, "gather_line", `${choiceId}: gather_line \`${prior.gather_line}\` preserved from the graph — no line file states a gather line`);
    }
    if (node.availability_conditions.length) {
      out.gate_source = "inferred by import-lines.mjs from the node heading — audit before the gate";
    }
    choice_nodes.push(out);
  }

  // --- unclaimed slots, both directions (rule 8) ---
  for (const l of contentLines) {
    if (!claimed.has(l.content_id)) {
      err(file, `slot \`${l.content_id}\` was parsed but claimed by NO target (no node, option or response run took it)`);
    }
  }
  const referenced = new Set();
  for (const n of choice_nodes) {
    for (const o of n.options) {
      if (o.player_line) referenced.add(o.player_line);
      for (const r of o.response_slots) referenced.add(r);
    }
    if (n.gather_line) referenced.add(n.gather_line);
    for (const [k, v] of Object.entries(n.path_variants ?? {})) { referenced.add(k); referenced.add(v); }
  }
  const byId = new Map(contentLines.map((l) => [l.content_id, l]));
  for (const r of referenced) {
    if (!byId.has(r)) err(file, `option/node references content_id \`${r}\`, which no table in this file authors`);
  }

  const scene = {
    scene_id: fm.scene_id,
    soul: fm.soul,
    screen_id: (fm.scene_id ?? "SC-??").split("-")[1],
    note:
      `Imported from lantern-projects/v01/threads/lines/${file} by scripts/import-lines.mjs. ` +
      `The line file is the source of truth for every slot's id, slot_type, speaker and text. ` +
      `Structure (options, gates, records) is read from the node and option headings; anything the parse ` +
      `inferred is listed in reports/import-lines-report.md and flagged in-place (gate_source / inferredNotes).`,
    lines: contentLines,
    choice_nodes,
  };
  // Entry gates are NOT set by this importer by default.
  //
  // A wrong entry gate does not fail loudly — it makes a whole conversation
  // silently unreachable, which is the exact failure the thread docs cite
  // (`ilsa-kin-no-show` C2 shipped broken and stayed broken). So the gate is
  // only ever written from the authoritative ENTRY_GATES table above, and only
  // under `--entry-gates`. Without the flag the graph's existing gates are
  // preserved and the table is reported, not applied.
  //
  // Precedence, deliberately: ENTRY_GATES wins over a file's own front-matter
  // **ENTRY GATE** line. The table is the ratified artefact; the front-matter
  // line is one author's local note, and where the two disagree the
  // disagreement is reported rather than silently reconciled.
  const tableGate = ENTRY_GATES.get(fm.scene_id ?? "");
  if (tableGate && ENTRY_GATE_MODE) {
    if (tableGate.length) {
      scene.entry_gate = tableGate;
      infer(file, "entry_gate", `${fm.scene_id}: entry_gate ${JSON.stringify(tableGate)} APPLIED from the authoritative ENTRY_GATES table (--entry-gates)`);
    } else {
      infer(file, "entry_gate", `${fm.scene_id}: no entry_gate — the authoritative ENTRY_GATES table declares this conversation ungated (opens the thread)`);
    }
    if (fm.entryGate.length && JSON.stringify(fm.entryGate) !== JSON.stringify(tableGate)) {
      warn(file, `${fm.scene_id}: the file's front-matter **ENTRY GATE** line reads ${JSON.stringify(fm.entryGate)} but the authoritative table says ${JSON.stringify(tableGate)}. The TABLE was applied. Worth a look — one of the two is stale.`);
    }
  } else if (tableGate) {
    if (tableGate.length) {
      warn(file, `${fm.scene_id}: the ENTRY_GATES table declares **${tableGate.map((g) => "`" + g + "`").join(", ")}**, NOT applied — re-run with \`--entry-gates\` to write it.`);
    }
    if (existingScene?.entry_gate?.length) {
      scene.entry_gate = existingScene.entry_gate;
      infer(file, "entry_gate", `${fm.scene_id}: entry_gate ${JSON.stringify(existingScene.entry_gate)} preserved from the existing graph (--entry-gates not passed)`);
    }
  } else if (existingScene?.entry_gate?.length) {
    // A scene the table does not cover keeps whatever the graph already has.
    scene.entry_gate = existingScene.entry_gate;
    infer(file, "entry_gate", `${fm.scene_id}: entry_gate ${JSON.stringify(existingScene.entry_gate)} preserved from the existing graph (the ENTRY_GATES table does not cover this scene)`);
  }
  return { scene, fm, tables: tables.length, slots: contentLines.length };
}

// ===========================================================================
// run
// ===========================================================================

const doc = JSON.parse(readFileSync(GRAPH_FILE, "utf8"));
const sg = doc.scene_graph ?? doc;
const existingById = new Map(sg.scenes.map((s) => [s.scene_id, s]));

const files = readdirSync(LINES_DIR).filter((f) => /\.md$/.test(f)).sort();
const results = [];
for (const f of files) {
  const text = readFileSync(join(LINES_DIR, f), "utf8");
  const sceneIdGuess = firstBacktick((text.split(/\r?\n/)[0] ?? "").split("·").pop() ?? "");
  const r = parseFile(f, text, existingById.get(sceneIdGuess ?? ""));
  results.push({ file: f, ...r });
}

// Scene ids must be unique across the corpus.
const sceneSeen = new Map();
for (const r of results) {
  const id = r.scene.scene_id;
  if (sceneSeen.has(id)) err(r.file, `scene id ${id} is also claimed by ${sceneSeen.get(id)}`);
  else sceneSeen.set(id, r.file);
}

// The ENTRY_GATES table must line up exactly with the corpus it gates. A row
// naming a scene no file authors, or an authored scene the table forgot, is the
// silent-unreachability failure mode, so both block the write.
{
  const authored = new Set(results.map((r) => r.scene.scene_id));
  for (const id of ENTRY_GATES.keys()) {
    if (!authored.has(id)) err("ENTRY_GATES", `the table has a row for ${id}, which no line file authors`);
  }
  for (const id of authored) {
    if (!ENTRY_GATES.has(id)) err("ENTRY_GATES", `${id} is authored but the table has no row for it — every conversation must declare its entry gate, even if it is empty`);
  }
  // Every `played(x)` a gate names must be a scene that exists, or the gate
  // throws at compile time rather than at import time.
  const known = new Set([...authored, ...sg.scenes.map((s) => s.scene_id)]);
  for (const [id, gate] of ENTRY_GATES) {
    for (const g of gate) {
      const m = /^played\(([^)]+)\)$/.exec(g);
      if (m && !known.has(m[1])) err("ENTRY_GATES", `${id}'s gate \`${g}\` names scene ${m[1]}, which is not in the graph`);
    }
  }
}

// Cross-scene: a parent_option must resolve inside its own scene.
for (const r of results) {
  const opts = new Set(r.scene.choice_nodes.flatMap((n) => n.options.map((o) => o.option_id)));
  for (const n of r.scene.choice_nodes) {
    if (n.parent_option && !opts.has(n.parent_option)) {
      err(r.file, `${n.choice_id} names parent_option ${n.parent_option}, which is not an option in ${r.scene.scene_id}`);
    }
    if (n.parent_option) {
      const depth = (n.choice_id.match(/-[a-c]-\d+/g) ?? []).length;
      if (depth > 2) err(r.file, `${n.choice_id} nests ${depth} levels deep; graph.MAX_NESTING is 2`);
    }
    for (const o of n.options) {
      if (o.divert_to && !r.scene.choice_nodes.some((x) => x.choice_id === o.divert_to)) {
        warn(r.file, `${o.option_id} diverts to ${o.divert_to}, which is not a node in this scene`);
      }
    }
  }
}

// --- totals ---
const totals = {
  files: results.length,
  scenes: results.length,
  nodes: results.reduce((a, r) => a + r.scene.choice_nodes.length, 0),
  options: results.reduce((a, r) => a + r.scene.choice_nodes.reduce((b, n) => b + n.options.length, 0), 0),
  lines: results.reduce((a, r) => a + r.scene.lines.length, 0),
  slotsBySharpType: {},
};
for (const r of results) {
  for (const l of r.scene.lines) {
    totals.slotsBySharpType[l.slot_type] = (totals.slotsBySharpType[l.slot_type] ?? 0) + 1;
  }
}

// --- report ---
mkdirSync(REPORT_DIR, { recursive: true });
const R = [];
R.push("# import-lines report");
R.push("");
R.push(`Generated ${new Date().toISOString()} by \`tools/resolver/scripts/import-lines.mjs\` (${WRITE ? "--write" : "dry run"}).`);
R.push("");
R.push("## Totals");
R.push("");
R.push("| | count |");
R.push("|---|---|");
R.push(`| line files parsed | ${totals.files} |`);
R.push(`| scenes constructed | ${totals.scenes} |`);
R.push(`| choice nodes | ${totals.nodes} |`);
R.push(`| options | ${totals.options} |`);
R.push(`| content lines (slots) | ${totals.lines} |`);
for (const [k, v] of Object.entries(totals.slotsBySharpType).sort()) R.push(`| — \`${k}\` | ${v} |`);
R.push(`| blocking errors | ${errors.length} |`);
R.push(`| warnings | ${warnings.length} |`);
R.push(`| inferences | ${inferred.length} |`);
R.push("");
R.push("## Per file");
R.push("");
R.push("| file | scene | soul | tables | slots | nodes | options | gated nodes | entry_gate |");
R.push("|---|---|---|---|---|---|---|---|---|");
for (const r of results) {
  const gated = r.scene.choice_nodes.filter((n) => n.availability_conditions.length).length;
  R.push(
    `| ${r.file} | ${r.scene.scene_id} | ${r.scene.soul} | ${r.tables} | ${r.slots} | ${r.scene.choice_nodes.length} | ${r.scene.choice_nodes.reduce((a, n) => a + n.options.length, 0)} | ${gated} | ${r.scene.entry_gate ? "`" + r.scene.entry_gate.join(" && ") + "`" : "—"} |`,
  );
}
R.push("");
const section = (title, rows, render) => {
  R.push(`## ${title} (${rows.length})`);
  R.push("");
  if (!rows.length) R.push("_none._");
  else for (const x of rows) R.push(`- ${render(x)}`);
  R.push("");
};
section("Blocking errors", errors, (e) => `**${e.file}** — ${e.msg}`);
section("Warnings", warnings, (w) => `**${w.file}** — ${w.msg}`);
for (const kind of [...new Set(inferred.map((i) => i.kind))].sort()) {
  section(`Inferred — ${kind}`, inferred.filter((i) => i.kind === kind), (i) => `**${i.file}** — ${i.msg}`);
}
writeFileSync(REPORT_FILE, R.join("\n") + "\n", "utf8");

console.log(`report: ${REPORT_FILE}`);
console.log(
  `files=${totals.files} scenes=${totals.scenes} nodes=${totals.nodes} options=${totals.options} slots=${totals.lines}`,
);
console.log(`  by slot_type: ${JSON.stringify(totals.slotsBySharpType)}`);
console.log(`errors=${errors.length} warnings=${warnings.length} inferred=${inferred.length}`);

if (errors.length) {
  console.error(`\nNOT WRITING scene-graph.json — ${errors.length} blocking error(s). First 25:`);
  for (const e of errors.slice(0, 25)) console.error(`  ${e.file}: ${e.msg}`);
  process.exit(1);
}
if (!WRITE) {
  console.log("\nDry run clean. Re-run with --write to update data/scene-graph.json.");
  process.exit(0);
}

// --- write ---
for (const r of results) {
  const at = sg.scenes.findIndex((s) => s.scene_id === r.scene.scene_id);
  if (at >= 0) sg.scenes[at] = r.scene;
  else sg.scenes.push(r.scene);
}
// Mara's soul entry exists but carries no role_tag; the role is real
// (data/role-workplace.json) and her card names it (cast/mara.md, ratified
// 2026-08-07). Without it roleGoals.ts has no role to read for her scenes.
const mara = sg.souls.find((s) => s.soul_id === "mara");
if (mara && !mara.role_tag) {
  mara.role_tag = "Herbalist";
  mara.role_tag_note =
    "D7. Ratified by Roc 2026-08-07 (cast/mara.md): Herbalist, chosen because it is plot-inert — her pressure is time-side, so the role stays out of the way. Added by scripts/import-lines.mjs with her 9 authored conversations.";
}
// One import note, replaced rather than appended: re-running the importer is
// the normal way to pick up a line-file edit, and an appending note would grow
// a line of history into the data file on every run.
const IMPORT_NOTE_RE = / \| GP-133 line-file import [^|]*/g;
doc.note =
  (doc.note ?? "").replace(IMPORT_NOTE_RE, "") +
  ` | GP-133 line-file import ${new Date().toISOString().slice(0, 10)}: ${totals.scenes} scenes, ${totals.nodes} nodes, ${totals.lines} slots imported from lantern-projects/v01/threads/lines/ by scripts/import-lines.mjs. See reports/import-lines-report.md for every inference.`;
writeFileSync(GRAPH_FILE, JSON.stringify(doc, null, 2) + "\n", "utf8");
console.log(`\nscene-graph.json written: ${sg.scenes.length} scenes total`);
