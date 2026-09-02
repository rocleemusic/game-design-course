// GP-111 — an examinable can set a knowledge flag (R5's pickup path).
// GP-112 — guardrails.md check 11: a declared examinable must be built.
//
// The two are one feature seen from both ends: GP-111 adds the field, GP-112
// is the check that the field is filled where a thread document says it is.

import { test } from "node:test";
import assert from "node:assert/strict";
import { loadData } from "../src/data.ts";
import { buildGraph } from "../src/graph.ts";
import { emitInk } from "../src/ink.ts";
import { compileInkFiles } from "./helpers/compile.ts";
import {
  checkRequiredExaminables,
  parseDeclaredExaminables,
  type DeclaredExaminable,
} from "../src/examinables.ts";
import type { ResolverData, ScreenSpec } from "../src/types.ts";

// ---------------------------------------------------------------- GP-111

/**
 * The fixtures with one pickup wired: T2's `bread_stall` records
 * `shelf_seen`. Built in memory rather than in fixtures/screen-specs.json so
 * every other suite keeps measuring the unwired baseline.
 */
function dataWithPickup(): ResolverData {
  const data = loadData();
  const t2 = data.screens.find((s) => s.screen_id === "T2")!;
  t2.examinables = (t2.examinables ?? []).map((e) =>
    e.id === "bread_stall" ? { ...e, knowledge_flag: "shelf_seen" } : e,
  );
  return data;
}

test("an examinable's knowledge_flag is declared in KnownPhrases", () => {
  const graph = buildGraph(dataWithPickup());
  const known = graph.variables.find((v) => v.name === "KnownPhrases")!;
  assert.match(known.declaration, /\bshelf_seen\b/);
});

test("the examinable is listed as a writer of KnownPhrases", () => {
  const graph = buildGraph(dataWithPickup());
  const known = graph.variables.find((v) => v.name === "KnownPhrases")!;
  assert.ok(
    known.writers.includes("bread_stall"),
    `expected bread_stall among writers, got ${known.writers.join(", ")}`,
  );
});

test("no knowledge_flag means no phrase and no writer — the field is optional", () => {
  const graph = buildGraph(loadData());
  const known = graph.variables.find((v) => v.name === "KnownPhrases")!;
  assert.doesNotMatch(known.declaration, /\bshelf_seen\b/);
  assert.ok(!known.writers.includes("bread_stall"));
});

test("the examinable stitch records the flag, guarded on not-already-known", () => {
  const files = emitInk(buildGraph(dataWithPickup()));
  const t2 = files.get("world/t2.ink")!;
  assert.match(t2, /=\s*bread_stall/);
  assert.match(t2, /\{ not \(KnownPhrases \? shelf_seen\):/);
  assert.match(t2, /~ KnownPhrases \+= shelf_seen/);
  assert.match(t2, /~ recordKnowledge\("shelf_seen"\)/);
});

test("the look stays sticky and re-clickable", () => {
  const files = emitInk(buildGraph(dataWithPickup()));
  const t2 = files.get("world/t2.ink")!;
  // `+` is sticky; `*` would spend the look on first use, which is the one
  // thing a pickup must never do — a thing on a shelf does not vanish.
  assert.match(t2, /^\+ \[Look at bread stall\] -> bread_stall$/m);
});

test("an examinable with no flag emits no state lines", () => {
  const files = emitInk(buildGraph(loadData()));
  const t2 = files.get("world/t2.ink")!;
  assert.doesNotMatch(t2, /recordKnowledge/);
});

test("the tree with a pickup still compiles clean", () => {
  const result = compileInkFiles(emitInk(buildGraph(dataWithPickup())));
  assert.deepEqual(result.errors, [], result.errors.join("\n"));
});

// ---------------------------------------------------------------- GP-112

const THREAD_DOC = `
## Proposed examinables

**Not built.**

| id | Screen | Sets | Reopens |
|---|---|---|---|
| \`ex-shelf\` | T2 | \`shelf_seen\` | C1's closed path |
`;

const screens = (examinables: ScreenSpec["examinables"]): ScreenSpec[] => [
  { screen_id: "T2", location: "town", name: "Market Row", status: "start", examinables },
];

test("the declaration table parses, and the heading supplies PROPOSED", () => {
  const declared = parseDeclaredExaminables(THREAD_DOC, "toby-the-shelf.md");
  assert.equal(declared.length, 1);
  assert.deepEqual(declared[0], {
    id: "ex-shelf",
    screen_id: "T2",
    knowledge_flag: "shelf_seen",
    reopens: "C1's closed path",
    status: "PROPOSED",
    source: "toby-the-shelf.md",
  });
});

test("an explicit Status column beats the heading's default", () => {
  const doc = `
### Examinables

| id | Screen | Sets | Status |
|---|---|---|---|
| \`ex-shelf\` | T2 | \`shelf_seen\` | BUILT |
`;
  assert.equal(parseDeclaredExaminables(doc)[0].status, "BUILT");
});

test("prose about examinables with no table declares nothing", () => {
  const doc = "## Examinables\n\nex-shelf is load-bearing.\n";
  assert.deepEqual(parseDeclaredExaminables(doc), []);
});

const declaration: DeclaredExaminable = {
  id: "ex-shelf",
  screen_id: "T2",
  knowledge_flag: "shelf_seen",
  reopens: "C1's closed path",
  status: "PROPOSED",
  source: "toby-the-shelf.md",
};

test("THE FAILURE THIS EXISTS FOR: declared, never built", () => {
  const problems = checkRequiredExaminables(
    screens([{ id: "stall_goods", clue_tier: "soft-signpost", region: "r_stall_goods" }]),
    [declaration],
  );
  assert.equal(problems.length, 1);
  assert.equal(problems[0].kind, "not-built");
  assert.match(problems[0].reason, /unreachable/);
});

test("built but setting no flag is still a failure — a pickup that picks nothing up", () => {
  const problems = checkRequiredExaminables(
    screens([{ id: "ex-shelf", clue_tier: "soft-signpost" }]),
    [declaration],
  );
  assert.equal(problems.length, 1);
  assert.equal(problems[0].kind, "no-flag");
});

test("built with the wrong flag", () => {
  const problems = checkRequiredExaminables(
    screens([{ id: "ex-shelf", clue_tier: "soft-signpost", knowledge_flag: "jars_seen" }]),
    [declaration],
  );
  assert.equal(problems.length, 1);
  assert.equal(problems[0].kind, "flag-mismatch");
});

test("built on the wrong screen", () => {
  const built: ScreenSpec[] = [
    { screen_id: "T1", location: "town", name: "Square", status: "start",
      examinables: [{ id: "ex-shelf", clue_tier: "soft-signpost", knowledge_flag: "shelf_seen" }] },
  ];
  const problems = checkRequiredExaminables(built, [declaration]);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].kind, "wrong-screen");
});

test("built as declared — no problems", () => {
  const problems = checkRequiredExaminables(
    screens([
      { id: "stall_goods", clue_tier: "soft-signpost", region: "r_stall_goods" },
      { id: "ex-shelf", clue_tier: "soft-signpost", knowledge_flag: "shelf_seen" },
    ]),
    [declaration],
  );
  assert.deepEqual(problems, []);
});

test("a declaration with no flag column checks existence only", () => {
  const problems = checkRequiredExaminables(
    screens([{ id: "ex-shelf", clue_tier: "soft-signpost" }]),
    [{ ...declaration, knowledge_flag: "" }],
  );
  assert.deepEqual(problems, []);
});
