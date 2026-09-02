/**
 * Content index generator (GP-102 item 4).
 *
 * Lantern must never read the game-project content directory directly — the
 * content silo is authored prose/inventory data, not resolver graph data, and
 * letting a UI tool walk it freely means every future content-shape change
 * becomes a lantern break too. So this is the one place that reads
 * content/items and content/key-items, and it emits a small, stable,
 * normalized index that lantern reads instead.
 *
 * NEVER reads content/magic/ — magic is not placeable, so it has no business
 * in a placement index. This is a hard rule, not an oversight to "complete".
 *
 * source_locations is copied verbatim from the source files. It uses a
 * vocabulary that does not line up with screen ids yet — that mismatch is
 * GP-106, tracked separately, and this script does not try to fix it by
 * guessing a mapping.
 *
 * Run: node scripts/build-content-index.mjs [--check]
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const CONTENT_DIR = join(ROOT, "..", "..", "content");
const OUT_FILE = join(ROOT, "..", "..", "lantern-projects", "v01", "content-index.json");

/** Read every non-underscore-prefixed *.json in a dir, normalized to {id, kind, label, category, source_locations, ...extra}. */
function scanDir(dir, { idField, kind, extra }) {
  if (!existsSync(dir)) return [];
  const entries = [];
  for (const basename of readdirSync(dir)) {
    if (basename.startsWith("_")) continue; // _index.md, _schema-report.json, etc. — not content records
    if (!basename.endsWith(".json")) continue;
    const raw = JSON.parse(readFileSync(join(dir, basename), "utf8"));
    const entry = {
      id: raw[idField],
      kind,
      label: raw.description,
      category: raw.category,
      // Copied verbatim — never parsed or normalized. See GP-106.
      source_locations: raw.source_locations,
    };
    if (extra) Object.assign(entry, extra(raw));
    entries.push(entry);
  }
  return entries;
}

/** Build the index in memory from the content directory. Does not touch the filesystem output. */
function buildIndex(rootDir) {
  const items = scanDir(join(rootDir, "items"), {
    idField: "item_id",
    kind: "item",
  });
  const keyItems = scanDir(join(rootDir, "key-items"), {
    idField: "key_item_id",
    kind: "key-item",
    extra: (raw) => ({ status: raw.status }),
  });
  // content/magic/ is intentionally never scanned — magic is not placeable.

  const entries = [...items, ...keyItems].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { generated: new Date().toISOString().slice(0, 10), entries };
}

/** Fields that live in the index — everything else (status_note, role, origin, made_from, ...) is out of scope for drift. */
const EMITTED_FIELDS = ["label", "category", "status"];

function fieldsOf(entry) {
  const out = {};
  for (const f of EMITTED_FIELDS) if (f in entry) out[f] = entry[f];
  return out;
}

function sameFields(a, b) {
  return JSON.stringify(fieldsOf(a)) === JSON.stringify(fieldsOf(b));
}

/**
 * Compare a committed index against a freshly rebuilt one, on emitted fields
 * only. Removals are reported but never silently dropped — a region or a
 * pending placement note may still point at a removed id, and clobbering
 * that trail on a routine rebuild would be a data-loss bug wearing a build
 * script's clothes.
 */
function diffIndex(committed, rebuilt) {
  const byId = (idx) => new Map(idx.entries.map((e) => [e.id, e]));
  const before = byId(committed);
  const after = byId(rebuilt);

  const added = [];
  const removed = [];
  const changed = [];

  for (const [id, entry] of after) {
    if (!before.has(id)) added.push(entry);
    else if (!sameFields(before.get(id), entry)) changed.push({ id, from: fieldsOf(before.get(id)), to: fieldsOf(entry) });
  }
  for (const [id, entry] of before) {
    if (!after.has(id)) removed.push(entry);
  }

  // The written result keeps every committed entry that still exists (with
  // rebuilt field values for anything changed), adds new ones, and KEEPS
  // removed ones as-is rather than dropping them — see the doc comment above.
  const keptIds = new Set();
  const nextEntries = [];
  for (const [id, entry] of after) {
    nextEntries.push(entry);
    keptIds.add(id);
  }
  for (const [id, entry] of before) {
    if (!keptIds.has(id)) nextEntries.push(entry); // removed from source, kept in the index
  }
  nextEntries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const clean = added.length === 0 && removed.length === 0 && changed.length === 0;
  return {
    added,
    removed,
    changed,
    clean,
    next: { generated: rebuilt.generated, entries: nextEntries },
  };
}

export { buildIndex, diffIndex, scanDir, CONTENT_DIR, OUT_FILE };

// ---------------------------------------------------------------------------

function main() {
  const check = process.argv.includes("--check");
  const rebuilt = buildIndex(CONTENT_DIR);

  if (!check) {
    writeFileSync(OUT_FILE, JSON.stringify(rebuilt, null, 2) + "\n", "utf8");
    console.log(`content-index.json: ${rebuilt.entries.length} entries written`);
    return;
  }

  if (!existsSync(OUT_FILE)) {
    writeFileSync(OUT_FILE, JSON.stringify(rebuilt, null, 2) + "\n", "utf8");
    console.log(`content-index.json: no committed file found, wrote ${rebuilt.entries.length} entries`);
    return;
  }

  const committed = JSON.parse(readFileSync(OUT_FILE, "utf8"));
  const diff = diffIndex(committed, rebuilt);

  if (diff.added.length) {
    console.log(`ADDED (${diff.added.length}): ${diff.added.map((e) => e.id).join(", ")}`);
  }
  if (diff.changed.length) {
    console.log(`CHANGED (${diff.changed.length}):`);
    for (const c of diff.changed) {
      console.log(`  ${c.id}: ${JSON.stringify(c.from)} -> ${JSON.stringify(c.to)}`);
    }
  }
  if (diff.removed.length) {
    console.log(`!! REMOVED (${diff.removed.length}) — kept in the index, NOT dropped: ${diff.removed.map((e) => e.id).join(", ")}`);
    console.log("!! A region or pending placement note may still reference these ids. Investigate before deleting them by hand.");
  }

  if (diff.added.length || diff.changed.length) {
    writeFileSync(OUT_FILE, JSON.stringify(diff.next, null, 2) + "\n", "utf8");
    console.log("content-index.json: rewritten with additions/changes.");
  }

  if (diff.clean) {
    console.log("content-index.json: clean, no drift.");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
