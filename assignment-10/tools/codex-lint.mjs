#!/usr/bin/env node
// Integrity check for narrative-pipeline/npc-codex.md.
//
// The codex is the one artifact the invention loop trusts: Content reads it to
// decide whether to reuse or invent, and the Verifier reads it for guardrails
// check 4. It is written by the Orchestrator after a gate ratifies, so nothing
// upstream verifies it — which is how a seeding pass put a fabricated quote
// ("Blue gate past the well", cited to a committed line that does not exist)
// into a ratified entry on the codex's first day.
//
// Everything here is deterministic, which is why it is a script and not an agent:
// an agent would re-derive these answers each run and could get them wrong. Run it
// after any codex write and before any pass that reads the codex.
//
//   node tools/codex-lint.mjs
//
// Exit 0 clean, exit 1 with one line per defect.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CODEX = join(ROOT, 'narrative-pipeline', 'npc-codex.md')

const defects = []
const bad = (where, msg) => defects.push(`${where}: ${msg}`)

if (!existsSync(CODEX)) {
  console.error(`no codex at ${CODEX}`)
  process.exit(1)
}
const src = readFileSync(CODEX, 'utf8')

// --- corpus the codex is allowed to cite -----------------------------------
// Everything committed that could legitimately be a source. The codex itself is
// excluded: an entry may not be its own evidence.
const DIRS = [
  'cast',
  'gdd',
  'narrative-pipeline',
  'lantern-projects/v01/threads',
  'lantern-projects/v01/threads/lines',
]
// Gated run artifacts are frozen but citable — the Kinbound and Giver runs are
// where several ratified world facts originate.
const RUN_DIRS = 'pipeline-runs'
const corpus = []
const walk = (rel) => {
  const abs = join(ROOT, rel)
  if (!existsSync(abs)) return
  for (const f of readdirSync(abs)) {
    const p = join(abs, f)
    if (!statSync(p).isFile() || !f.endsWith('.md')) continue
    if (p === CODEX) continue
    corpus.push(readFileSync(p, 'utf8'))
  }
}
DIRS.forEach(walk)
walk(RUN_DIRS)
if (existsSync(join(ROOT, RUN_DIRS)))
  for (const d of readdirSync(join(ROOT, RUN_DIRS)))
    if (statSync(join(ROOT, RUN_DIRS, d)).isDirectory()) walk(join(RUN_DIRS, d))

// Quote matching is whitespace- and smart-punctuation-insensitive; a codex entry
// may reflow a line it cites without that counting as a fabrication.
const norm = (t) =>
  t
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
const haystack = norm(corpus.join('\n'))

// --- entries ---------------------------------------------------------------
const STATUSES = new Set(['ratified', 'proposed', 'retired'])
const seen = new Map()
let ratified = 0
let checkedQuotes = 0

const lines = src.split('\n')
let inProposed = false

for (const [i, line] of lines.entries()) {
  if (/^##\s/.test(line)) inProposed = /proposed/i.test(line)

  const m = line.match(/^-\s+\*\*`([^`]+)`\*\*\s*—\s*(\w+)/)
  if (!m) continue
  const [, id, status] = m
  const at = `${id} (line ${i + 1})`

  // The "locked facts the seats trip over most" digest reuses the id syntax for
  // prose. Only a bullet whose next token is a status is a codex entry.
  if (!STATUSES.has(status)) continue
  if (seen.has(id)) bad(at, `duplicate id — already defined at line ${seen.get(id)}`)
  else seen.set(id, i + 1)

  if (status === 'ratified') {
    ratified++
    if (inProposed) bad(at, 'ratified entry sits under the Proposed heading')
    if (!/origin:/i.test(line)) bad(at, 'ratified entry names no origin')
  }
  if (status === 'proposed' && !inProposed)
    bad(at, 'proposed entry sits outside the Proposed section, where a reader will take it as canon')

  // Every quoted string in a ratified entry is a claim about a committed file.
  if (status === 'ratified') {
    for (const q of line.match(/"([^"]{8,})"/g) ?? []) {
      const text = norm(q.slice(1, -1))
      // A correction note quoting the thing it strikes is not itself a claim.
      if (/correction|struck|fabricat|no such line/i.test(line)) continue
      checkedQuotes++
      if (!haystack.includes(text))
        bad(at, `quotes "${q.slice(1, -1).slice(0, 60)}" — found in no committed file`)
    }
  }

  // A named source file must exist.
  for (const path of line.match(/`\.\.\/[^`]+\.md`/g) ?? []) {
    const rel = path.replace(/`/g, '').replace(/^\.\.\//, '')
    if (!existsSync(join(ROOT, rel))) bad(at, `cites ${rel}, which does not exist`)
  }
}

if (!seen.size) bad('codex', 'no entries parsed — has the entry format changed?')

console.log(
  `${seen.size} entries · ${ratified} ratified · ${checkedQuotes} quoted claims checked against ${corpus.length} files`,
)

if (defects.length) {
  console.error(`\n${defects.length} defect(s):`)
  for (const d of defects) console.error(`  ${d}`)
  process.exit(1)
}
console.log('\nclean')
