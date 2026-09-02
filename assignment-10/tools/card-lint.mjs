#!/usr/bin/env node
// Pinned-context hygiene gate for ProjectOS/game-project/cast/.
//
// Only `essence_descriptor` and `voice_register` are re-pinned into every Content
// Agent call (narrative-pipeline/pipeline.md step 8), which makes those two fields
// the ambient prose style for every line the soul ever speaks. This checks the three
// rules in narrative-pipeline/templates/persona-card-schema.md, "Pinned-context
// hygiene": no verdict vocabulary, and word budgets. An em-dash ceiling was tried and
// dropped 2026-08-08 — the number had no evidence behind it (Roc).
//
// The rules are here rather than in a doc because the schema already warned about
// clinical analyst voice in prose and the cards drifted anyway, one section below
// the warning. A gate holds; a paragraph does not.
//
//   node tools/card-lint.mjs
//
// Exit 0 clean, exit 1 with one line per defect.

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'cast')

// Pinned fields, and what each may spend. Budgets are per schema, and are set from
// the cards that already read well; voice_register raised 300->400 on 2026-08-08 (Roc)
// after Mara, the most demanding card, carried seven distinct behaviours at 377.
// The would-never/would-say table inside voice_register is NOT counted: prose() strips
// table rows, so exemplar pairs are free (Roc, 2026-08-08).
const PINNED = {
  essence_descriptor: { words: 75 },
  voice_register: { words: 400 },
}

// A generator conditioned on a checker's vocabulary writes to avoid flags instead
// of writing to sound like a person. These belong in voice_enforcement.
const VERDICT = /\b(defects?|barred|flags?|flagged|violations?|check(?:s|ed|able)?)\b/gi

const defects = []
const bad = (soul, field, msg) => defects.push(`${soul} · ${field}: ${msg}`)

// voice_register is a section (### `voice_register` … next heading); the essence
// fields are table rows. Pull both out of the markdown.
const tableRow = (src, field) => {
  const m = src.match(new RegExp(`^\\|\\s*\`${field}\`\\s*\\|([\\s\\S]*?)\\|\\s*$`, 'm'))
  return m ? m[1].trim() : null
}
const section = (src, heading) => {
  const m = src.match(new RegExp(`^###\\s+\`?${heading}\`?\\s*$([\\s\\S]*?)(?=^###?\\s|\\Z)`, 'm'))
  return m ? m[1].trim() : null
}
const extract = (src, field) =>
  field === 'voice_register' ? section(src, field) ?? tableRow(src, field) : tableRow(src, field)

// Strip markdown furniture so counts reflect prose, not syntax.
const prose = (s) =>
  s
    .replace(/`[^`]*`/g, ' ') // code spans: field names, ids
    .replace(/^\s*\|.*\|\s*$/gm, ' ') // nested tables (do/say pairs)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_>#]/g, ' ')

// `cast/` holds two kinds of file: the persona cards, and the per-life thread
// registries that sit beside them as `[soul]-[role]-threads.md` (GP-92 — threads
// are dealt with the role and cannot live inside a reshuffle-invariant card).
// Only cards carry pinned fields; a registry is not a card and must not be linted
// as one.
const cards = readdirSync(ROOT)
  .filter((f) => f.endsWith('.md') && !f.startsWith('_') && !f.endsWith('-threads.md'))
  .sort()

if (!cards.length) {
  console.error(`no cards found in ${ROOT}`)
  process.exit(1)
}

for (const file of cards) {
  const soul = file.replace(/\.md$/, '')
  const src = readFileSync(join(ROOT, file), 'utf8')

  for (const [field, { words: budget }] of Object.entries(PINNED)) {
    const raw = extract(src, field)
    if (raw === null) {
      bad(soul, field, 'pinned field missing — every card must carry it')
      continue
    }
    const text = prose(raw)

    const verdicts = [...new Set((text.match(VERDICT) ?? []).map((w) => w.toLowerCase()))]
    if (verdicts.length)
      bad(soul, field, `verdict vocabulary (${verdicts.join(', ')}) — move to voice_enforcement`)

    const words = text.split(/\s+/).filter(Boolean).length
    if (words > budget) bad(soul, field, `${words} words, budget ${budget}`)
  }
}

console.log(`${cards.length} cards checked · ${cards.map((c) => c.replace(/\.md$/, '')).join(' ')}`)

if (defects.length) {
  console.error(`\n${defects.length} defect(s):`)
  for (const d of defects) console.error(`  ${d}`)
  process.exit(1)
}
console.log('\nclean')
