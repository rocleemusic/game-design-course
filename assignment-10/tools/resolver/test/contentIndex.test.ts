// Content index generator (GP-102 item 4). Lantern reads only this generated
// index, never the content directory, so the normalization contract here is
// load-bearing: get a field name wrong and lantern silently loses an item.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildIndex, diffIndex, type ContentIndex, type IndexEntry } from "../scripts/build-content-index.mjs";

/** A throwaway content/ tree with items, key-items, and (deliberately) magic. */
function makeContentDir() {
  const root = mkdtempSync(join(tmpdir(), "content-index-"));
  const itemsDir = join(root, "items");
  const keyItemsDir = join(root, "key-items");
  const magicDir = join(root, "magic");
  mkdirSync(itemsDir, { recursive: true });
  mkdirSync(keyItemsDir, { recursive: true });
  mkdirSync(magicDir, { recursive: true });

  writeFileSync(
    join(itemsDir, "item_test.json"),
    JSON.stringify({
      item_id: "item_test",
      description: "a test item",
      category: "component",
      source_locations: ["Town scene", "Square"],
      collectible: true,
    }),
  );
  // Underscore-prefixed files exist in the real dirs and must be skipped.
  writeFileSync(join(itemsDir, "_index.md"), "# not json content");
  writeFileSync(join(itemsDir, "_schema-report.json"), JSON.stringify({ nope: true }));

  writeFileSync(
    join(keyItemsDir, "key_test.json"),
    JSON.stringify({
      key_item_id: "key_test",
      description: "a test key item",
      category: "memento",
      status: "approved",
      status_note: "should not leak into the index",
      role: "Blacksmith",
      origin: "found",
      made_from: [],
      source_locations: ["Square"],
    }),
  );
  writeFileSync(join(keyItemsDir, "_index.md"), "# not json content");

  // If the generator ever reads this, the test below catches it: a spell
  // entry has no item_id/key_item_id, so it would surface as id: undefined.
  writeFileSync(
    join(magicDir, "ignite.json"),
    JSON.stringify({ spell_id: "sp_ignite", description: "should never appear" }),
  );

  return root;
}

test("normalizes an item fixture", () => {
  const root = makeContentDir();
  try {
    const index = buildIndex(root);
    const item = index.entries.find((e) => e.id === "item_test");
    assert.ok(item, "item_test should be in the index");
    assert.equal(item.kind, "item");
    assert.equal(item.label, "a test item");
    assert.equal(item.category, "component");
    assert.equal("status" in item, false, "items do not carry status");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("normalizes a key-item fixture, including status", () => {
  const root = makeContentDir();
  try {
    const index = buildIndex(root);
    const keyItem = index.entries.find((e) => e.id === "key_test");
    assert.ok(keyItem, "key_test should be in the index");
    assert.equal(keyItem.kind, "key-item");
    assert.equal(keyItem.label, "a test key item");
    assert.equal(keyItem.category, "memento");
    assert.equal(keyItem.status, "approved");
    // Fields not in the emitted shape must not leak through.
    assert.equal("status_note" in keyItem, false);
    assert.equal("role" in keyItem, false);
    assert.equal("origin" in keyItem, false);
    assert.equal("made_from" in keyItem, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("underscore-prefixed files are skipped", () => {
  const root = makeContentDir();
  try {
    const index = buildIndex(root);
    assert.equal(index.entries.length, 2, "only item_test and key_test should be scanned");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("content/magic/ is never read, even when it holds valid-looking JSON", () => {
  const root = makeContentDir();
  try {
    const index = buildIndex(root);
    assert.ok(!index.entries.some((e) => e.id === "sp_ignite"), "magic entries must never appear in the index");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("source_locations is copied verbatim, not parsed or normalized", () => {
  const root = makeContentDir();
  try {
    const index = buildIndex(root);
    const item = index.entries.find((e) => e.id === "item_test");
    assert.ok(item, "item_test should be in the index");
    assert.deepEqual(item!.source_locations, ["Town scene", "Square"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("entries are sorted by id", () => {
  const root = makeContentDir();
  try {
    const index = buildIndex(root);
    const ids = index.entries.map((e) => e.id);
    const sorted = [...ids].sort();
    assert.deepEqual(ids, sorted);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// diffIndex
// ---------------------------------------------------------------------------

const entry = (patch: Partial<IndexEntry> = {}): IndexEntry => ({
  id: "item_a",
  kind: "item",
  label: "a",
  category: "component",
  source_locations: ["Square"],
  ...patch,
});

test("diffIndex classifies an added id", () => {
  const committed = { generated: "2026-08-01", entries: [] };
  const rebuilt = { generated: "2026-08-05", entries: [entry()] };
  const diff = diffIndex(committed, rebuilt);
  assert.equal(diff.added.length, 1);
  assert.equal(diff.added[0].id, "item_a");
  assert.equal(diff.removed.length, 0);
  assert.equal(diff.changed.length, 0);
  assert.equal(diff.clean, false);
  // Added ids ARE written into the rebuilt file.
  assert.ok(diff.next.entries.some((e) => e.id === "item_a"));
});

test("diffIndex classifies a removed id and does not silently drop it", () => {
  const committed = { generated: "2026-08-01", entries: [entry()] };
  const rebuilt = { generated: "2026-08-05", entries: [] };
  const diff = diffIndex(committed, rebuilt);
  assert.equal(diff.removed.length, 1);
  assert.equal(diff.removed[0].id, "item_a");
  assert.equal(diff.clean, false);
  // A removed source id must survive in the written-out index — a region or
  // pending placement note may still reference it.
  assert.ok(diff.next.entries.some((e) => e.id === "item_a"), "removed id must be kept, not dropped");
});

test("diffIndex classifies a changed label/category/status, diffing emitted fields only", () => {
  const committed = { generated: "2026-08-01", entries: [entry({ label: "old label" })] };
  const rebuilt = { generated: "2026-08-05", entries: [entry({ label: "new label" })] };
  const diff = diffIndex(committed, rebuilt);
  assert.equal(diff.changed.length, 1);
  assert.equal(diff.changed[0].id, "item_a");
  assert.equal(diff.clean, false);
});

test("diffIndex ignores drift in fields that are not part of the emitted shape", () => {
  // source_locations differs but is not an emitted diff field (label/category/status
  // only) — this guards against whole-source-file diffing reading unrelated
  // prose tweaks (status_note, role, origin...) as drift.
  const committed = { generated: "2026-08-01", entries: [entry({ source_locations: ["Square"] })] };
  const rebuilt = { generated: "2026-08-05", entries: [entry({ source_locations: ["Town scene"] })] };
  const diff = diffIndex(committed, rebuilt);
  assert.equal(diff.changed.length, 0);
  assert.equal(diff.clean, true);
});

test("diffIndex reports clean when nothing drifted", () => {
  const committed = { generated: "2026-08-01", entries: [entry()] };
  const rebuilt = { generated: "2026-08-05", entries: [entry()] };
  const diff = diffIndex(committed, rebuilt);
  assert.equal(diff.clean, true);
  assert.equal(diff.added.length, 0);
  assert.equal(diff.removed.length, 0);
  assert.equal(diff.changed.length, 0);
});
