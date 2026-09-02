// gen-thread-prose.mjs — derives src/lib/threadProse.json from the per-soul
// thread registries at ../../../cast/*-threads.md.
//
// GP-96 (2026-08-10, Roc: "go with option 1"): the id -> prose map ThreadsPanel
// needs is PARSED AT BUILD from the registries, never hand-maintained — a
// second hand-typed copy is exactly the drift the registries' id column was
// added to expose (GP-92). This mirrors gen-personas.mjs's pattern: cast/ is
// the read-only source of truth, this script is the only writer of the
// generated fixture, and a staleness test (test/threadProseFixture.test.ts)
// fails if the fixture and a fresh render disagree.
//
// The three deep souls each keep a registry (`cast/[soul]-[role]-threads.md`,
// GP-92); the texture souls (Juno, Pip, Bex) carry no threads and have no
// registry file, so they contribute no rows here — nothing to guard against,
// there is simply no file to read.
//
// Only RATIFIED rows are mapped. A row that is deferred/parked/rejected/retired
// has no business explaining a thread id shown in a LIVE session — and
// `giver-receive` (retired, still emitted by v01 content per GP-90) must NOT
// resolve through this map, so ThreadsPanel's raw-id fallback gets exercised.
//
// Run:   npm run gen:thread-prose    (from tools/lantern)
// Test:  test/threadProseFixture.test.ts fails if the fixture is stale.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CAST_DIR = path.resolve(HERE, "../../../cast");
export const FIXTURE = path.resolve(HERE, "../src/lib/threadProse.json");

/** The three per-soul registries (GP-92 — the authoritative home for thread ids). */
const REGISTRIES = [
  "toby-baker-threads.md",
  "ilsa-blacksmith-threads.md",
  "mara-herbalist-threads.md",
];

/** Strip light markdown (bold/italic asterisks, code ticks) from a table cell. */
function clean(s) {
  return s.replace(/\*/g, "").replace(/`/g, "").trim();
}

/**
 * Ratified rows of the LIVE table only — the part of the file before the
 * "## Not in play" heading, which holds deferred/parked/rejected/retired rows
 * (and, before 2026-08-09, would have also held ids no longer live at all).
 */
function ratifiedRows(md) {
  const live = md.split(/\n##\s+Not in play/)[0];
  const lines = live.split("\n").filter((l) => l.trim().startsWith("|"));
  const rows = [];
  for (const line of lines) {
    // drop the header row and the `| --- | --- |` separator row
    if (/^\|\s*Thread\s*\|/.test(line.trim())) continue;
    if (/^\|\s*-+\s*\|/.test(line.trim())) continue;
    const cells = line.split("|").map((c) => c.trim());
    // cells[0] and cells[last] are the empty strings outside the leading/
    // trailing pipe; the 7 columns (Thread, open question, moves when,
    // action/conflict, type, reveals, status) fill indices 1..7.
    const [, thread, openQuestion, , , , , status] = cells;
    if (!thread || !status) continue;
    if (!/^\*{0,2}RATIFIED/.test(status.trim())) continue;
    rows.push({ id: clean(thread), prose: clean(openQuestion) });
  }
  return rows;
}

export function buildThreadProse(castDir = CAST_DIR) {
  const out = {};
  for (const file of REGISTRIES) {
    const full = path.join(castDir, file);
    const md = fs.readFileSync(full, "utf-8");
    for (const { id, prose } of ratifiedRows(md)) {
      if (id in out) throw new Error(`${file}: duplicate ratified thread id ${id}`);
      out[id] = prose;
    }
  }
  return out;
}

export function renderThreadProse(castDir = CAST_DIR) {
  return JSON.stringify(buildThreadProse(castDir), null, 2) + "\n";
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const json = renderThreadProse();
  fs.writeFileSync(FIXTURE, json);
  console.log(`wrote ${FIXTURE} from ${CAST_DIR}`);
}
