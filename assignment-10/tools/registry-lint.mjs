#!/usr/bin/env node
// Structure check for the per-life thread registries in cast/[soul]-[role]-threads.md.
//
// The registries carry a schema's worth of rules that lived only in conversation
// until 2026-08-09 — column set, status vocabulary, id prefixes, the five-ratified
// floor, and the rule that every row needs a stageable action. card-lint skips
// these files deliberately (they are not cards), so nothing checked them at all:
// a registry with a missing column, an empty action cell or an invented status
// passed every gate.
//
// Contract: narrative-pipeline/templates/thread-registry-schema.md
// The distinct-facet test is NOT here — "do these five rows reveal five different
// things" is a human read, and a script that pretended to check it would be worse
// than one that admits it cannot.
//
//   node tools/registry-lint.mjs
//
// Exit 0 clean, exit 1 with one line per defect.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CAST = join(ROOT, 'cast')

const COLUMNS = ['Thread', 'The open question', 'Moves when', 'Action / conflict', 'Type', 'Reveals', 'Status']
// CROSS-REF: ratified in the OTHER registry. A `pair-` thread is declared in both
// and budgeted to its owner, so the non-owner's copy is a pointer — it does not count
// toward the cap and it sits below the fold, so a soul's live rows read as its own.
const STATUSES = ['RATIFIED', 'PROPOSED', 'PARKED', 'DEFERRED', 'REJECTED', 'RETIRED', 'CROSS-REF']
const NEEDS_REASON = new Set(['PROPOSED', 'PARKED', 'DEFERRED', 'REJECTED', 'RETIRED', 'CROSS-REF'])
// Three, not five. Reversed 2026-08-09 (Roc) once key-item moments were planned:
// three threads that get written beat eight that get thinned. A `pair-` thread is
// budgeted to its owner; the other registry's copy is a cross-reference.
const MAX_RATIFIED = 3
// `Type` is the delta class (guardrails check 3), not the id prefix — ownership is
// carried by the id. Getting this backwards was the first thing this lint caught.
const TYPES = new Set(['cast', 'situation', 'relational', '—'])
const PREFIX = { 'world-': 'world', 'pair-': 'pair' }

const defects = []
const bad = (where, msg) => defects.push(`${where}: ${msg}`)

const files = readdirSync(CAST).filter((f) => f.endsWith('-threads.md')).sort()
if (!files.length) {
  console.error(`no thread registries in ${CAST}`)
  process.exit(1)
}

// A registry exists per dealt role. A carded soul with a role and no registry is an
// incomplete deal — check that direction too, since a missing file is the failure
// nobody notices.
const carded = readdirSync(CAST).filter((f) => f.endsWith('.md') && !f.endsWith('-threads.md') && !f.startsWith('_'))
for (const c of carded) {
  const soul = basename(c, '.md')
  const src = readFileSync(join(CAST, c), 'utf8')
  if (/Dealt out of the v01 arc/i.test(src)) continue // no role, no registry owed
  const roleCell = src.match(/^\|\s*`role_tag`\s*\|(.*)$/m)?.[1] ?? ''
  const dealt = /\*\*(Blacksmith|Baker|Herbalist|Priest|Postman|Farmer|Mage|Village Chief|Lamplighter)/i.exec(roleCell)
  if (!dealt) continue // not yet dealt
  const deep = files.some((f) => f.startsWith(soul + '-'))
  if (!deep && !/texture/i.test(src))
    bad(soul, `dealt ${dealt[1]} and has no thread registry — an incomplete deal (schema: thread-registry)`)
}

for (const f of files) {
  const src = readFileSync(join(CAST, f), 'utf8')
  const who = f.replace('.md', '')
  const lines = src.split('\n')

  // Two tables, same shape: live rows, then a "Not in play" section holding the
  // deferred, rejected and retired. Both headers are checked — a second table that
  // drifts a column is the failure this split invites.
  const headIdxs = lines.map((l, i) => (/^\|\s*Thread\s*\|/.test(l) ? i : -1)).filter((i) => i >= 0)
  if (!headIdxs.length) {
    bad(who, 'no column header row found')
    continue
  }
  if (headIdxs.length > 2) bad(who, `${headIdxs.length} tables — the schema specifies two`)
  for (const hi of headIdxs) {
    const head = lines[hi].split('|').slice(1, -1).map((c) => c.trim())
    if (head.length !== COLUMNS.length || head.some((c, i) => c !== COLUMNS[i]))
      bad(who, `table at line ${hi + 1} has columns [${head.join(' | ')}] — schema wants [${COLUMNS.join(' | ')}]`)
  }
  const notInPlayAt = lines.findIndex((l) => /^##\s+Not in play/i.test(l))
  if (headIdxs.length === 2 && notInPlayAt < 0)
    bad(who, 'a second table exists but no "## Not in play" heading introduces it')

  let ratified = 0
  for (const [n, line] of lines.entries()) {
    if (!/^\|\s*`[a-z][\w-]*`\s*\|/.test(line)) continue
    const cells = line.split('|').slice(1, -1).map((c) => c.trim())
    const id = cells[0].replace(/`/g, '')
    const at = `${who} · ${id} (line ${n + 1})`

    if (cells.length !== COLUMNS.length)
      bad(at, `${cells.length} cells, expected ${COLUMNS.length}`)

    // Match the EARLIEST status word in the cell, not the first in our list order.
    // A rejected row keeps its history — "REJECTED … *(was: PROPOSED …)*" — so a
    // list-order match reports the record instead of the verdict. This exact bug
    // shipped once already in a throwaway script before it was caught here.
    const statusCell = cells[6] ?? ''
    const status = STATUSES
      .map((s) => [s, statusCell.indexOf(s)])
      .filter(([, i]) => i >= 0)
      .sort((a, b) => a[1] - b[1])[0]?.[0]
    if (!status) bad(at, `status is none of ${STATUSES.join(' / ')}`)
    else {
      if (status === 'RATIFIED') ratified++
      // Placement is the point of the split: live rows above, everything else below.
      const belowFold = notInPlayAt >= 0 && n > notInPlayAt
      const live = status === 'RATIFIED' || status === 'PROPOSED'
      if (live && belowFold) bad(at, `${status} but filed under "Not in play"`)
      if (!live && !belowFold && notInPlayAt >= 0)
        bad(at, `${status} sitting in the live table — move it to "Not in play"`)
      // A deferral with no stated blocker cannot be told from an oversight.
      // A reason, not necessarily a date — rows predating the dating convention
      // carry good reasons without one, and forcing a date would mean editing history.
      if (NEEDS_REASON.has(status) && cells[6].replace(/[*\s]/g, '').length < status.length + 25)
        bad(at, `${status} with no stated reason`)
    }

    const type = cells[4]
    if (!TYPES.has(type)) bad(at, `type "${type}" is none of ${[...TYPES].join(' / ')}`)
    // Ownership is the id's job: a pair- thread must be relational, since it exists
    // only because two souls are in the room.
    if (status === 'CROSS-REF' && !id.startsWith('pair-'))
      bad(at, 'CROSS-REF is only for a `pair-` thread owned by another registry')
    if (id.startsWith('pair-') && type !== 'relational' && type !== '—')
      bad(at, `pair- thread typed ${type}; a thread that exists only between two souls is relational`)

    // The action column is the whole reason this pass exists. An empty cell is a
    // thread nobody can stage, and it must say so rather than be blank.
    if (!cells[3] || cells[3] === '—')
      bad(at, 'empty Action / conflict — a row with no writable action is a state, not a thread; say so in the cell')
  }

  if (ratified > MAX_RATIFIED)
    bad(who, `${ratified} ratified threads, cap is ${MAX_RATIFIED} — park the extras, do not reject them`)
  console.log(`${who.padEnd(30)} ${ratified} ratified`)
}

if (!existsSync(join(ROOT, 'narrative-pipeline/templates/thread-registry-schema.md')))
  bad('schema', 'thread-registry-schema.md is missing — the contract this lint enforces')

if (defects.length) {
  console.error(`\n${defects.length} defect(s):`)
  for (const d of defects) console.error(`  ${d}`)
  process.exit(1)
}
console.log('\nclean')
