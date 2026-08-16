// Paths and the tuning constants the loop runs on.
//
// Every path resolves inside this folder, so the harness runs standalone. The card
// fields in cards/ and the ceilings in src/ceilings.js are copies of live project
// files — each one names its source in its own header.

import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

export const PIPELINE_ROOT = join(HERE, '..')

export const PATHS = {
  cards: join(PIPELINE_ROOT, 'cards'),
  slots: join(PIPELINE_ROOT, 'slots'),
  fixtures: join(PIPELINE_ROOT, 'fixtures'),
  runs: join(PIPELINE_ROOT, 'runs'),
}

// The circuit breaker's tuning. Two revisions is the pipeline's own cap
// (narrative-pipeline/agents/orchestrator.md: "prose flag → back to the Content
// Agent, ≤2 revisions, model fallback allowed"), not a number invented here.
export const MAX_REVISIONS = 2

// Model fallback: the breaker escalates rather than repeating an identical call,
// because a second identical call is the definition of a wasted retry.
export const MODELS = {
  generate: 'claude-sonnet-5',
  generateFallback: 'claude-opus-5',
  evaluate: 'claude-sonnet-5',
}

// The one guardrail this pipeline's evaluator enforces by judgment. Named here so
// the README, the declaration and the code cannot drift from each other.
export const ENFORCED_CHECK = {
  id: 6,
  name: 'Voice register',
  rule:
    "A soul's warmth must arrive by that soul's declared warmth_channel, and its " +
    'precision must run on its declared precision_profile — matching this soul’s ' +
    'card and no other’s. Warmth must be intact: flat is not cold.',
}
