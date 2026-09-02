/**
 * Audits every locked screen against the approved spell set, and answers one
 * question: if the locks ink advertises were actually enforced, could the
 * player still reach every screen?
 *
 * Pure data analysis — no browser needed. Run: node tools/gate-audit.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (p) => JSON.parse(fs.readFileSync(path.join(here, p), "utf8"));

const graph = read("public/story/graph.json");
const spells = read("public/content/magic.json");

// Kept in step with src/world/spellGates.ts — provisional, probe-local.
const PROPOSED = { ignite: ["G-F7-light"], glimmer: ["G-F7-light"] };

const parseLock = (status) => {
  const m = /^locked\((.+)\)$/.exec((status ?? "").trim());
  return m ? m[1].split(",").map((s) => s.trim()) : [];
};

const clearableBy = new Map();
for (const [spellId, gates] of Object.entries(PROPOSED)) {
  if (!spells.some((s) => s.spell_id === spellId)) continue;
  for (const g of gates) clearableBy.set(g, [...(clearableBy.get(g) ?? []), spellId]);
}

const reasons = new Map();
for (const s of graph.screens ?? []) {
  for (const g of s.gates ?? []) if (g.gate_id) reasons.set(g.gate_id, g);
}

const locked = (graph.screens ?? [])
  .map((s) => ({ ...s, gateIds: parseLock(s.status) }))
  .filter((s) => s.gateIds.length);

console.log("\nlocked screens\n");
const unreachable = [];
for (const s of locked) {
  const open = s.gateIds.filter((g) => clearableBy.has(g));
  const shut = s.gateIds.filter((g) => !clearableBy.has(g));
  const verdict = shut.length === 0 ? "REACHABLE" : "UNREACHABLE";
  if (shut.length) unreachable.push(s);
  console.log(`  ${s.screen_id.padEnd(3)} ${s.name.padEnd(32)} ${verdict}`);
  for (const g of s.gateIds) {
    const who = clearableBy.get(g);
    console.log(`        ${g.padEnd(16)} ${who ? `cleared by ${who.join(" / ")}` : "NOTHING clears it"}`);
  }
}

console.log("\ngates with no approved spell behind them\n");
const allGates = [...new Set(locked.flatMap((s) => s.gateIds))].sort();
for (const g of allGates) {
  if (clearableBy.has(g)) continue;
  const rec = reasons.get(g);
  console.log(`  ${g}`);
  console.log(`    archetype: ${rec?.archetype ?? "—"}`);
  console.log(`    authored:  ${String(rec?.five_field_ref ?? "—").slice(0, 100)}`);
}

console.log(`\nsummary`);
console.log(`  ${locked.length} locked screens`);
console.log(`  ${allGates.length} distinct gates, ${clearableBy.size} clearable by an approved spell`);
console.log(`  ${unreachable.length} screens unreachable if locks were enforced today:`);
console.log(`    ${unreachable.map((s) => s.screen_id).join(" ") || "none"}`);

// The dangling join that motivated all of this.
console.log("\nspell unlock targets vs real screens\n");
const names = new Set((graph.screens ?? []).map((s) => s.name));
const ids = new Set((graph.screens ?? []).map((s) => s.screen_id));
for (const s of spells) {
  const target = s.unlocks?.screen;
  if (!target) continue;
  const ok = names.has(target) || ids.has(target);
  console.log(`  ${s.spell_id.padEnd(10)} -> ${JSON.stringify(target)} ${ok ? "OK" : "MATCHES NOTHING"}`);
}
console.log("");
