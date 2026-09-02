#!/usr/bin/env node
// Reference integrity check for ProjectOS/game-project/.
//
// The ex-shelf lesson (GP-112): `ex-shelf` was declared load-bearing on T2, never
// built, and survived a design pass, a review, two line-writing passes and three
// QA walks — because a proposal nothing verifies is indistinguishable from a thing
// that exists. Three more of the same defect turned up on 2026-08-09: the NPC codex
// (specified in ten documents, never created), Pip's "signal, playable" block
// (praised by an audit, never actually reachable), and the kishotenketsu note (zero
// inbound references). Different clothes, same defect — a declaration nothing joins
// to a fact.
//
// This joins them. A link, a wikilink, or a cited path is a claim that something
// exists; this checks each one. It does NOT check examinables declared-vs-built —
// that is guardrails check 11, implemented in tools/resolver (check-examinables).
//
//   node tools/ref-lint.mjs            fail on unresolved references
//   node tools/ref-lint.mjs --orphans  also fail on unreferenced knowledge-base notes
//
// Exit 0 clean, exit 1 with one line per defect.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname, resolve, relative, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FAIL_ON_ORPHANS = process.argv.includes('--orphans')

const SKIP_DIRS = new Set(['node_modules', '.git', '.obsidian', 'dist', 'build', '_archive'])

const defects = []
const warnings = []
const bad = (where, msg) => defects.push(`${where}: ${msg}`)

// --- collect every markdown file -------------------------------------------
const files = []
const walk = (dir) => {
  for (const f of readdirSync(dir)) {
    if (SKIP_DIRS.has(f)) continue
    const p = join(dir, f)
    const st = statSync(p)
    if (st.isDirectory()) walk(p)
    else if (f.endsWith('.md')) files.push(p)
  }
}
walk(ROOT)

// Note basenames, for wikilink resolution. Obsidian resolves [[name]] repo-wide.
const notes = new Map()
for (const p of files) {
  const n = basename(p, '.md')
  if (!notes.has(n)) notes.set(n, [])
  notes.get(n).push(p)
}

const inbound = new Map(files.map((p) => [p, 0]))
const rel = (p) => relative(ROOT, p).replace(/\\/g, '/')

// Every file of any type, for suffix-resolving a cited path whose base directory
// the citing document does not sit in.
const allPaths = []
const walkAll = (dir) => {
  for (const f of readdirSync(dir)) {
    if (SKIP_DIRS.has(f)) continue
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walkAll(p)
    else allPaths.push(rel(p))
  }
}
walkAll(ROOT)

// A backticked string is a cited path only if it contains a slash AND a known
// extension. Both halves matter. `voice_register` is a field name; a bare
// `recon.md` is prose naming a document, not a claim about where it lives — the
// repo does that constantly and treating it as a path produced 200+ false
// positives on the first run. A slash means the author asserted a location.
const CITED = /`((?:\.{0,2}\/)?(?:[\w.\-]+\/)+[\w.\-]+\.(?:md|mjs|js|ts|json|ps1))`/g
// Citations this repo cannot resolve, and why. Keep each entry justified.
const EXTERNAL = [
  /^schemas\//,                 // NeverEndingQuest, read as prior art
  /^session-state\//,           // ditto
  /^out\//,                     // build output, exists only after a run
  /^src\/reachability\.ts$/,   // resolver source discussed before it was written
  /^\.claude\//,               // machine-local, deliberately not committed
  /v[N#]|<[^>]+>|\{[^}]+\}/,   // filename templates with a placeholder
]
const MDLINK = /\[[^\]]*\]\(([^)\s]+)\)/g
const WIKI = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g

for (const p of files) {
  const src = readFileSync(p, 'utf8')
  const here = rel(p)

  // 1. relative markdown links must resolve
  for (const m of src.matchAll(MDLINK)) {
    let target = m[1].split('#')[0]
    if (!target || /^(https?:|mailto:|#)/.test(target)) continue
    target = decodeURIComponent(target)
    const abs = resolve(dirname(p), target)
    if (!existsSync(abs)) bad(here, `link to ${target} — no such file`)
    else if (abs.endsWith('.md') && inbound.has(abs)) inbound.set(abs, inbound.get(abs) + 1)
  }

  // 2. wikilinks must resolve to a note
  for (const m of src.matchAll(WIKI)) {
    const name = m[1].trim()
    const hits = notes.get(name) ?? notes.get(basename(name))
    if (!hits) bad(here, `[[${name}]] — resolves to no note`)
    else {
      if (hits.length > 1) warnings.push(`${here}: [[${name}]] is ambiguous — ${hits.length} notes share that name`)
      for (const h of hits) inbound.set(h, (inbound.get(h) ?? 0) + 1)
    }
  }

  // 3. cited paths in backticks must exist — this is the ex-shelf case
  for (const m of src.matchAll(CITED)) {
    const cited = m[1]
    if (/^https?:/.test(cited)) continue
    // `day-1..5.json` and friends are shorthand for a range, not a path.
    if (/\w\.\.\w/.test(cited)) continue
    // A citation is only checkable when it claims a location *in this repo*. Three
    // kinds never will be, and treating them as defects trains people to ignore the
    // gate — which is the one failure a gate cannot survive:
    //   - files in another project we read as prior art (NeverEndingQuest's schemas)
    //   - build outputs that exist only after a run (`out/`, generated sources)
    //   - machine-local files deliberately absent from the repo (`.claude/local-paths.md`)
    //   - filename templates with a placeholder (`build-gdd-vN_draft.md`)
    // Each pattern is listed with its reason so this stays a decision, not a silence.
    if (EXTERNAL.some((rx) => rx.test(cited))) continue

    const candidates = [
      resolve(dirname(p), cited),
      resolve(ROOT, cited),
      resolve(ROOT, '..', cited),
      resolve(ROOT, '..', '..', cited), // repo root: docs cite `commands/gdd-sync.md`
    ]
    let hit = candidates.find(existsSync)
    // A doc may cite a path relative to a subtree it does not sit in — e.g. the
    // resolver's own `data/screen-specs.json`. Fall back to suffix matching against
    // the real file index before calling it missing.
    if (!hit) {
      const tail = '/' + cited.replace(/^\.\//, '')
      const suffix = allPaths.find((f) => f.endsWith(tail))
      if (suffix) hit = join(ROOT, suffix)
    }
    if (!hit) bad(here, `cites \`${cited}\` — no such file`)
    else if (hit.endsWith('.md') && inbound.has(hit)) inbound.set(hit, inbound.get(hit) + 1)
  }
}

// --- orphans: a note nothing points at ---------------------------------------
// Scoped to knowledge-base, whose whole contract is that _index.md registers every
// note. Elsewhere an unreferenced file is often a legitimate entry point.
const orphans = [...inbound]
  .filter(([p, n]) => n === 0 && rel(p).startsWith('knowledge-base/') && basename(p) !== '_index.md')
  .map(([p]) => rel(p))
  .sort()

console.log(`${files.length} markdown files · ${notes.size} note names · ${orphans.length} unreferenced knowledge-base notes`)

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`)
  for (const w of warnings) console.log(`  ${w}`)
}

if (orphans.length) {
  const byFolder = orphans.reduce((m, o) => {
    const f = o.split('/').slice(0, 2).join('/')
    return m.set(f, (m.get(f) ?? 0) + 1)
  }, new Map())
  console.log(`\nunreferenced knowledge-base notes, by folder:`)
  for (const [f, n] of [...byFolder].sort((a, b) => b[1] - a[1]))
    console.log(`  ${String(n).padStart(4)}  ${f}`)
  console.log(
    '  Most notes are ingested in bulk and counted in _index.md rather than linked one by one,',
  )
  console.log('  so this is a trend report. A jump in one folder is the signal, not the total.')
  if (FAIL_ON_ORPHANS) {
    console.log('\n  --orphans: enforcing')
    for (const o of orphans) bad(o, 'no inbound reference — nothing can reach it')
  }
}

if (defects.length) {
  console.error(`\n${defects.length} defect(s):`)
  for (const d of defects) console.error(`  ${d}`)
  process.exit(1)
}
console.log('\nclean')
