#!/usr/bin/env node
// Integrity check for the line files in lantern-projects/v01/threads/lines/.
//
// It exists because the `W` column had no written convention until 2026-08-11, so
// the files disagreed with each other and nothing could tell. `W` is the enforcement
// surface for the slot ceilings and for the per-soul word bands that keep three souls
// distinguishable — an unverifiable count means unverifiable bands.
//
//   node tools/line-lint.mjs
//
// Exit 0 clean, exit 1 with one line per defect.

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'lantern-projects', 'v01', 'threads', 'lines')
const defects = []
const bad = (where, msg) => defects.push(`${where}: ${msg}`)

// Ceilings by slot type; a row tagged MARKED LONG RUN takes the long-run ceiling instead.
// Exported 2026-08-11: the assignment-6 GER harness gates generated slots on the same
// numbers this file enforces on committed ones. Two copies of a ceiling is how they drift.
export const CEILING = { dialogue: 40, action: 60, object: 60, player_line: 12 }
export const LONG_RUN = 75
const SLOT_TYPES = new Set(Object.keys(CEILING))

// The counting convention, ruled 2026-08-11 by Roc. See
// narrative-pipeline/templates/line-file-schema.md § The counting convention.
//   1. the **[action]** render marker does not count
//   2. square brackets do not count; the words inside them do
//   3. a contraction is one word — apostrophes stay glued, so no extra splitting
export const countWords = (cell) =>
  cell
    .replace(/\*\*\[action\]\*\*/g, ' ')
    .replace(/\*\*MARKED LONG RUN\.\*\*/g, ' ')
    .replace(/[[\]]/g, ' ')
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length

// An option heading promises a response count in prose ("two response slots").
// Nothing compared that promise to the table until 2026-08-11, when three slots
// turned out to have a written `speaker_intent` brief and no prose — the headings
// had been right and the tables short for days, silently.
//
// **Shortfall only, deliberately.** The corpus counts "response slots" two ways:
// `-1-a` counts its unlabeled action and object beats inside its four, `-1-b`
// excludes them from its two. Until that is ruled, a surplus is ambiguous and a
// shortfall is not — a table can never carry fewer rows than either reading allows.
// A check that fires on the ambiguous direction would be noise, and noise gets
// muted, which costs more than the check is worth.
//
// The promise must be immediately followed by its table, so prose that talks about
// response slots in general ("every option where he is receiving carries three")
// is not read as a claim about the next table it happens to precede.
const WORD = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 }
const promised = (line) => {
  const m = line.match(/\b(one|two|three|four|five|six|seven|eight|\d+)\s+response\s+slots?\b/i)
  if (!m) return null
  const n = m[1].toLowerCase()
  return WORD[n] ?? Number(n)
}

function main() {
  let rows = 0
  for (const f of readdirSync(DIR).filter((f) => f.endsWith('.md')).sort()) {
    const lines = readFileSync(join(DIR, f), 'utf8').split(/\r?\n/)
    let idx = null
    let claim = null // { n, at } — an open promise waiting on its table

    const settle = () => {
      if (claim?.attached && claim.seen < claim.n)
        bad(claim.at, `heading promises ${claim.n} response slot(s), table carries ${claim.seen}`)
      claim = null
    }

    for (const L of lines) {
      if (!L.trimStart().startsWith('|')) {
        if (L.trim() === '') continue // a blank line between promise and table is normal
        const n = promised(L)
        settle()
        if (n !== null) claim = { n, at: `${f} ${L.trim().slice(0, 48)}`, seen: 0, attached: false }
        continue
      }
      if (claim && !claim.attached) claim.attached = true // the promise's own table has begun
      const cells = L.split('|').slice(1, -1)
      const head = cells.map((c) => c.trim().toLowerCase())

      if (head.includes('text') && head.includes('w')) {
        idx = { id: 0, type: head.indexOf('slot_type'), text: head.indexOf('text'), w: head.indexOf('w') }
        if (idx.type < 0) bad(f, 'header has no `slot_type` column')
        continue
      }
      if (!idx || /^[\s:|-]+$/.test(L)) continue
      if (cells.length <= Math.max(idx.text, idx.w, idx.type)) continue

      // A response row is any slot suffixed -r or -rN: the numbered spoken responses
      // plus the unlabeled action and object beats that sit inside the same run.
      // Counted before the `W` gate below — a row with no count is still a row, and
      // reading it otherwise would report a full table as empty.
      if (claim && /-r\d*`?\s*$/.test(cells[idx.id].trim())) claim.seen++

      const stated = cells[idx.w].trim()
      if (!/^\d+$/.test(stated)) continue
      rows++

      const at = `${f} ${cells[idx.id].trim()}`
      const type = cells[idx.type].trim()
      const real = countWords(cells[idx.text])

      if (real !== Number(stated)) bad(at, `W says ${stated}, text counts ${real}`)
      if (type === 'surface_action') bad(at, '`surface_action` is a choice-node field, never a slot_type')
      else if (!SLOT_TYPES.has(type)) bad(at, `unknown slot_type "${type}"`)
      else {
        const cap = /MARKED LONG RUN/.test(L) ? LONG_RUN : CEILING[type]
        if (real > cap) bad(at, `${real} words over the ${type} ceiling of ${cap}`)
      }
    }
    settle()
    if (idx === null) bad(f, 'no line table found — expected a header carrying `text` and `W`')
  }

  console.log(`${rows} slots checked`)
  if (defects.length) {
    console.error(`\n${defects.length} defect(s):`)
    for (const d of defects) console.error(`  ${d}`)
    process.exit(1)
  }
  console.log('\nclean')
}

// Run the lint only when invoked as a script. Importing this file must stay free of
// side effects — the GER harness imports `countWords` and `CEILING`, and a top-level
// walk that can `process.exit(1)` would take the harness down with it.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
