#!/usr/bin/env node
// Integrity check for ProjectOS/game-project/content/.
//
// Everything here is deterministic, which is why it is a script and not an agent:
// an agent would re-derive these answers each run and could get them wrong. Run it
// after any gate, any hand-edit, and before any pass that reads the content set.
//
//   node tools/content-check.mjs
//
// Exit 0 clean, exit 1 with one line per defect.

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'content')
const defects = []
const bad = (where, msg) => defects.push(`${where}: ${msg}`)

const load = (dir, f) => {
  const p = join(ROOT, dir, f)
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch (e) {
    bad(`${dir}/${f}`, `does not parse — ${e.message}`)
    return null
  }
}
const records = (dir, prefix) =>
  readdirSync(join(ROOT, dir))
    .filter((f) => f.endsWith('.json') && (prefix ? f.startsWith(prefix) : !basename(f).startsWith('_')))
    .map((f) => load(dir, f))
    .filter(Boolean)

const spells = records('magic', null)
const items = records('items', 'item_')
const keyItems = records('key-items', 'key_')

const itemIds = new Set(items.map((i) => i.item_id))
const live = spells.filter((s) => s.status !== 'rejected')
const LIVE_STATUSES = new Set(['approved', 'pending', 'canon-unruled', 'out-of-slice'])

// --- spells ---------------------------------------------------------------
for (const s of spells) {
  const at = `spell ${s.spell_id}`
  if (!s.status) bad(at, 'no status — every record carries one, nothing is deleted')
  else if (s.status !== 'rejected' && !LIVE_STATUSES.has(s.status)) bad(at, `unknown status "${s.status}"`)
  if (!Array.isArray(s.produces)) bad(at, 'missing `produces` (empty array is the norm)')
  for (const c of [...(s.components ?? []), ...(s.produces ?? [])])
    if (!itemIds.has(c)) bad(at, `references unknown item id "${c}"`)
  const rows = s.receivers?.length ?? 0
  if (rows < 4) bad(at, `only ${rows} receiver rows — a matrix under 4 has not been specced`)
  // An honest null result is written either as the `no_effect` token or in prose
  // ("No physical effect" — the canon ignite matrix does it that way). Match both,
  // or this flags the one matrix Roc actually ruled on.
  const NULL_RESULT = /no_effect|no physical effect|nothing (happens|changes)/i
  if (!s.receivers?.some((r) => NULL_RESULT.test(r.physical_outcome ?? '')))
    bad(at, 'no honest null-result row — a matrix with none has decided the world is agreeable')
}

// --- items ----------------------------------------------------------------
const liveIds = new Set(live.map((s) => s.spell_id))
const usedBy = new Map() // component consumers — drives requirements + non-produced items
const producedBy = new Map()
for (const s of live) {
  for (const c of s.components ?? []) usedBy.set(c, (usedBy.get(c) ?? new Set()).add(s.spell_id))
  // A cast produces the RECEIVER'S `produces` when present, else the spell-level
  // default (option A, Roc 2026-08-19). So both are producers: `ignite`'s
  // spell-level `item_flame` AND `ignite × river_stone`'s `item_heated_stone`.
  for (const c of s.produces ?? []) producedBy.set(c, (producedBy.get(c) ?? new Set()).add(s.spell_id))
  for (const r of s.receivers ?? [])
    for (const c of r.produces ?? []) producedBy.set(c, (producedBy.get(c) ?? new Set()).add(s.spell_id))
}
// Receiver-chain consumers. A cast whose `receiver_id` is a produced chain-item's
// slug consumes that item — `temper × heated_stone` consumes `item_heated_stone`.
// Guarded to `producedBy` so an ordinary receiver target (`ignite × river_stone`,
// `× bread`, `× anvil`) is never counted as a component consumer and cannot drift
// a foraged item's `used_by`. The seat step (`fetch × stone_wall`) binds its
// payload through the gate chain's `onProductOf`, not the `receiver_id`, so that
// consumer lives in gateRules — not in the content set this script reads.
const receiverConsumers = new Map()
for (const s of live)
  for (const r of s.receivers ?? []) {
    const id = `item_${r.receiver_id}`
    if (producedBy.has(id)) receiverConsumers.set(id, (receiverConsumers.get(id) ?? new Set()).add(s.spell_id))
  }
const same = (arr, set) => {
  const a = [...(arr ?? [])].sort()
  const b = [...(set ?? new Set())].sort()
  return a.length === b.length && a.every((v, i) => v === b[i])
}

for (const i of items) {
  const at = `item ${i.item_id}`
  if (typeof i.collectible !== 'boolean') bad(at, 'missing `collectible`')
  if (i.persistence === 'world' && i.collectible) bad(at, 'a world item cannot be collectible')
  if (i.persistence !== 'world' && i.collectible === false) bad(at, 'only a world item may be uncollectible')
  // A sound may be `pack-triaged` — ruled 2026-08-30 (Roc): the painted satchel
  // grid makes every pocket physical space, so `pack-triaged` is no longer a
  // defect for a sound. `free` stays valid for a sound that costs no pack space.
  // See gdd/05-collectibles.md and narrative-pipeline/agents/item-schema.md.
  if (i.persistence !== 'world' && (i.source_locations?.length ?? 0) < 2)
    bad(at, 'fewer than two sources — a randomized day must never dead-end')
  if (i.source_locations?.includes('Home Hub')) bad(at, 'Home Hub is not a forage point')
  if (!same(i.produced_by, producedBy.get(i.item_id))) bad(at, '`produced_by` has drifted from the live spells')
  if (producedBy.has(i.item_id)) {
    // A produced item is live content by construction. Its consumer may be the
    // gate-chain seat step, which is not in the content set — so require every
    // content-derivable consumer to be listed and every listed consumer to be a
    // real live spell, rather than exact equality with the component-only set.
    const derived = new Set([...(usedBy.get(i.item_id) ?? []), ...(receiverConsumers.get(i.item_id) ?? [])])
    for (const c of derived) if (!(i.used_by ?? []).includes(c)) bad(at, `\`used_by\` is missing live consumer "${c}"`)
    for (const u of i.used_by ?? []) if (!liveIds.has(u)) bad(at, `\`used_by\` names "${u}", not a live spell`)
  } else if (!same(i.used_by, usedBy.get(i.item_id))) {
    bad(at, '`used_by` has drifted from the live spells')
  }
  // Orphan: nothing uses it AND nothing produces it. A produced item is minted by
  // live content, so it is not an orphan even before its consumer's gate is wired.
  if (!usedBy.has(i.item_id) && !producedBy.has(i.item_id)) bad(at, 'ORPHAN — no live spell uses it')
}

// --- requirements roll-up -------------------------------------------------
const req = load('magic', '_component-requirements.json')
for (const r of req?.component_requirements ?? []) {
  const at = `requirement ${r.item_id}`
  if (!itemIds.has(r.item_id)) bad(at, 'no item satisfies it')
  if (!same(r.needed_by, usedBy.get(r.item_id))) bad(at, '`needed_by` has drifted from the live spells')
  if (r.gate_bearing && !items.find((i) => i.item_id === r.item_id)?.always_available)
    bad(at, 'gate-bearing but its item is randomizable — this is a soft-lock')
}

// --- key items ------------------------------------------------------------
const perSoul = new Map()
for (const k of keyItems) {
  const at = `key item ${k.key_item_id}`
  if ('name' in k) bad(at, 'has a `name` field — the name is the slug')
  if (('role' in k) === ('soul' in k)) bad(at, 'must carry exactly one of `role` / `soul`')
  if (!k.status) bad(at, 'no status')
  for (const m of k.made_from ?? []) {
    if (!itemIds.has(m)) bad(at, `made from unknown item id "${m}"`)
    if (items.find((i) => i.item_id === m)?.persistence === 'world')
      bad(at, `made from "${m}", a world item that cannot be picked up`)
  }
  if (k.origin === 'found' && (k.source_locations?.length ?? 0) < 2) bad(at, 'found with fewer than two sources')
  if (k.source_locations?.includes('Home Hub')) bad(at, 'Home Hub is not a forage point')
  if (k.category === 'tool' && (k.consumable || !k.use_family)) bad(at, 'a tool is non-consumable and needs a use_family')
  if (k.soul && k.status === 'approved') perSoul.set(k.soul, (perSoul.get(k.soul) ?? 0) + 1)
}
for (const [soul, n] of perSoul)
  if (n > 2) bad(`soul ${soul}`, `${n} approved soul-tied key items — the slice cap is two`)

// --- report ---------------------------------------------------------------
const counts = (rs, f) => [...rs.reduce((m, r) => m.set(f(r), (m.get(f(r)) ?? 0) + 1), new Map())]
  .map(([k, v]) => `${k} ${v}`).join(' · ')

console.log(`spells ${spells.length} (${counts(spells, (s) => s.status)})`)
console.log(`items ${items.length} · key items ${keyItems.length} (${counts(keyItems, (k) => k.status)})`)

if (defects.length) {
  console.error(`\n${defects.length} defect(s):`)
  for (const d of defects) console.error(`  ${d}`)
  process.exit(1)
}
console.log('\nclean')
