/**
 * The editor's Node-side data collector.
 *
 * ONE JOB: assemble everything the four editor tabs render, REUSING the shipped
 * audit rather than re-deriving "authored vs referenced". It reads the same raw
 * sources `tools/content-audit.mjs` reads (content/ records + the resolver's run
 * folder) and calls the same pure `audit()` — so a screen the orphan check calls
 * unreachable is red in the editor for the same reason it fails the commit gate,
 * with no second copy of the logic to drift.
 *
 * It never writes content. The only thing the editor persists is the review
 * sidecar, which lives in `reviewStore.mjs`, not here.
 *
 * Node 24 strips types on import, so the `.ts` audit modules load directly —
 * the same mechanism that lets `content-audit.mjs` import them.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PHASER_ROOT = path.resolve(here, "..", "..", ".."); // tools/content-editor/server -> phaser
const PROJECT = path.resolve(PHASER_ROOT, ".."); // game-project
const CONTENT = path.join(PROJECT, "content");
const RUN = path.join(PROJECT, "lantern-projects", "v01");
const PUBLIC_STORY = path.join(PHASER_ROOT, "public", "story");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

/** Every record in a content dir. `_`-prefixed files are meta, never records. */
function readRecords(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .sort()
    .map((f) => readJson(path.join(dir, f)));
}

/** The run folder if it is there, `public/story` if it is not. Mirrors content-audit.mjs. */
function runDir(notes) {
  if (fs.existsSync(path.join(RUN, "graph.json"))) return RUN;
  notes.push(
    "lantern-projects/v01/graph.json is missing — read the COPY in public/story/ instead, " +
      "which is only as fresh as the last `npm run prep:content`.",
  );
  return PUBLIC_STORY;
}

/** The decoration category vocabulary, read off `src/magic/types.ts` (as content-audit does). */
function decorationCategories() {
  const src = fs.readFileSync(path.join(PHASER_ROOT, "src", "magic", "types.ts"), "utf8");
  const block = /export type ItemCategory\s*=([\s\S]*?);/.exec(src);
  if (!block) throw new Error("could not find `export type ItemCategory` in src/magic/types.ts");
  const names = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (names.length === 0) throw new Error("ItemCategory union parsed as empty");
  return names;
}

/** soul_id -> role, read off the run's personas.json. */
function soulRoles() {
  const file = path.join(RUN, "personas.json");
  if (!fs.existsSync(file)) return {};
  const personas = readJson(file);
  const roles = {};
  for (const [soul, p] of Object.entries(personas)) {
    // The role_tag is NESTED under `role` (soul.role.role_tag), not top-level.
    // It reads like "Blacksmith. Role-goal..." or "Farmer — ratified..." — the
    // role noun is the leading word up to the first punctuation.
    const tag = String(p?.role?.role_tag ?? p?.role_tag ?? "");
    const m = /^([A-Za-z]+)/.exec(tag.trim());
    if (m) roles[soul] = m[1];
  }
  return roles;
}

/** The role nouns any spell claims — the vocabulary a learn_source may name. */
const ROLE_NOUNS = ["mage", "blacksmith", "baker", "postman", "herbalist", "priest", "farmer"];

/**
 * Can a spell actually be learned in this run? Precise, not free-text: spells
 * attach to a ROLE, and an NPC teaches a spell only if some soul is dealt that
 * role. So reachability is "a soul holds the role", read off the run's personas,
 * NOT whether the learn_source prose happens to name someone.
 *
 * `sharesRole` carries the count of approved spells on the role. When a role is
 * held by ONE soul but owns MORE THAN ONE spell, that soul has to carry every
 * one of them — historically through `NpcTalkSystem.pickNpcSpells`, which could
 * only ever deal one clue at a time; since 2026-08-30 through the soul's own
 * SPB-* scenes, which is authoring work rather than a runtime rotation. Either
 * way the risk is the same and unresolved, so the flag stays.
 */
function teacherFor(spell, roles, roleSpellCount) {
  const role = String(spell.role ?? "");
  const roleNoun = role.toLowerCase();
  const npcs = Object.entries(roles)
    .filter(([, r]) => r.toLowerCase() === roleNoun)
    .map(([soul]) => soul);
  const sharesRole = roleSpellCount?.[roleNoun] ?? 1;

  // The Mage role is the player's own — Mage spells are start-known, not taught.
  if (roleNoun === "mage") {
    return { role, npcs, matched: true, sharesRole, atRisk: false, reason: "player spell — start known, no NPC teacher needed" };
  }
  const matched = npcs.length > 0;
  // Rotation ruling (Roc, 2026-08-18): the offered spell rotates by day, so ONE
  // soul teaches its whole role across the week. Reachability is now simply
  // "a soul holds the role" — the old one-per-soul at-risk case is resolved.
  const atRisk = false;
  let reason;
  if (!matched) reason = `NO soul holds the ${roleNoun} role in this run — unreachable`;
  else if (sharesRole > 1)
    reason = `taught by ${npcs.join("/")} — its ${sharesRole} ${roleNoun} spells rotate daily across the week`;
  else reason = `taught by ${npcs.join("/")} (${roleNoun})`;
  return { role, npcs, matched, sharesRole, atRisk, reason };
}

/** Canonical no-effect token, and the variants that mean the same thing said differently. */
const NO_EFFECT_CANON = "no_effect";
const NO_EFFECT_VARIANTS = [
  { re: /\bno_effect\b/i, form: "no_effect" },
  { re: /\bno effect\b/i, form: "no effect" },
  { re: /\bno physical effect\b/i, form: "no physical effect" },
];

function noEffectForm(text) {
  for (const v of NO_EFFECT_VARIANTS) if (v.re.test(text)) return v.form;
  return null;
}

/**
 * Load the shipped cue table (as data) so the editor can report, per spell,
 * whether an effect row and a no-effect row exist. The renderer plays them in
 * the browser; here we only need to know they are authored.
 */
async function cueCoverage(approvedSpellIds) {
  const cuesFile = path.join(PHASER_ROOT, "src", "render", "vfx", "cues.json");
  const table = readJson(cuesFile);
  const rows = Array.isArray(table.rules) ? table.rules : [];
  const has = (spellId, outcome) =>
    rows.some(
      (r) =>
        r.when?.type === "cast:resolved" &&
        r.when?.match?.spellId === spellId &&
        r.when?.match?.outcome === outcome,
    );
  const coverage = {};
  for (const id of approvedSpellIds) coverage[id] = { effect: has(id, "effect"), noEffect: has(id, "no-effect") };
  return coverage;
}

/** Assemble the whole editor payload. */
export async function collect() {
  const notes = [];
  const dir = runDir(notes);
  const graph = readJson(path.join(dir, "graph.json"));

  const spells = readRecords(path.join(CONTENT, "magic"));
  const items = readRecords(path.join(CONTENT, "items"));
  const keyItems = readRecords(path.join(CONTENT, "key-items"));

  // Placements, exactly as content-audit.mjs reads them.
  const placements = [];
  let days = 0;
  for (let d = 1; d <= 5; d++) {
    const file = path.join(dir, `day-${d}.json`);
    if (!fs.existsSync(file)) continue;
    days++;
    for (const fill of readJson(file).slot_fill ?? []) {
      placements.push({ soul: fill.soul, screen_id: fill.screen_id });
    }
  }
  if (days === 0) notes.push("no day-N.json files were found in the run folder.");

  // The world helpers the audit needs. Imported as .ts (Node strips types).
  // pathToFileURL: Windows absolute paths are not valid ESM specifiers on their own.
  const imp = (...seg) => import(pathToFileURL(path.join(PHASER_ROOT, ...seg)).href);
  const { audit } = await imp("src", "world", "audit", "rules.ts");
  const { NPC_GIFT_ITEM } = await imp("src", "world", "npcItems.ts");

  const gateRulesFile = [
    path.join(PHASER_ROOT, "src", "world", "gates", "data", "gateRules.json"),
    path.join(PHASER_ROOT, "src", "world", "data", "gateRules.json"),
  ].find((p) => fs.existsSync(p));
  const gateRulesRaw = gateRulesFile ? readJson(gateRulesFile) : null;
  const gateRules = gateRulesRaw ? (gateRulesRaw.rules ?? gateRulesRaw) : null;

  // Same fix as content-audit.mjs (Task 4, T19, 2026-08-24): `foragePoolToItem
  // .ts` is an identity shim post-reconciliation, and `collectExtraForage.ts`
  // is deleted — build the join from the graph itself, extras empty.
  const poolNames = new Set((graph.screens ?? []).flatMap((s) => s.forage ?? []));
  const foragePoolToItem = Object.fromEntries([...poolNames].map((p) => [p, p]));

  const result = audit({
    spells,
    items,
    keyItems,
    screens: graph.screens ?? [],
    scenes: graph.scenes ?? [],
    placements,
    foragePoolToItem,
    extraForagePools: {},
    npcGiftItems: Object.values(NPC_GIFT_ITEM),
    gateRules,
    decorationCategories: decorationCategories(),
  });
  const withNotes = { ...result, unchecked: [...notes, ...result.unchecked] };

  // Index findings by subject for quick per-row cross-reference.
  const findingsBySubject = {};
  for (const f of result.findings) (findingsBySubject[f.subject] ??= []).push(f);

  const roles = soulRoles();
  const approved = spells.filter((s) => s.status === "approved");
  // Approved spells per role — feeds the one-per-soul at-risk flag in teacherFor.
  const roleSpellCount = {};
  for (const s of approved) {
    const r = String(s.role ?? "").toLowerCase();
    roleSpellCount[r] = (roleSpellCount[r] ?? 0) + 1;
  }
  const approvedIds = approved.map((s) => s.spell_id);
  const coverage = await cueCoverage(approvedIds);
  const itemById = new Map(items.map((i) => [i.item_id, i]));

  // ---- Spells tab -------------------------------------------------------
  const spellRows = approved.map((s) => ({
    entryId: `spell:${s.spell_id}`,
    spell_id: s.spell_id,
    phrase: s.phrase,
    role: s.role,
    components: (s.components ?? []).map((id) => ({
      id,
      label: itemById.get(id)?.description ?? null,
    })),
    produces: s.produces ?? [],
    learn_source: s.learn_source ?? "",
    teacher: teacherFor(s, roles, roleSpellCount),
    cue: coverage[s.spell_id] ?? { effect: false, noEffect: false },
    findings: findingsBySubject[s.spell_id] ?? [],
  }));

  // ---- Screen unlocks tab ----------------------------------------------
  // A screen strands only if a lock names a gate the ENGINE can never clear.
  // Read the real rules (gateRules.json), NOT the provisional spellGates join:
  //   - bond / time / knowledge gates clear by playing → never stranded
  //   - a cast gate clears iff its spell is approved (and, if it names a
  //     receiver, that (spell,receiver) pair is authored)
  //   - a chain gate clears iff EVERY step's pair is authored (a step may target
  //     the product of an earlier step via onProductOf)
  //   - a gate with no rule at all can never clear → stranded
  const approvedIdSet = new Set(approvedIds);
  const authoredPair = new Set();
  for (const s of approved) for (const r of s.receivers ?? []) authoredPair.add(`${s.spell_id}×${r.receiver_id}`);
  const firstProduct = new Map(approved.map((s) => [s.spell_id, (s.produces ?? [])[0] ?? null]));
  const stepOk = (step, steps) => {
    if (!approvedIdSet.has(step.spellId)) return false;
    if (step.receiverId) return authoredPair.has(`${step.spellId}×${step.receiverId}`);
    if (typeof step.onProductOf === "number") {
      const prod = firstProduct.get(steps[step.onProductOf]?.spellId);
      return prod ? authoredPair.has(`${step.spellId}×${prod}`) : false;
    }
    return true; // a cast gate with no named receiver: any effect clears it
  };
  const ruleSatisfiable = (rule) => {
    if (!rule) return false;
    switch (rule.kind) {
      case "bond":
      case "time":
      case "knowledge":
        return true;
      case "cast":
        return stepOk(rule, []);
      case "chain":
        return (rule.steps ?? []).every((st, _i, arr) => stepOk(st, arr));
      default:
        return true; // unknown kind — do not over-flag
    }
  };
  const ruleFor = (gateId) =>
    !gateRules ? null : Array.isArray(gateRules) ? gateRules.find((r) => (r.gate_id ?? r.id) === gateId) : gateRules[gateId];
  const gateSatisfiable = (gateId) => ruleSatisfiable(ruleFor(gateId));
  const lockedGateIds = (status) => {
    const m = /^locked\((.+)\)$/.exec(String(status ?? "").trim());
    return m ? m[1].split(",").map((x) => x.trim()).filter(Boolean) : [];
  };
  const scenesByScreen = {};
  for (const sc of graph.scenes ?? []) {
    if (sc.screen_id) (scenesByScreen[sc.screen_id] ??= []).push(sc.scene_id);
  }
  const sceneNeverPlaced = new Set(
    result.findings.filter((f) => f.rule === "scene-never-placed").map((f) => f.subject),
  );
  const screenRows = (graph.screens ?? []).map((sc) => {
    const gates = lockedGateIds(sc.status);
    const blockingGates = gates.filter((g) => !gateSatisfiable(g));
    const strandedScenes = (scenesByScreen[sc.screen_id] ?? []).filter((id) => sceneNeverPlaced.has(id));
    const reachable = blockingGates.length === 0;
    return {
      entryId: `screen:${sc.screen_id}`,
      screen_id: sc.screen_id,
      name: sc.name ?? "",
      status: sc.status ?? "",
      gates,
      blockingGates,
      reachable,
      sceneCount: (scenesByScreen[sc.screen_id] ?? []).length,
      strandedScenes,
      reason: reachable
        ? gates.length
          ? `locked behind ${gates.join(", ")}, all clearable by play (cast / bond / time / knowledge)`
          : "reachable"
        : `strands — the engine has no way to clear ${blockingGates.join(", ")} (chain names unauthored cast pairs, or no rule exists)`,
    };
  });

  // ---- Items / Key items tab -------------------------------------------
  const unobtainable = new Set(
    result.findings.filter((f) => f.rule === "item-unobtainable").map((f) => f.subject),
  );
  const unused = new Set(result.findings.filter((f) => f.rule === "item-unused").map((f) => f.subject));
  const itemRows = items.map((i) => ({
    entryId: `item:${i.item_id}`,
    kind: "item",
    id: i.item_id,
    description: i.description ?? "",
    category: i.category ?? "",
    usedBy: i.used_by ?? [],
    obtainable: !unobtainable.has(i.item_id),
    used: !unused.has(i.item_id),
    findings: findingsBySubject[i.item_id] ?? [],
  }));
  const keyUncategorised = new Set(
    result.findings.filter((f) => f.rule === "key-item-uncategorised").map((f) => f.subject),
  );
  const keyItemRows = keyItems.map((k) => ({
    entryId: `keyitem:${k.key_item_id}`,
    kind: "key-item",
    id: k.key_item_id,
    description: k.description ?? "",
    category: k.category ?? "",
    role: k.role ?? "",
    categorised: !keyUncategorised.has(k.key_item_id),
    findings: findingsBySubject[k.key_item_id] ?? [],
  }));

  // ---- Receiver interactions tab ---------------------------------------
  // Every no-effect phrasing seen across approved receivers — so a row can be
  // flagged when it says the same thing a different way from the majority.
  const formCounts = {};
  for (const s of approved) {
    for (const r of s.receivers ?? []) {
      const form = noEffectForm(String(r.physical_outcome ?? ""));
      if (form) formCounts[form] = (formCounts[form] ?? 0) + 1;
    }
  }
  const receiverRows = [];
  for (const s of approved) {
    for (const r of s.receivers ?? []) {
      const outcome = String(r.physical_outcome ?? "");
      const form = noEffectForm(outcome);
      const isNoEffect = form !== null;
      const mismatch = isNoEffect && form !== NO_EFFECT_CANON;
      receiverRows.push({
        entryId: `receiver:${s.spell_id}:${r.receiver_id}`,
        spell_id: s.spell_id,
        receiver_id: r.receiver_id,
        receiver_class: r.receiver_class,
        physical_outcome: outcome,
        reaction_kind: r.reaction_kind ?? null,
        stateful: r.receiver_class === "stateful",
        noEffect: isNoEffect,
        noEffectForm: form,
        mismatch,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    source: {
      runDir: path.relative(PROJECT, dir),
      days,
      approvedSpells: approved.length,
      rejectedSpells: spells.length - approved.length,
    },
    noEffectForms: formCounts,
    canonicalNoEffect: NO_EFFECT_CANON,
    spells: spellRows,
    screens: screenRows,
    items: itemRows,
    keyItems: keyItemRows,
    receivers: receiverRows,
    audit: withNotes,
  };
}
