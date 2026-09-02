// Guardrail check 11 — required examinables (`../../../narrative-pipeline/guardrails.md`).
//
// A thread document DECLARES its examinables in a "Proposed examinables" table
// (choice-node-schema.md, ruled 2026-08-04). `screen-specs.json` says which
// examinables are actually BUILT. Nothing joined the two, so `ex-shelf` was
// declared, referenced as load-bearing, and never built — and the thread's C4
// payoff was unreachable through a design pass, a review, two line passes and
// three QA walks.
//
// This module is the join. It reads the declaration, reads the build, and
// reports every declaration the build does not satisfy.
//
// Deliberately narrow, same posture as conditions.ts: it reports only what the
// two documents disagree about — a declaration with no build, a build on the
// wrong screen, a build that sets no flag or the wrong one. It never edits a
// thread document and never invents an examinable.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Examinable, ScreenSpec } from "./types.ts";

export type DeclaredStatus = "BUILT" | "PROPOSED" | "UNMARKED";

export interface DeclaredExaminable {
  /** examinable id exactly as the thread document writes it */
  id: string;
  /** the screen the declaration puts it on */
  screen_id: string;
  /** the knowledge flag the declaration says it sets ("" when the table leaves it blank) */
  knowledge_flag: string;
  /** the path the declaration says it reopens (prose, reported not checked) */
  reopens: string;
  /** BUILT / PROPOSED as the document marks it; UNMARKED when it says neither */
  status: DeclaredStatus;
  /** file the declaration came from */
  source: string;
}

export type ExaminableProblemKind =
  | "not-built"
  | "wrong-screen"
  | "no-flag"
  | "flag-mismatch";

export interface ExaminableProblem {
  kind: ExaminableProblemKind;
  declared: DeclaredExaminable;
  /** the built examinable this was matched against, when one was found */
  built?: { screen_id: string; examinable: Examinable };
  reason: string;
}

// ---------- reading the declaration ----------

/** `` `ex-shelf` `` / **bold** / trailing footnote markers -> the bare value. */
function cell(raw: string): string {
  return raw
    .replace(/`/g, "")
    .replace(/\*\*/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .trim();
}

const HEADING = /^#{1,6}\s+(.*\bexaminables?\b.*)$/i;
const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const TABLE_RULE = /^\s*\|[\s:|-]+\|\s*$/;

function splitRow(line: string): string[] {
  const m = TABLE_ROW.exec(line);
  if (!m) return [];
  return m[1].split("|").map(cell);
}

/** Which column holds what. Names are matched loosely because the table is human-written. */
function columnIndex(headers: string[], names: string[]): number {
  return headers.findIndex((h) => {
    const k = h.toLowerCase();
    return names.some((n) => k === n || k.startsWith(n));
  });
}

/**
 * Every examinable declared by one thread document.
 *
 * The section is found by its heading — any heading naming "examinables",
 * which covers both "Proposed examinables" (today's shape) and a future
 * "Required examinables". The heading's own wording supplies the default
 * status, so a table with no status column still reads as PROPOSED under a
 * "Proposed examinables" heading; an explicit Status/Built column wins.
 */
export function parseDeclaredExaminables(markdown: string, source = "thread"): DeclaredExaminable[] {
  const lines = markdown.split(/\r?\n/);
  const out: DeclaredExaminable[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const heading = HEADING.exec(lines[i]);
    if (!heading) continue;
    const headingDefault: DeclaredStatus = /\bproposed\b/i.test(heading[1]) ? "PROPOSED" : "UNMARKED";

    // Scan forward for this section's first table. Stop at the next heading —
    // a section with no table declares nothing, which is not an error here
    // (prose about examinables is allowed to exist).
    let j = i + 1;
    let headers: string[] | null = null;
    for (; j < lines.length; j += 1) {
      if (HEADING.test(lines[j]) || /^#{1,6}\s/.test(lines[j])) break;
      const row = splitRow(lines[j]);
      if (row.length >= 2 && !TABLE_RULE.test(lines[j])) {
        headers = row;
        j += 1;
        break;
      }
    }
    if (!headers) continue;
    if (j < lines.length && TABLE_RULE.test(lines[j])) j += 1;

    const idCol = columnIndex(headers, ["id"]);
    const screenCol = columnIndex(headers, ["screen"]);
    const flagCol = columnIndex(headers, ["sets", "flag"]);
    const reopensCol = columnIndex(headers, ["reopens", "path", "opens"]);
    const statusCol = columnIndex(headers, ["status", "state", "built"]);
    if (idCol < 0 || screenCol < 0) continue;

    for (; j < lines.length; j += 1) {
      const row = splitRow(lines[j]);
      if (row.length === 0) break;
      if (TABLE_RULE.test(lines[j])) continue;
      const id = row[idCol] ?? "";
      if (!id) continue;
      const rawStatus = statusCol >= 0 ? (row[statusCol] ?? "").toUpperCase() : "";
      const status: DeclaredStatus = rawStatus.includes("BUILT")
        ? "BUILT"
        : rawStatus.includes("PROPOSED")
          ? "PROPOSED"
          : headingDefault;
      out.push({
        id,
        screen_id: row[screenCol] ?? "",
        knowledge_flag: flagCol >= 0 ? (row[flagCol] ?? "") : "",
        reopens: reopensCol >= 0 ? (row[reopensCol] ?? "") : "",
        status,
        source,
      });
    }
  }
  return out;
}

/**
 * Every declaration in a threads folder.
 *
 * Top-level `*.md` only. `threads/lines/` holds line files, which reference
 * examinables in prose but declare none — walking into it would read a
 * mention as a declaration.
 */
export function loadDeclaredExaminables(threadsDir: string): DeclaredExaminable[] {
  const out: DeclaredExaminable[] = [];
  for (const name of readdirSync(threadsDir).sort()) {
    if (!name.endsWith(".md")) continue;
    const file = join(threadsDir, name);
    if (!statSync(file).isFile()) continue;
    out.push(...parseDeclaredExaminables(readFileSync(file, "utf8"), name));
  }
  return out;
}

// ---------- the join ----------

/**
 * Reconcile declared examinables against the built ones.
 *
 * Matching is by id and by id alone, so a declaration built on the wrong
 * screen reports as `wrong-screen` rather than silently as `not-built` — the
 * two need different fixes.
 */
export function checkRequiredExaminables(
  screens: ScreenSpec[],
  declared: DeclaredExaminable[],
): ExaminableProblem[] {
  const built = new Map<string, { screen_id: string; examinable: Examinable }>();
  for (const screen of screens) {
    for (const ex of screen.examinables ?? []) {
      built.set(ex.id, { screen_id: screen.screen_id, examinable: ex });
    }
  }

  const problems: ExaminableProblem[] = [];
  for (const d of declared) {
    const hit = built.get(d.id);
    if (!hit) {
      problems.push({
        kind: "not-built",
        declared: d,
        reason:
          `declared on ${d.screen_id || "an unnamed screen"} but no examinable "${d.id}" exists ` +
          `in screen-specs.json — every path this pickup reopens is unreachable`,
      });
      continue;
    }
    if (d.screen_id && hit.screen_id !== d.screen_id) {
      problems.push({
        kind: "wrong-screen",
        declared: d,
        built: hit,
        reason: `declared on ${d.screen_id}, built on ${hit.screen_id}`,
      });
    }
    // The flag is the whole point of a pickup (GP-111). A built examinable that
    // sets nothing reopens nothing, so it satisfies the declaration in name only.
    if (d.knowledge_flag) {
      const actual = hit.examinable.knowledge_flag;
      if (!actual) {
        problems.push({
          kind: "no-flag",
          declared: d,
          built: hit,
          reason:
            `built on ${hit.screen_id} but sets no knowledge_flag; the declaration says it sets ` +
            `"${d.knowledge_flag}", so the path it reopens still cannot open`,
        });
      } else if (actual !== d.knowledge_flag) {
        problems.push({
          kind: "flag-mismatch",
          declared: d,
          built: hit,
          reason: `declared sets "${d.knowledge_flag}", built sets "${actual}"`,
        });
      }
    }
  }
  return problems;
}

/** One line per problem, in the shape the CLI's other checks print. */
export function formatExaminableProblem(p: ExaminableProblem): string {
  return `required examinable [${p.kind}]: ${p.declared.id} (${p.declared.source}, ${p.declared.status}) — ${p.reason}`;
}
