// Pinned-context hygiene gate — the circuit breaker's pre-flight check.
//
// SOURCE OF TRUTH: ProjectOS/game-project/tools/card-lint.mjs. This is the same two rules
// over the cards this folder ships, so the pre-flight trip works standalone. The live tool
// runs over cast/*.md as a CLI; this runs in-process over cards/*.json.
//
// Why it gates at all: only `essence_descriptor` and `voice_register` are pinned into a
// generation call, which makes those two fields the ambient prose style for every line the
// soul will ever speak. A dirty card does not spoil one line, it spoils the batch. So the
// cheapest possible failure is to refuse to dispatch before a single token is spent.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PATHS } from './config.js'

// Pinned fields and what each may spend, per narrative-pipeline/templates/persona-card-schema.md.
// voice_register was raised 300 -> 400 on 2026-08-08 (Roc) after Mara, the most demanding card,
// carried seven distinct behaviours at 377.
const PINNED = {
  essence_descriptor: { words: 75 },
  voice_register: { words: 400 },
}

// A generator conditioned on a checker's vocabulary writes to avoid flags instead of writing
// to sound like a person. These words belong in voice_enforcement, which the generator never sees.
const VERDICT = /\b(defects?|barred|flags?|flagged|violations?|check(?:s|ed|able)?)\b/gi

// Strip markdown furniture so counts reflect prose, not syntax. The would-never/would-say
// table inside voice_register is not counted — exemplar pairs are free (Roc, 2026-08-08).
const prose = (s) =>
  s
    .replace(/`[^`]*`/g, ' ')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_>#]/g, ' ')

/** Returns { ok: true, checked } or { ok: false, defects }. Never throws on a defect. */
export function cardLint() {
  const files = readdirSync(PATHS.cards).filter((f) => f.endsWith('.json')).sort()
  if (!files.length) return { ok: false, defects: [`no cards found in ${PATHS.cards}`] }

  const defects = []

  for (const file of files) {
    const card = JSON.parse(readFileSync(join(PATHS.cards, file), 'utf8'))
    const soul = card.npc_id ?? file.replace(/\.json$/, '')

    for (const [field, { words: budget }] of Object.entries(PINNED)) {
      const raw = card.pinned?.[field]
      if (raw == null) {
        defects.push(`${soul} · ${field}: pinned field missing — every card must carry it`)
        continue
      }

      const text = prose(raw)

      const verdicts = [...new Set((text.match(VERDICT) ?? []).map((w) => w.toLowerCase()))]
      if (verdicts.length)
        defects.push(`${soul} · ${field}: verdict vocabulary (${verdicts.join(', ')}) — move to voice_enforcement`)

      const words = text.split(/\s+/).filter(Boolean).length
      if (words > budget) defects.push(`${soul} · ${field}: ${words} words, budget ${budget}`)
    }
  }

  return defects.length ? { ok: false, defects } : { ok: true, checked: files.length }
}
