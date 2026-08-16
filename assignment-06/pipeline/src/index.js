#!/usr/bin/env node
// THE LOOP — generate → evaluate → refine → break.
//
//   node src/index.js                     one slot, live
//   node src/index.js --offline           replay the recorded run, no API key
//   node src/index.js --slot all          every slot in slots/demo.json
//   node src/index.js --slot <slot_id>    one named slot
//
// The stage this runs: step 6 of the storyline authoring process (Lines), which is
// steps 8 → 10 → 11 → 13 of narrative-pipeline/pipeline.md. It runs after the Choice
// Designer's graphs clear Roc's gate, so it never writes prose against a shape that
// might still be rejected.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PATHS, MAX_REVISIONS, ENFORCED_CHECK } from './config.js'
import { loadCard } from './card.js'
import { generate } from './generate.js'
import { evaluate, VERDICT } from './evaluate.js'
import { preflight, decide, modelFor, TRIP } from './breaker.js'
import { createLog, colors as c } from './log.js'
import { OFFLINE } from './llm.js'

const argOf = (name, fallback) => {
  const i = process.argv.indexOf(name)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

/**
 * One slot through the whole loop.
 * Returns { slot_id, outcome: 'shipped' | 'stopped', line, attempts, trip }.
 */
async function runSlot(slot, log) {
  const card = loadCard(slot.npc_id)
  log.slot(slot.slot_id, slot.npc_id)

  const attempts = []

  for (let revision = 0; ; revision++) {
    // ---- GENERATE -----------------------------------------------------------
    const model = modelFor(revision)
    const prev = attempts.at(-1)
    log.step(
      revision === 0 ? 'GENERATE' : 'REFINE',
      revision === 0
        ? `${slot.slot_type}, ceiling ${slot.max_words} ${c.dim(`· ${model}`)}`
        : `attempt ${revision + 1} of ${MAX_REVISIONS + 1} ${c.dim(`· ${model}`)}`,
    )

    const { text } = await generate(slot, card, {
      revision,
      model,
      flag: prev ? { reason: prev.result.reason, previous: prev.line } : null,
    })
    log.line(text)

    // ---- EVALUATE -----------------------------------------------------------
    const result = await evaluate(slot, text, card)
    attempts.push({ revision, line: text, model, result })

    const where = result.layer === 'mechanical' ? 'ceilings' : `check ${ENFORCED_CHECK.id}`
    if (result.verdict === VERDICT.PASS) {
      log.step('EVALUATE', `${c.green('PASS')} ${c.dim(`(${where}, ${result.words} words)`)}`)
    } else {
      log.step('EVALUATE', `${c.red(result.verdict)} ${c.dim(`(${where})`)} — ${result.reason}`)
      if (result.rival_match)
        log.step('EVALUATE', c.dim(`warmth read as: ${result.channel_observed} → ${result.rival_match}'s channel`))
    }

    // ---- BREAK --------------------------------------------------------------
    const call = decide(result, revision)

    if (call.action === 'ship') {
      log.step('SHIP', c.green('accepted'))
      return { slot_id: slot.slot_id, outcome: 'shipped', line: text, attempts, trip: null }
    }

    if (call.action === 'stop') {
      log.step('BREAKER', `${c.red(call.trip)} — ${call.reason}`)
      return { slot_id: slot.slot_id, outcome: 'stopped', line: null, attempts, trip: call.trip }
    }
    // else: refine, loop again
  }
}

async function main() {
  const runId = `run-${argOf('--id', String(Date.now()))}`
  const log = createLog(runId)

  console.log(c.bold('\nGER pipeline — NPC dialogue slots'))
  console.log(
    c.dim(
      `Evaluator: word ceilings (deterministic, same numbers as tools/line-lint.mjs) + guardrails check ${ENFORCED_CHECK.id}, ${ENFORCED_CHECK.name}` +
        `\nBreaker:   ${MAX_REVISIONS} revisions, structural exit, model fallback, pre-flight card-lint` +
        `\nMode:      ${OFFLINE ? 'offline (replaying fixtures)' : 'live'}`,
    ),
  )

  // ---- PRE-FLIGHT: the breaker's cheapest trip ------------------------------
  const pre = preflight()
  if (!pre.ok) {
    console.log(`\n  ${c.red('BREAKER')}   ${pre.reason}`)
    console.log(c.dim(pre.detail.split('\n').slice(0, 6).join('\n')))
    process.exit(1)
  }
  console.log(c.dim(`\n  card-lint clean (${pre.detail}) — dispatch permitted`))

  const all = JSON.parse(readFileSync(join(PATHS.slots, 'demo.json'), 'utf8'))
  const want = argOf('--slot', all[0].slot_id)
  const slots = want === 'all' ? all : all.filter((s) => s.slot_id === want)
  if (!slots.length) {
    console.error(`No slot "${want}". Available: ${all.map((s) => s.slot_id).join(', ')}`)
    process.exit(1)
  }

  const results = []
  for (const slot of slots) results.push(await runSlot(slot, log))

  // ---- SUMMARY --------------------------------------------------------------
  const shipped = results.filter((r) => r.outcome === 'shipped')
  const stopped = results.filter((r) => r.outcome === 'stopped')
  const calls = results.reduce((n, r) => n + r.attempts.length, 0)

  log.blank()
  console.log(c.bold('Summary'))
  console.log(`  ${c.green(`${shipped.length} shipped`)} · ${c.red(`${stopped.length} stopped`)} · ${calls} generation(s)`)
  for (const r of stopped) console.log(`  ${c.dim('parked:')} ${r.slot_id} ${c.dim(`(${r.trip})`)}`)

  const path = log.save({
    shipped: shipped.length,
    stopped: stopped.length,
    generations: calls,
    results: results.map(({ slot_id, outcome, line, trip, attempts }) => ({
      slot_id,
      outcome,
      line,
      trip,
      attempts: attempts.map((a) => ({ revision: a.revision, model: a.model, line: a.line, ...a.result })),
    })),
  })
  console.log(c.dim(`\n  run log: ${path}\n`))

  // A parked slot is not a crash, but it is not a success either.
  process.exit(stopped.length ? 2 : 0)
}

main().catch((e) => {
  console.error(`\n${c.red('error')} ${e.message}\n`)
  process.exit(1)
})
