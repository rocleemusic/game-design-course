// Run log — the artifact the human gate reads.
//
// Every attempt, every verdict, every trip. This is the "did the pipeline catch
// something you would have missed" evidence, and it is worth more than the lines:
// a pipeline that cannot say what it rejected and why has not shown its work.

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { PATHS } from './config.js'

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
}

export function createLog(runId) {
  const entries = []

  const api = {
    step(stage, msg) {
      entries.push({ stage, msg })
      const tag = { GENERATE: c.cyan, EVALUATE: c.yellow, REFINE: c.yellow, BREAKER: c.red, SHIP: c.green }
      const paint = tag[stage] ?? c.dim
      console.log(`  ${paint(stage.padEnd(9))} ${msg}`)
    },

    line(text) {
      entries.push({ stage: 'LINE', msg: text })
      console.log(`  ${c.dim('│')} ${text}`)
    },

    slot(slotId, npcId) {
      entries.push({ stage: 'SLOT', msg: `${slotId} (${npcId})` })
      console.log(`\n${c.bold(slotId)} ${c.dim(`· ${npcId}`)}`)
    },

    blank() {
      console.log('')
    },

    /** Write the machine-readable trail. The pipeline's own runs live under pipeline-runs/. */
    save(summary) {
      mkdirSync(PATHS.runs, { recursive: true })
      const path = join(PATHS.runs, `${runId}.json`)
      writeFileSync(path, JSON.stringify({ runId, summary, entries }, null, 2))
      return path
    },
  }

  return api
}

export const colors = c
